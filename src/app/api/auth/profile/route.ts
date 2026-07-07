import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { id: payload.userId },
      include: {
        siswa: {
          include: {
            kelas: true
          }
        },
        guru: {
          include: {
            kelasWali: true
          }
        }
      }
    });

    if (!pengguna || !pengguna.aktif) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan atau tidak aktif." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pengguna: {
        id: pengguna.id,
        nama: pengguna.nama,
        email: pengguna.email,
        peran: pengguna.peran,
        isPasswordSementara: pengguna.isPasswordSementara,
        siswa: pengguna.siswa ? {
          nisn: pengguna.siswa.nisn,
          idKelas: pengguna.siswa.idKelas,
          namaKelas: pengguna.siswa.kelas.nama,
          teleponOrangTua: pengguna.siswa.teleponOrangTua,
          sedangMagang: pengguna.siswa.sedangMagang
        } : null,
        guru: pengguna.guru ? {
          id: pengguna.guru.id,
          nip: pengguna.guru.nip,
          telepon: pengguna.guru.telepon,
          isBk: pengguna.guru.isBk,
          isPiket: (await prisma.jadwalPiket.count({ where: { idGuru: pengguna.guru.id } })) > 0,
          idKelasWali: pengguna.guru.kelasWali?.id || null,
          namaKelasWali: pengguna.guru.kelasWali?.nama || null
        } : null
      }
    });
  } catch (error: any) {
    console.error("Kesalahan profile API:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
