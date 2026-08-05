import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/token-helper";
import { TokenPayload } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const userPayloadHeader = req.headers.get("x-user-payload");
    if (!userPayloadHeader) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const payload: TokenPayload = JSON.parse(userPayloadHeader);

    if (payload.peran !== "SISWA") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const siswa = await prisma.siswa.findUnique({
      where: { idPengguna: payload.userId },
    });

    if (!siswa) {
      return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
    }

    const qrToken = encryptToken({ type: "siswa_statis", nisn: siswa.nisn });

    return NextResponse.json({ success: true, qrToken });
  } catch (error: any) {
    console.error("Kesalahan student qr-token API:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
