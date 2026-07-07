import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
    }

    let isAuthorized = payload.peran === "ADMIN";
    if (!isAuthorized && payload.peran === "GURU") {
      const guru = await prisma.guru.findUnique({
        where: { idPengguna: payload.userId }
      });
      if (guru?.isBk) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Guru BK atau Admin yang dapat menambahkan log konseling." },
        { status: 403 }
      );
    }

    const { idSiswa, detail } = await req.json();

    if (!idSiswa || !detail || !detail.trim()) {
      return NextResponse.json(
        { error: "Parameter idSiswa dan detail log konseling wajib diisi." },
        { status: 400 }
      );
    }

    const siswaIdParsed = parseInt(idSiswa, 10);
    if (isNaN(siswaIdParsed)) {
      return NextResponse.json({ error: "idSiswa tidak valid." }, { status: 400 });
    }

    // Periksa apakah siswa ada
    const siswa = await prisma.siswa.findUnique({
      where: { id: siswaIdParsed }
    });

    if (!siswa) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    // Simpan log konseling
    const log = await prisma.logKonselingBk.create({
      data: {
        idSiswa: siswaIdParsed,
        idBk: payload.userId,
        detail: detail.trim()
      },
      include: {
        guruBk: {
          select: {
            nama: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Log konseling BK berhasil disimpan.",
      log
    });
  } catch (error: any) {
    console.error("Kesalahan API konseling POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
