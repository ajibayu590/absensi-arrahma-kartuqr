import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import bcrypt from "bcrypt";

// Helper function to format WA phone number to E.164 format
function cleanWaPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, ""); // Remove non-digits
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
}

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan mengelola data siswa." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const kelasIdParam = searchParams.get("kelasId");
    const downloadParam = searchParams.get("download");

    const filter: any = {};
    if (kelasIdParam) {
      const idParsed = parseInt(kelasIdParam, 10);
      if (!isNaN(idParsed)) {
        filter.idKelas = idParsed;
      }
    }

    if (downloadParam === "true") {
      filter.pengguna = { isPasswordSementara: true };
    }

    // Ambil siswa aktif beserta detail kelasnya
    const siswa = await prisma.siswa.findMany({
      where: filter,
      include: {
        kelas: true,
        pengguna: {
          select: {
            email: true,
            aktif: true,
            isPasswordSementara: true
          }
        }
      },
      orderBy: { nama: "asc" }
    });

    // Ambil daftar kelas untuk dropdown filter
    const kelasList = await prisma.kelas.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: "asc" }
    });

    return NextResponse.json({
      success: true,
      siswa: siswa.map(s => ({
        id: s.id,
        nisn: s.nisn,
        nama: s.nama,
        idKelas: s.idKelas,
        namaKelas: s.kelas.nama,
        teleponOrangTua: s.teleponOrangTua,
        sedangMagang: s.sedangMagang,
        email: s.pengguna.email,
        aktif: s.pengguna.aktif,
        isPasswordSementara: s.pengguna.isPasswordSementara
      })),
      kelasList
    });
  } catch (error: any) {
    console.error("Kesalahan API students GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { nisn, nama, idKelas, teleponOrangTua, sedangMagang } = await req.json();

    if (!nisn || !nama || !idKelas || !teleponOrangTua) {
      return NextResponse.json({ error: "Parameter nisn, nama, idKelas, dan teleponOrangTua wajib diisi." }, { status: 400 });
    }

    const parseKelasId = parseInt(idKelas, 10);

    // Cek duplikasi NISN
    const cekSiswa = await prisma.siswa.findUnique({
      where: { nisn }
    });

    if (cekSiswa) {
      return NextResponse.json({ error: "Siswa dengan NISN tersebut sudah terdaftar." }, { status: 400 });
    }

    // Bersihkan nomor WA
    const formattedPhone = cleanWaPhone(teleponOrangTua);

    // Default email siswa: nisn@arrahma.sch.id
    const defaultEmail = `${nisn}@arrahma.sch.id`;

    // Cek duplikasi email
    const cekEmail = await prisma.pengguna.findUnique({
      where: { email: defaultEmail }
    });

    if (cekEmail) {
      return NextResponse.json({ error: "Email akun siswa sudah digunakan." }, { status: 400 });
    }

    // Hash default password (password = nisn)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nisn, saltRounds);

    // Buat Pengguna & Siswa dalam transaksi database
    const siswaBaru = await prisma.$transaction(async (tx) => {
      // 1. Buat Pengguna
      const user = await tx.pengguna.create({
        data: {
          nama,
          email: defaultEmail,
          kataSandi: hashedPassword,
          peran: "SISWA",
          isPasswordSementara: true, // Paksa ganti password pada login pertama
          aktif: true
        }
      });

      // 2. Buat Siswa
      return await tx.siswa.create({
        data: {
          nisn,
          nama,
          idKelas: parseKelasId,
          teleponOrangTua: formattedPhone,
          sedangMagang: sedangMagang || false,
          idPengguna: user.id
        },
        include: {
          kelas: true
        }
      });
    });

    // Log audit admin
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: "CREATE_STUDENT",
        target: `SISWA_${siswaBaru.id}`,
        detail: JSON.stringify({
          nisn: siswaBaru.nisn,
          nama: siswaBaru.nama,
          kelas: siswaBaru.kelas.nama,
          teleponOrangTua: siswaBaru.teleponOrangTua,
          idPengguna: siswaBaru.idPengguna
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: `Siswa ${nama} (NISN: ${nisn}) berhasil didaftarkan.`,
      siswa: {
        id: siswaBaru.id,
        nisn: siswaBaru.nisn,
        nama: siswaBaru.nama,
        email: defaultEmail
      }
    });
  } catch (error: any) {
    console.error("Kesalahan API students POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id, nisn, nama, idKelas, teleponOrangTua, sedangMagang, aktif, resetPassword } = await req.json();

    if (!id || !nisn || !nama || !idKelas || !teleponOrangTua) {
      return NextResponse.json({ error: "Parameter id, nisn, nama, idKelas, dan teleponOrangTua wajib diisi." }, { status: 400 });
    }

    const parseSiswaId = parseInt(id, 10);
    const parseKelasId = parseInt(idKelas, 10);

    // Cek siswa
    const currentSiswa = await prisma.siswa.findUnique({
      where: { id: parseSiswaId }
    });

    if (!currentSiswa) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    // Cek kembaran NISN
    const duplicate = await prisma.siswa.findFirst({
      where: {
        nisn,
        NOT: { id: parseSiswaId }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: "NISN sudah terdaftar pada siswa lain." }, { status: 400 });
    }

    // Bersihkan nomor WA
    const formattedPhone = cleanWaPhone(teleponOrangTua);

    // Hash default password if resetPassword is true
    let hashedPassword: string | undefined;
    if (resetPassword) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(nisn, saltRounds);
    }

    // Update data siswa & akun dalam transaksi database
    const siswaUpdate = await prisma.$transaction(async (tx) => {
      // 1. Update Siswa
      const s = await tx.siswa.update({
        where: { id: parseSiswaId },
        data: {
          nisn,
          nama,
          idKelas: parseKelasId,
          teleponOrangTua: formattedPhone,
          sedangMagang: sedangMagang || false
        },
        include: {
          kelas: true
        }
      });

      // 2. Update status aktif Pengguna jika dikirimkan atau jika password di-reset
      if (aktif !== undefined || resetPassword) {
        await tx.pengguna.update({
          where: { id: s.idPengguna },
          data: {
            nama,
            ...(aktif !== undefined ? { aktif: aktif } : {}),
            ...(resetPassword ? { kataSandi: hashedPassword, isPasswordSementara: true } : {})
          }
        });
      }

      return s;
    });

    // Log audit admin
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: resetPassword ? "RESET_STUDENT_PASSWORD" : "UPDATE_STUDENT",
        target: `SISWA_${parseSiswaId}`,
        detail: JSON.stringify({
          id: siswaUpdate.id,
          nisn: siswaUpdate.nisn,
          nama: siswaUpdate.nama,
          kelas: siswaUpdate.kelas.nama,
          teleponOrangTua: siswaUpdate.teleponOrangTua,
          sedangMagang: siswaUpdate.sedangMagang,
          aktif: aktif,
          passwordReset: resetPassword ? true : undefined
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: resetPassword
        ? `Kata sandi siswa ${nama} berhasil direset ke default (NISN).`
        : `Data siswa ${nama} berhasil diperbarui.`,
      siswa: siswaUpdate
    });
  } catch (error: any) {
    console.error("Kesalahan API students PUT:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID siswa wajib dikirimkan." }, { status: 400 });
    }

    const parseSiswaId = parseInt(id, 10);

    const s = await prisma.siswa.findUnique({
      where: { id: parseSiswaId }
    });

    if (!s) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    // Hapus akun pengguna (cascade delete akan menghapus baris siswa secara otomatis)
    await prisma.pengguna.delete({
      where: { id: s.idPengguna }
    });

    // Log audit admin
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: "DELETE_STUDENT",
        target: `SISWA_${parseSiswaId}`,
        detail: JSON.stringify({ deletedId: parseSiswaId, nama: s.nama, nisn: s.nisn })
      }
    });

    return NextResponse.json({
      success: true,
      message: "Data siswa beserta akun loginnya berhasil dihapus permanen."
    });
  } catch (error: any) {
    console.error("Kesalahan API students DELETE:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
