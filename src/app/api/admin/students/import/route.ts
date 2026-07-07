import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import * as XLSX from "xlsx";
import bcrypt from "bcrypt";

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
    
    // Convert to JSON array of arrays
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (rawData.length < 2) {
      return NextResponse.json({ error: "File XLSX kosong atau tidak memiliki baris data." }, { status: 400 });
    }

    // Headers validation
    const headers = rawData[0].map(h => String(h).trim().toLowerCase());
    const idxNisn = headers.indexOf("nisn");
    const idxNama = headers.indexOf("nama siswa");
    const idxKelas = headers.indexOf("nama kelas");
    const idxTelepon = headers.indexOf("telepon orang tua");
    const idxMagang = headers.indexOf("sedang magang (ya/tidak)");

    if (idxNisn === -1 || idxNama === -1 || idxKelas === -1 || idxTelepon === -1) {
      return NextResponse.json(
        { error: "Format file tidak valid. Pastikan terdapat kolom 'NISN', 'Nama Siswa', 'Nama Kelas', dan 'Telepon Orang Tua'." },
        { status: 400 }
      );
    }

    let success = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];
    const total = rawData.length - 1;

    // Cache to trace classes to avoid repeating database queries
    const classCache = new Map<string, number>();
    const classes = await prisma.kelas.findMany({ select: { id: true, nama: true } });
    classes.forEach(c => classCache.set(c.nama.trim().toLowerCase(), c.id));

    const importedStudents: { nisn: string; nama: string }[] = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) {
        failed++;
        errors.push({ row: i + 1, message: "Baris kosong." });
        continue;
      }

      const nisn = String(row[idxNisn] || "").trim();
      const nama = String(row[idxNama] || "").trim();
      const namaKelas = String(row[idxKelas] || "").trim();
      const telepon = String(row[idxTelepon] || "").trim();
      const magangStr = idxMagang !== -1 ? String(row[idxMagang] || "").trim().toLowerCase() : "";

      if (!nisn || !nama || !namaKelas || !telepon) {
        failed++;
        errors.push({ row: i + 1, message: "NISN, Nama Siswa, Nama Kelas, dan Telepon Orang Tua wajib diisi." });
        continue;
      }

      // NISN format validation (must be numeric digits, usually 10)
      if (!/^\d+$/.test(nisn)) {
        failed++;
        errors.push({ row: i + 1, message: `NISN harus berupa angka digit saja (Menemukan: ${nisn}).` });
        continue;
      }

      const idKelas = classCache.get(namaKelas.toLowerCase());
      if (!idKelas) {
        failed++;
        errors.push({ row: i + 1, message: `Kelas '${namaKelas}' tidak terdaftar di sistem. Silakan buat kelas tersebut terlebih dahulu.` });
        continue;
      }

      // Check unique NISN
      const existSiswa = await prisma.siswa.findUnique({ where: { nisn } });
      if (existSiswa) {
        failed++;
        errors.push({ row: i + 1, message: `Siswa dengan NISN ${nisn} sudah terdaftar.` });
        continue;
      }

      // Check unique email
      const email = `${nisn}@arrahma.sch.id`;
      const existEmail = await prisma.pengguna.findUnique({ where: { email } });
      if (existEmail) {
        failed++;
        errors.push({ row: i + 1, message: `Email ${email} sudah digunakan oleh pengguna lain.` });
        continue;
      }

      // Parse magang
      const sedangMagang = magangStr === "ya" || magangStr === "yes" || magangStr === "true";

      try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(nisn, saltRounds);

        // Transaction database to create Pengguna & Siswa safely
        await prisma.$transaction(async (tx) => {
          // 1. Create Pengguna
          const user = await tx.pengguna.create({
            data: {
              nama,
              email,
              kataSandi: hashedPassword,
              peran: "SISWA",
              isPasswordSementara: true,
              aktif: true
            }
          });

          // 2. Create Siswa
          await tx.siswa.create({
            data: {
              nisn,
              nama,
              idKelas,
              teleponOrangTua: telepon,
              sedangMagang,
              idPengguna: user.id
            }
          });
        });

        success++;
        importedStudents.push({ nisn, nama });
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
          tindakan: "IMPORT_SISWA",
          target: "SISWA",
          detail: JSON.stringify({
            successCount: success,
            failedCount: failed,
            students: importedStudents
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
    console.error("Kesalahan API students import POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
