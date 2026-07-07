import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { startOfMonth, endOfMonth } from "date-fns";
import { runAutoAlpha } from "@/lib/auto-alpha";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    let isAuthorized = ["ADMIN", "KEPALA_SEKOLAH", "WALI_KELAS", "GURU_BK"].includes(payload.peran);
    let guru = null;

    if (payload.peran === "GURU") {
      guru = await prisma.guru.findUnique({
        where: { idPengguna: payload.userId },
        include: { kelasWali: true }
      });
      if (guru && (guru.isBk || guru.kelasWali)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Akses ditolak. Peran Anda tidak diizinkan mengakses dashboard." },
        { status: 403 }
      );
    }

    // 1. Dapatkan filter kelas jika peran adalah WALI_KELAS atau GURU yang ditugaskan sebagai Wali Kelas
    let targetClassId: number | null = null;
    let namaKelasWali = "";

    if (payload.peran === "WALI_KELAS" || (payload.peran === "GURU" && guru && guru.kelasWali)) {
      if (!guru) {
        guru = await prisma.guru.findUnique({
          where: { idPengguna: payload.userId },
          include: { kelasWali: true }
        });
      }

      if (!guru || !guru.kelasWali) {
        return NextResponse.json(
          { error: "Profil wali kelas atau kelas bimbingan tidak ditemukan." },
          { status: 404 }
        );
      }

      targetClassId = guru.kelasWali.id;
      namaKelasWali = guru.kelasWali.nama;
    }

    // 2. Tentukan Tanggal Hari Ini (Zona Waktu WIB / UTC+7)
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(Date.now() + wibOffset);
    const dateStr = wibDate.toISOString().split("T")[0];
    const cleanToday = new Date(dateStr);

    // Jaring Pengaman JIT (Just-In-Time) Auto-Alpha
    try {
      await runAutoAlpha(false);
    } catch (alphaErr) {
      console.error("Gagal memicu JIT auto-alpha pada dashboard:", alphaErr);
    }

    // Kueri dasar filter siswa berdasarkan kelas bimbingan jika Wali Kelas
    const filterSiswa = targetClassId ? { idKelas: targetClassId } : {};

    // 3. Kueri Total Siswa Terdaftar
    const totalSiswa = await prisma.siswa.count({
      where: {
        ...filterSiswa,
        pengguna: { aktif: true }
      }
    });

    // 4. Ambil Kehadiran Hari Ini
    const kehadiranHariIni = await prisma.kehadiran.findMany({
      where: {
        tanggal: cleanToday,
        siswa: {
          ...filterSiswa,
          pengguna: { aktif: true }
        }
      },
      include: {
        siswa: {
          include: {
            kelas: true
          }
        }
      }
    });

    // Hitung ringkasan status hari ini
    const hadir = kehadiranHariIni.filter(k => k.status === "HADIR").length;
    const terlambat = kehadiranHariIni.filter(k => k.status === "TERLAMBAT").length;
    const sakit = kehadiranHariIni.filter(k => k.status === "SAKIT").length;
    const izin = kehadiranHariIni.filter(k => k.status === "IZIN").length;
    const alpha = kehadiranHariIni.filter(k => k.status === "ALPHA").length;
    const belumAbsen = Math.max(0, totalSiswa - (hadir + terlambat + sakit + izin + alpha));

    // 5. Daftar Siswa Alpha Hari Ini (untuk fitur quick wa.me)
    const daftarAlpha = kehadiranHariIni
      .filter(k => k.status === "ALPHA")
      .map(k => ({
        idSiswa: k.siswa.id,
        nama: k.siswa.nama,
        kelas: k.siswa.kelas.nama,
        teleponOrangTua: k.siswa.teleponOrangTua
      }));

    // 6. Hitung Persentase Kehadiran Kumulatif Bulan Ini
    const tglMulaiBulan = startOfMonth(new Date());
    const tglAkhirBulan = endOfMonth(new Date());

    const kehadiranBulanIni = await prisma.kehadiran.findMany({
      where: {
        tanggal: {
          gte: tglMulaiBulan,
          lte: tglAkhirBulan
        },
        siswa: {
          ...filterSiswa,
          pengguna: { aktif: true }
        }
      }
    });

    const totalHariBulanIni = kehadiranBulanIni.length;
    const totalHadirBulanIni = kehadiranBulanIni.filter(k => k.status === "HADIR" || k.status === "TERLAMBAT").length;

    const rataRataBulanIni = totalHariBulanIni > 0
      ? Math.round((totalHadirBulanIni / totalHariBulanIni) * 100)
      : 100;

    // 7. Ambil Riwayat Log WA Terbaru
    const logWaTerbaru = await prisma.logWa.findMany({
      where: targetClassId ? {
        siswa: {
          idKelas: targetClassId
        }
      } : {},
      orderBy: { sentAt: "desc" },
      take: 5,
      include: {
        siswa: {
          select: {
            nama: true,
            kelas: {
              select: {
                nama: true
              }
            }
          }
        }
      }
    });

    // 8. DATA EKSEKUTIF KEPALA SEKOLAH / ADMIN (Trend mingguan & Leaderboard Kelas)
    let trendKehadiran: Array<{ label: string; persentase: number }> = [];
    let leaderboardKelas: Array<{ id: number; nama: string; totalSiswa: number; persentase: number }> = [];
    let piketActivityCount = 0;

    if (payload.peran === "ADMIN" || payload.peran === "KEPALA_SEKOLAH" || payload.peran === "GURU_BK" || (payload.peran === "GURU" && guru && guru.isBk)) {
      // Hitung trend 7 hari sekolah terakhir (skip weekend)
      const satuHariMs = 24 * 60 * 60 * 1000;
      let hariDiperiksa = 0;
      let offsetHari = 0;

      while (hariDiperiksa < 7 && offsetHari < 15) {
        const d = new Date(Date.now() - offsetHari * satuHariMs);
        const dayOfWeek = d.getDay();
        
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekend
          const targetStart = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
          const targetEnd = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));

          const totalSiswaHariItu = await prisma.siswa.count({
            where: { pengguna: { aktif: true } }
          });

          const hadirHariItu = await prisma.kehadiran.count({
            where: {
              tanggal: { gte: targetStart, lte: targetEnd },
              status: { in: ["HADIR", "TERLAMBAT"] }
            }
          });

          const percent = totalSiswaHariItu > 0 ? Math.round((hadirHariItu / totalSiswaHariItu) * 100) : 100;
          
          trendKehadiran.unshift({
            label: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
            persentase: percent
          });

          hariDiperiksa++;
        }
        offsetHari++;
      }

      // Hitung leaderboard kelas hari ini
      const seluruhKelas = await prisma.kelas.findMany({
        include: {
          siswa: {
            where: { pengguna: { aktif: true } }
          }
        }
      });

      for (const k of seluruhKelas) {
        const totalSiswaKelas = k.siswa.length;
        if (totalSiswaKelas === 0) continue;

        const siswaIds = k.siswa.map(s => s.id);
        const hadirHariIni = await prisma.kehadiran.count({
          where: {
            tanggal: cleanToday,
            idSiswa: { in: siswaIds },
            status: { in: ["HADIR", "TERLAMBAT"] }
          }
        });

        const percent = Math.round((hadirHariIni / totalSiswaKelas) * 100);
        leaderboardKelas.push({
          id: k.id,
          nama: k.nama,
          totalSiswa: totalSiswaKelas,
          persentase: percent
        });
      }

      // Sort by percentage descending
      leaderboardKelas.sort((a, b) => b.persentase - a.persentase);

      // Hitung log Piket mencatat manual hari ini
      piketActivityCount = await prisma.kehadiran.count({
        where: {
          tanggal: cleanToday,
          dicatatOleh: { not: null }
        }
      });
    }

    return NextResponse.json({
      success: true,
      peran: payload.peran,
      isBk: guru ? guru.isBk : (payload.peran === "GURU_BK"),
      namaKelasWali,
      totalSiswa,
      ringkasanHariIni: {
        hadir,
        terlambat,
        sakit,
        izin,
        alpha,
        belumAbsen
      },
      daftarAlpha,
      akumulasiBulanIni: {
        totalHariBulanIni,
        totalHadirBulanIni,
        rataRataBulanIni
      },
      logWaTerbaru: logWaTerbaru.map(l => ({
        id: l.id,
        namaSiswa: l.siswa.nama,
        kelasSiswa: l.siswa.kelas.nama,
        telepon: l.telepon,
        status: l.status,
        sentAt: l.sentAt.toISOString().split("T")[1].slice(0, 8),
        error: l.error
      })),
      trendKehadiran,
      leaderboardKelas,
      piketActivityCount
    });
  } catch (error: any) {
    console.error("Kesalahan dashboard-summary API:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
