import { NextResponse } from "next/server";
import { encryptToken } from "@/lib/token-helper";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
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
