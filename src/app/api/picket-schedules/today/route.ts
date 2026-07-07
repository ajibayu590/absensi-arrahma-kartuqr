import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { HariPiket } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const daysMap: Record<number, HariPiket> = {
      1: HariPiket.SENIN,
      2: HariPiket.SELASA,
      3: HariPiket.RABU,
      4: HariPiket.KAMIS,
      5: HariPiket.JUMAT,
      6: HariPiket.SABTU,
    };

    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(Date.now() + wibOffset);
    const todayDay = wibDate.getUTCDay(); // 0 is Sunday, 1 is Monday, etc.
    const hariPiket = daysMap[todayDay];

    if (!hariPiket) {
      return NextResponse.json({
        success: true,
        hari: "MINGGU",
        piket: [],
      });
    }

    const piketToday = await prisma.jadwalPiket.findMany({
      where: { hari: hariPiket },
      include: {
        guru: {
          include: {
            pengguna: {
              select: {
                nama: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      hari: hariPiket,
      piket: piketToday.map(p => ({
        id: p.id,
        nama: p.guru.pengguna.nama,
        nip: p.guru.nip
      }))
    });
  } catch (error: any) {
    console.error("Kesalahan API picket-schedules today GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
