import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Akses ditolak. Silakan login." }, { status: 401 });
    }

    let isAuthorized = ["ADMIN", "KEPALA_SEKOLAH"].includes(payload.peran);
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
        { error: "Akses ditolak. Hanya Guru BK, Kepala Sekolah, atau Admin yang dapat mengakses EWS." },
        { status: 403 }
      );
    }

    // Tentukan rentang waktu bulan berjalan (WIB/UTC)
    const now = new Date();
    const targetTahun = now.getFullYear();
    const targetBulan = now.getMonth(); // 0-indexed (Jan = 0)

    const startDate = new Date(Date.UTC(targetTahun, targetBulan, 1));
    const endDate = new Date(Date.UTC(targetTahun, targetBulan + 1, 0, 23, 59, 59, 999));

    // Ambil semua siswa aktif beserta relasi kelas & riwayat konseling BK
    const siswaList = await prisma.siswa.findMany({
      where: {
        pengguna: {
          aktif: true,
        },
      },
      include: {
        kelas: true,
        kehadiran: {
          where: {
            tanggal: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            tanggal: "asc",
          },
        },
        logKonselingBk: {
          include: {
            guruBk: {
              select: {
                nama: true,
              },
            },
          },
          orderBy: {
            dibuatPada: "desc",
          },
        },
      },
    });

    const flaggedStudents = [];

    for (const siswa of siswaList) {
      let totalHadir = 0;
      let totalTerlambat = 0;
      let totalSakit = 0;
      let totalIzin = 0;
      let totalAlpha = 0;

      // Pengecekan EWS 1: Alpha 3 Hari Berturut-turut
      let maxConsecutiveAlpha = 0;
      let currentConsecutiveAlpha = 0;

      siswa.kehadiran.forEach((k) => {
        if (k.status === "HADIR") {
          totalHadir++;
          currentConsecutiveAlpha = 0;
        } else if (k.status === "TERLAMBAT") {
          totalTerlambat++;
          currentConsecutiveAlpha = 0;
        } else if (k.status === "SAKIT") {
          totalSakit++;
          currentConsecutiveAlpha = 0;
        } else if (k.status === "IZIN") {
          totalIzin++;
          currentConsecutiveAlpha = 0;
        } else if (k.status === "ALPHA") {
          totalAlpha++;
          currentConsecutiveAlpha++;
          if (currentConsecutiveAlpha > maxConsecutiveAlpha) {
            maxConsecutiveAlpha = currentConsecutiveAlpha;
          }
        }
      });

      const EwsAlphaTrigger = maxConsecutiveAlpha >= 3;
      // Pengecekan EWS 2: Telat lebih dari 5 kali sebulan
      const EwsLateTrigger = totalTerlambat > 5;

      if (EwsAlphaTrigger || EwsLateTrigger) {
        // Formulasi trigger message
        const triggers = [];
        if (EwsAlphaTrigger) triggers.push(`Alpha berturut-turut (${maxConsecutiveAlpha} hari)`);
        if (EwsLateTrigger) triggers.push(`Telat > 5 kali (${totalTerlambat} kali)`);

        flaggedStudents.push({
          id: siswa.id,
          nisn: siswa.nisn,
          nama: siswa.nama,
          kelas: siswa.kelas.nama,
          teleponOrangTua: siswa.teleponOrangTua,
          sedangMagang: siswa.sedangMagang,
          stats: {
            hadir: totalHadir,
            terlambat: totalTerlambat,
            sakit: totalSakit,
            izin: totalIzin,
            alpha: totalAlpha,
          },
          ewsReason: triggers.join(" & "),
          counselingCount: siswa.logKonselingBk.length,
          logKonselingBk: siswa.logKonselingBk,
        });
      }
    }

    return NextResponse.json({
      flaggedStudents,
      bulanTahun: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    });
  } catch (error: any) {
    console.error("Kesalahan API EWS GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
