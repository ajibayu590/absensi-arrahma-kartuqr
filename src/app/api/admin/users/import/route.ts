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

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (rawData.length < 2) {
      return NextResponse.json({ error: "File XLSX kosong atau tidak memiliki baris data." }, { status: 400 });
    }

    const headers = rawData[0].map(h => String(h).trim().toLowerCase());
    const idxNama = headers.indexOf("nama guru");
    const idxEmail = headers.indexOf("email");
    const idxNip = headers.indexOf("nip");
    const idxTelepon = headers.indexOf("telepon");
    const idxPeran = headers.indexOf("peran");
    const idxBk = headers.indexOf("apakah staf bk (ya/tidak)");

    if (idxNama === -1 || idxEmail === -1) {
      return NextResponse.json(
        { error: "Format file tidak valid. Pastikan terdapat kolom 'Nama Guru' dan 'Email'." },
        { status: 400 }
      );
    }

    let success = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];
    const total = rawData.length - 1;
    const importedUsers: { nama: string; email: string }[] = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) {
        failed++;
        errors.push({ row: i + 1, message: "Baris kosong." });
        continue;
      }

      const nama = String(row[idxNama] || "").trim();
      const email = String(row[idxEmail] || "").trim();
      const nip = idxNip !== -1 ? String(row[idxNip] || "").trim() : "";
      const telepon = idxTelepon !== -1 ? String(row[idxTelepon] || "").trim() : "";
      const peranStr = idxPeran !== -1 ? String(row[idxPeran] || "").trim().toUpperCase() : "GURU";
      const bkStr = idxBk !== -1 ? String(row[idxBk] || "").trim().toLowerCase() : "";

      if (!nama || !email) {
        failed++;
        errors.push({ row: i + 1, message: "Nama Guru dan Email wajib diisi." });
        continue;
      }

      const validPeran = ["ADMIN", "KEPALA_SEKOLAH", "GURU"];
      const peran = validPeran.includes(peranStr) ? peranStr as "ADMIN" | "KEPALA_SEKOLAH" | "GURU" : "GURU";

      const existEmail = await prisma.pengguna.findUnique({ where: { email } });
      if (existEmail) {
        failed++;
        errors.push({ row: i + 1, message: `Email ${email} sudah terdaftar di sistem.` });
        continue;
      }

      if (nip && peran === "GURU") {
        const existNip = await prisma.guru.findUnique({ where: { nip } });
        if (existNip) {
          failed++;
          errors.push({ row: i + 1, message: `NIP ${nip} sudah terdaftar di sistem.` });
          continue;
        }
      }

      const isBk = bkStr === "ya" || bkStr === "yes" || bkStr === "true";
      const defaultPassword = nip || email.split("@")[0];

      try {
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await prisma.$transaction(async (tx) => {
          const user = await tx.pengguna.create({
            data: {
              nama,
              email,
              kataSandi: hashedPassword,
              peran,
              isPasswordSementara: true,
              aktif: true
            }
          });

          if (peran === "GURU") {
            await tx.guru.create({
              data: {
                idPengguna: user.id,
                nip: nip || null,
                telepon: telepon || null,
                isBk
              }
            });
          }
        });

        success++;
        importedUsers.push({ nama, email });
      } catch (err: any) {
        failed++;
        errors.push({ row: i + 1, message: err.message || "Gagal menyimpan ke database." });
      }
    }

    if (success > 0) {
      await prisma.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "IMPORT_GURU",
          target: "PENGGUNA",
          detail: JSON.stringify({
            successCount: success,
            failedCount: failed,
            users: importedUsers
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
    console.error("Kesalahan API users import POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
