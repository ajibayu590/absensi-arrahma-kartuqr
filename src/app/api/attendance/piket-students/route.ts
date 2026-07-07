import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || (payload.peran !== "GURU" && payload.peran !== "ADMIN")) {
      return NextResponse.json(
        { error: "Akses ditolak. Peran Anda tidak memiliki izin untuk melihat daftar siswa." },
        { status: 403 }
      );
    }

    // Ambil daftar siswa aktif beserta nama kelasnya
    const daftarSiswa = await prisma.siswa.findMany({
      where: {
        pengguna: {
          aktif: true
        }
      },
      select: {
        id: true,
        nisn: true,
        nama: true,
        idKelas: true,
        kelas: {
          select: {
            nama: true
          }
        }
      },
      orderBy: {
        nama: "asc"
      }
    });

    // Format output agar ramah parsing di client-side
    const siswaFormatted = daftarSiswa.map(s => ({
      id: s.id,
      nisn: s.nisn,
      nama: s.nama,
      idKelas: s.idKelas,
      namaKelas: s.kelas.nama
    }));

    return NextResponse.json({
      success: true,
      siswa: siswaFormatted
    });
  } catch (error: any) {
    console.error("Kesalahan piket-students API:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
