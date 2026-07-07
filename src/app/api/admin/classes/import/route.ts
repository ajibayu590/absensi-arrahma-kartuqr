import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan melakukan import." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File XLSX tidak ditemukan." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse XLSX
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON array of arrays or objects
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (rawData.length < 2) {
      return NextResponse.json({ error: "File XLSX kosong atau tidak memiliki baris data." }, { status: 400 });
    }

    // Headers validation
    const headers = rawData[0].map(h => String(h).trim().toLowerCase());
    const idxNama = headers.indexOf("nama kelas");
    const idxTahun = headers.indexOf("tahun ajaran");
    const idxNip = headers.indexOf("nip wali kelas");

    if (idxNama === -1 || idxTahun === -1) {
      return NextResponse.json(
        { error: "Format file tidak valid. Pastikan terdapat kolom 'Nama Kelas' dan 'Tahun Ajaran'." },
        { status: 400 }
      );
    }

    let success = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];
    const total = rawData.length - 1;

    // List to trace updates
    const importedClasses: string[] = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) {
        failed++;
        errors.push({ row: i + 1, message: "Baris kosong." });
        continue;
      }

      const namaKelas = String(row[idxNama] || "").trim();
      const tahunAjaran = String(row[idxTahun] || "").trim();
      const nipWali = idxNip !== -1 ? String(row[idxNip] || "").trim() : "";

      if (!namaKelas || !tahunAjaran) {
        failed++;
        errors.push({ row: i + 1, message: "Nama Kelas dan Tahun Ajaran wajib diisi." });
        continue;
      }

      try {
        let idGuru: number | null = null;

        if (nipWali) {
          const guru = await prisma.guru.findUnique({
            where: { nip: nipWali }
          });
          if (guru) {
            idGuru = guru.id;
          } else {
            errors.push({ row: i + 1, message: `Wali kelas dengan NIP ${nipWali} tidak ditemukan. Kelas diimpor tanpa wali kelas.` });
          }
        }

        // Upsert kelas
        await prisma.kelas.upsert({
          where: { nama: namaKelas },
          update: {
            tahunAjaran,
            idGuru
          },
          create: {
            nama: namaKelas,
            tahunAjaran,
            idGuru
          }
        });

        success++;
        importedClasses.push(namaKelas);
      } catch (err: any) {
        failed++;
        errors.push({ row: i + 1, message: err.message || "Gagal menyimpan ke database." });
      }
    }

    // Audit Log
    if (success > 0) {
      await prisma.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "IMPORT_KELAS",
          target: "KELAS",
          detail: JSON.stringify({
            successCount: success,
            failedCount: failed,
            classes: importedClasses
          })
        }
      });
    }

    return NextResponse.json({
      total,
      success,
      failed,
      errors
    });
  } catch (error: any) {
    console.error("Kesalahan API classes import POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
