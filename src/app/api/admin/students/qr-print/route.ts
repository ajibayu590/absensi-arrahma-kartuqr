import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { encryptToken } from "@/lib/token-helper";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Parameter ids array wajib diisi." }, { status: 400 });
    }

    const siswaList = await prisma.siswa.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        kelas: true,
      },
    });

    const results = await Promise.all(
      siswaList.map(async (s) => {
        const token = encryptToken({ type: "siswa_statis", nisn: s.nisn });
        const qrDataUrl = await QRCode.toDataURL(token, {
          width: 200,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        return {
          nisn: s.nisn,
          nama: s.nama,
          kelas: s.kelas.nama,
          qrDataUrl,
        };
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error("Kesalahan API qr-print:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
