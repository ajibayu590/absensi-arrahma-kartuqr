import { NextRequest, NextResponse } from "next/server";
import { encryptToken } from "@/lib/token-helper";
import prisma from "@/lib/prisma";
import { TokenPayload } from "@/lib/auth-helper"; // Import auth-helper dan TokenPayload

export async function GET(req: NextRequest) { // Change to NextRequest to get headers
  try {
    const userPayloadHeader = req.headers.get('x-user-payload');
    if (!userPayloadHeader) {
      return NextResponse.json({ error: "Sesi tidak valid atau tidak ada payload pengguna." }, { status: 401 });
    }
    const payload: TokenPayload = JSON.parse(userPayloadHeader);
    
    // Hanya izinkan siswa yang sudah login untuk mengambil token QR
    if (payload.peran !== "SISWA") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya siswa yang dapat mengambil token QR." },
        { status: 403 }
      );
    }

    // Ambil jam toleransi dari database
    const setting = await prisma.pengaturan.findUnique({
      where: { kunci: "jam_toleransi" }
    });
    const jamToleransi = setting?.nilai || "07:15";

    // Buat token dinamis berisi timestamp server
    const token = encryptToken({
      target: "absensi_smk_ar_rahma",
      timestamp: Date.now(),
      rand: Math.random().toString(36).substring(2, 6),
    });

    return NextResponse.json({ success: true, token, jamToleransi });
  } catch (error) {
    console.error("Gagal men-generate token QR:", error);
    return NextResponse.json(
      { error: "Gagal membuat token QR." },
      { status: 500 }
    );
  }
}
