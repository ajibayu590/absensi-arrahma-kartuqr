import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

// Helper function to escape strings for SQL
function escapeSql(str: string | null): string {
  if (str === null) return "NULL";
  return str.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function formatVal(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return val.toString();
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  return `'${escapeSql(val.toString())}'`;
}

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan untuk membuat cadangan database." },
        { status: 403 }
      );
    }

    let sqlDump = `-- Sistem Absensi SMK AR-RAHMA MANDIRI INDONESIA\n`;
    sqlDump += `-- Database Backup Dump\n`;
    sqlDump += `-- Generated on: ${new Date().toISOString()}\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // 1. Table Pengguna
    const pengguna = await prisma.pengguna.findMany();
    sqlDump += `-- Dumping data for table Pengguna\n`;
    for (const row of pengguna) {
      sqlDump += `INSERT INTO Pengguna (id, nama, email, kataSandi, peran, isPasswordSementara, aktif, sidikJariBrowser, absenDiblokirHingga, dibuatPada, diubahPada) VALUES (${row.id}, ${formatVal(row.nama)}, ${formatVal(row.email)}, ${formatVal(row.kataSandi)}, ${formatVal(row.peran)}, ${formatVal(row.isPasswordSementara)}, ${formatVal(row.aktif)}, ${formatVal(row.sidikJariBrowser)}, ${formatVal(row.absenDiblokirHingga)}, ${formatVal(row.dibuatPada)}, ${formatVal(row.diubahPada)});\n`;
    }
    sqlDump += `\n`;

    // 2. Table Guru
    const guru = await prisma.guru.findMany();
    sqlDump += `-- Dumping data for table Guru\n`;
    for (const row of guru) {
      sqlDump += `INSERT INTO Guru (id, nip, telepon, idPengguna, dibuatPada, diubahPada) VALUES (${row.id}, ${formatVal(row.nip)}, ${formatVal(row.telepon)}, ${row.idPengguna}, ${formatVal(row.dibuatPada)}, ${formatVal(row.diubahPada)});\n`;
    }
    sqlDump += `\n`;

    // 3. Table Kelas
    const kelas = await prisma.kelas.findMany();
    sqlDump += `-- Dumping data for table Kelas\n`;
    for (const row of kelas) {
      sqlDump += `INSERT INTO Kelas (id, nama, tahunAjaran, idGuru, dibuatPada, diubahPada) VALUES (${row.id}, ${formatVal(row.nama)}, ${formatVal(row.tahunAjaran)}, ${row.idGuru ? row.idGuru : "NULL"}, ${formatVal(row.dibuatPada)}, ${formatVal(row.diubahPada)});\n`;
    }
    sqlDump += `\n`;

    // 4. Table Siswa
    const siswa = await prisma.siswa.findMany();
    sqlDump += `-- Dumping data for table Siswa\n`;
    for (const row of siswa) {
      sqlDump += `INSERT INTO Siswa (id, nisn, nama, idKelas, teleponOrangTua, sedangMagang, tanggalMulaiMagang, tanggalSelesaiMagang, idPengguna, dibuatPada, diubahPada) VALUES (${row.id}, ${formatVal(row.nisn)}, ${formatVal(row.nama)}, ${row.idKelas}, ${formatVal(row.teleponOrangTua)}, ${formatVal(row.sedangMagang)}, ${formatVal(row.tanggalMulaiMagang)}, ${formatVal(row.tanggalSelesaiMagang)}, ${row.idPengguna}, ${formatVal(row.dibuatPada)}, ${formatVal(row.diubahPada)});\n`;
    }
    sqlDump += `\n`;

    // 5. Table Kehadiran
    const kehadiran = await prisma.kehadiran.findMany();
    sqlDump += `-- Dumping data for table Kehadiran\n`;
    for (const row of kehadiran) {
      sqlDump += `INSERT INTO Kehadiran (id, idSiswa, tanggal, status, waktuMasuk, latitude, longitude, dicatatOleh, catatan, dibuatPada, diubahPada) VALUES (${row.id}, ${row.idSiswa}, ${formatVal(row.tanggal)}, ${formatVal(row.status)}, ${formatVal(row.waktuMasuk)}, ${row.latitude ? row.latitude : "NULL"}, ${row.longitude ? row.longitude : "NULL"}, ${row.dicatatOleh ? row.dicatatOleh : "NULL"}, ${formatVal(row.catatan)}, ${formatVal(row.dibuatPada)}, ${formatVal(row.diubahPada)});\n`;
    }
    sqlDump += `\n`;

    // 6. Table LogWa
    const logWa = await prisma.logWa.findMany();
    sqlDump += `-- Dumping data for table LogWa\n`;
    for (const row of logWa) {
      sqlDump += `INSERT INTO LogWa (id, idSiswa, telepon, pesan, status, error, sentAt) VALUES (${row.id}, ${row.idSiswa}, ${formatVal(row.telepon)}, ${formatVal(row.pesan)}, ${formatVal(row.status)}, ${formatVal(row.error)}, ${formatVal(row.sentAt)});\n`;
    }
    sqlDump += `\n`;

    // 7. Table HariLibur
    const hariLibur = await prisma.hariLibur.findMany();
    sqlDump += `-- Dumping data for table HariLibur\n`;
    for (const row of hariLibur) {
      sqlDump += `INSERT INTO HariLibur (id, tanggal, nama, isKustom, dibuatPada, diubahPada) VALUES (${row.id}, ${formatVal(row.tanggal)}, ${formatVal(row.nama)}, ${formatVal(row.isKustom)}, ${formatVal(row.dibuatPada)}, ${formatVal(row.diubahPada)});\n`;
    }
    sqlDump += `\n`;

    // 8. Table Pengaturan
    const pengaturan = await prisma.pengaturan.findMany();
    sqlDump += `-- Dumping data for table Pengaturan\n`;
    for (const row of pengaturan) {
      sqlDump += `INSERT INTO Pengaturan (id, kunci, nilai, dibuatPada, diubahPada) VALUES (${row.id}, ${formatVal(row.kunci)}, ${formatVal(row.nilai)}, ${formatVal(row.dibuatPada)}, ${formatVal(row.diubahPada)});\n`;
    }
    sqlDump += `\n`;

    // 9. Table LogAuditAdmin
    const logAudit = await prisma.logAuditAdmin.findMany();
    sqlDump += `-- Dumping data for table LogAuditAdmin\n`;
    for (const row of logAudit) {
      sqlDump += `INSERT INTO LogAuditAdmin (id, idPengguna, tindakan, target, detail, createdAt) VALUES (${row.id}, ${row.idPengguna}, ${formatVal(row.tindakan)}, ${formatVal(row.target)}, ${formatVal(row.detail)}, ${formatVal(row.createdAt)});\n`;
    }
    sqlDump += `\n`;

    // 10. Table LogKonselingBk
    const logKonseling = await prisma.logKonselingBk.findMany();
    sqlDump += `-- Dumping data for table LogKonselingBk\n`;
    for (const row of logKonseling) {
      sqlDump += `INSERT INTO LogKonselingBk (id, idSiswa, idBk, detail, dibuatPada, diubahPada) VALUES (${row.id}, ${row.idSiswa}, ${row.idBk}, ${formatVal(row.detail)}, ${formatVal(row.dibuatPada)}, ${formatVal(row.diubahPada)});\n`;
    }
    sqlDump += `\n`;

    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    // Log audit admin untuk pencadangan database
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: "DATABASE_BACKUP",
        target: "FULL_DATABASE",
        detail: JSON.stringify({
          status: "SUCCESS",
          timestamp: new Date().toISOString()
        })
      }
    });

    // Kembalikan response sebagai file download berkas sql
    const response = new NextResponse(sqlDump, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="absensi_smk_ar_rahma_mandiri_indonesia_backup_${Date.now()}.sql"`,
      },
    });

    return response;
  } catch (error: any) {
    console.error("Kesalahan API backup GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
