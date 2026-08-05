import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { HariPiket } from "@prisma/client";
import { TokenPayload } from "@/lib/auth-helper"; // Import TokenPayload

export async function GET(req: NextRequest) {
  try {
    const userPayloadHeader = req.headers.get('x-user-payload');
    if (!userPayloadHeader) {
      return NextResponse.json({ error: "Sesi tidak valid atau tidak ada payload pengguna." }, { status: 401 });
    }
    const payload: TokenPayload = JSON.parse(userPayloadHeader);

    // Hanya izinkan ADMIN, KEPALA_SEKOLAH, GURU, atau WALI_KELAS untuk mengakses data guru piket
    if (!["ADMIN", "KEPALA_SEKOLAH", "GURU", "WALI_KELAS"].includes(payload.peran)) {
      return NextResponse.json(
        { error: "Akses ditolak. Peran Anda tidak diizinkan mengakses jadwal piket." },
        { status: 403 }
      );
    }
    const daysMap: Record<number, HariPiket> = {
      1: HariPiket.SENIN,
      2: HariPiket.SELASA,
      3: HariPiket.RABU,
      4: HariPiket.KAMIS,
      5: HariPiket.JUMAT,
      6: HariPiket.SABTU,
    };

    const now = new Date();
    const dayWibFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'Asia/Jakarta'
    });
    const dayName = dayWibFormatter.format(now);
    const wibDays: Record<string, HariPiket> = {
      "Sunday": HariPiket.SABTU, // fallback, akan ditangkap !hariPiket
      "Monday": HariPiket.SENIN,
      "Tuesday": HariPiket.SELASA,
      "Wednesday": HariPiket.RABU,
      "Thursday": HariPiket.KAMIS,
      "Friday": HariPiket.JUMAT,
      "Saturday": HariPiket.SABTU,
    };
    const hariPiket = wibDays[dayName];

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
