import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    const { kataSandiLama, kataSandiBaru } = await req.json();

    if (!kataSandiLama || !kataSandiBaru) {
      return NextResponse.json(
        { error: "Kata sandi lama dan kata sandi baru wajib diisi." },
        { status: 400 }
      );
    }

    if (kataSandiBaru.length < 8) {
      return NextResponse.json(
        { error: "Kata sandi baru minimal harus 8 karakter." },
        { status: 400 }
      );
    }

    const pengguna = await prisma.pengguna.findUnique({
      where: { id: payload.userId }
    });

    if (!pengguna) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    // Verifikasi kata sandi lama
    const sandiCocok = await bcrypt.compare(kataSandiLama, pengguna.kataSandi);
    if (!sandiCocok) {
      return NextResponse.json(
        { error: "Kata sandi lama salah." },
        { status: 401 }
      );
    }

    // Hash kata sandi baru
    const hashedSandi = await bcrypt.hash(kataSandiBaru, 10);

    // Update di database & ubah status isPasswordSementara ke false
    await prisma.pengguna.update({
      where: { id: pengguna.id },
      data: {
        kataSandi: hashedSandi,
        isPasswordSementara: false
      }
    });

    return NextResponse.json({
      success: true,
      message: "Kata sandi berhasil diperbarui."
    });
  } catch (error: any) {
    console.error("Kesalahan change-password API:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
