import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
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
        { error: "Akses ditolak. Anda tidak memiliki izin untuk melihat laporan ini." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const kelasIdParam = searchParams.get("kelasId");
    const bulanParam = searchParams.get("bulan");
    const tahunParam = searchParams.get("tahun");

    const tahunAjaranParam = searchParams.get("tahunAjaran");

    // Default ke bulan & tahun sekarang jika tidak dikirim
    const now = new Date();
    const targetBulan = bulanParam ? parseInt(bulanParam, 10) : now.getMonth() + 1; // 1-indexed (Jan = 1)
    const targetTahun = tahunParam ? parseInt(tahunParam, 10) : now.getFullYear();

    if (isNaN(targetBulan) || targetBulan < 1 || targetBulan > 12 || isNaN(targetTahun)) {
      return NextResponse.json({ error: "Bulan atau tahun tidak valid." }, { status: 400 });
    }

    // Jaring Pengaman JIT (Just-In-Time) Auto-Alpha
    try {
      await runAutoAlpha(false);
    } catch (alphaErr) {
      console.error("Gagal memicu JIT auto-alpha pada API laporan:", alphaErr);
    }

    // Tentukan hak akses kelas berdasarkan Peran
    let kelasId: number | null = null;
    let daftarKelas: Array<{ id: number; nama: string; tahunAjaran: string }> = [];
    let namaKelasTerpilih = "";
    let tahunAjaranAktif = tahunAjaranParam || "";

    if (payload.peran === "WALI_KELAS" || (payload.peran === "GURU" && guru && guru.kelasWali)) {
      // Cari guru yang berelasi dengan pengguna login jika belum di-query
      if (!guru) {
        guru = await prisma.guru.findUnique({
          where: { idPengguna: payload.userId },
          include: {
            kelasWali: true,
          },
        });
      }

      if (!guru || !guru.kelasWali) {
        return NextResponse.json(
          { error: "Wali Kelas belum dikaitkan dengan kelas mana pun." },
          { status: 400 }
        );
      }

      kelasId = guru.kelasWali.id;
      namaKelasTerpilih = guru.kelasWali.nama;
      tahunAjaranAktif = tahunAjaranParam || guru.kelasWali.tahunAjaran;
      daftarKelas = [{ id: guru.kelasWali.id, nama: guru.kelasWali.nama, tahunAjaran: guru.kelasWali.tahunAjaran }];
    } else {
      // Admin, Kepsek, Guru BK dapat mengakses semua kelas
      const whereKelas: any = {};
      if (tahunAjaranParam) {
        whereKelas.tahunAjaran = tahunAjaranParam;
      }

      daftarKelas = await prisma.kelas.findMany({
        where: whereKelas,
        select: { id: true, nama: true, tahunAjaran: true },
        orderBy: { nama: "asc" },
      });

      if (kelasIdParam) {
        const idParsed = parseInt(kelasIdParam, 10);
        if (!isNaN(idParsed)) {
          kelasId = idParsed;
          const k = daftarKelas.find((c) => c.id === kelasId);
          if (k) {
            namaKelasTerpilih = k.nama;
            if (!tahunAjaranParam) tahunAjaranAktif = k.tahunAjaran;
          }
        }
      }

      // Jika admin/kepsek/bk tidak memilih kelas, default ke kelas pertama
      if (!kelasId && daftarKelas.length > 0) {
        kelasId = daftarKelas[0].id;
        namaKelasTerpilih = daftarKelas[0].nama;
        if (!tahunAjaranParam) tahunAjaranAktif = daftarKelas[0].tahunAjaran;
      }
    }

    // Ambil semua daftar Tahun Ajaran unik untuk filter
    const semuaTahunAjaran = await prisma.kelas.findMany({
      select: { tahunAjaran: true },
      distinct: ["tahunAjaran"],
      orderBy: { tahunAjaran: "desc" },
    });
    const daftarTahunAjaran = semuaTahunAjaran.map((k) => k.tahunAjaran);

    // Jika tidak ada kelas sama sekali di sistem
    if (!kelasId) {
      return NextResponse.json({
        daftarKelas,
        daftarTahunAjaran,
        kelasTerpilih: null,
        siswa: [],
        kehadiran: [],
        hariLibur: [],
      });
    }

    // Hitung tanggal mulai dan selesai untuk query (Gunakan UTC untuk keamanan timezone)
    const startDate = new Date(Date.UTC(targetTahun, targetBulan - 1, 1));
    const endDate = new Date(Date.UTC(targetTahun, targetBulan, 0, 23, 59, 59, 999));

    // Ambil siswa aktif di kelas terpilih
    const siswa = await prisma.siswa.findMany({
      where: {
        idKelas: kelasId,
        pengguna: {
          aktif: true,
        },
      },
      select: {
        id: true,
        nisn: true,
        nama: true,
        teleponOrangTua: true,
        sedangMagang: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    const siswaIds = siswa.map((s) => s.id);

    // Ambil data kehadiran siswa untuk bulan & tahun terpilih (dan filter tahunAjaran)
    const whereKehadiran: any = {
      idSiswa: { in: siswaIds },
      tanggal: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (tahunAjaranAktif) {
      whereKehadiran.tahunAjaran = tahunAjaranAktif;
    }

    const kehadiran = await prisma.kehadiran.findMany({
      where: whereKehadiran,
      select: {
        id: true,
        idSiswa: true,
        tanggal: true,
        status: true,
        waktuMasuk: true,
        catatan: true,
        tahunAjaran: true,
      },
    });

    // Format tanggal kehadiran menjadi string YYYY-MM-DD
    const kehadiranFormatted = kehadiran.map((k) => {
      const yyyy = k.tanggal.getUTCFullYear();
      const mm = String(k.tanggal.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(k.tanggal.getUTCDate()).padStart(2, "0");
      const tglString = `${yyyy}-${mm}-${dd}`;

      // Format jam masuk
      let jamMasuk = null;
      if (k.waktuMasuk) {
        const h = String(k.waktuMasuk.getUTCHours() + 7).padStart(2, "0"); // WIB offset (+7)
        const m = String(k.waktuMasuk.getUTCMinutes()).padStart(2, "0");
        jamMasuk = `${h}:${m}`;
      }

      return {
        ...k,
        tanggalStr: tglString,
        jamMasuk,
      };
    });

    // Ambil Hari Libur nasional/kustom pada bulan terpilih
    const hariLibur = await prisma.hariLibur.findMany({
      where: {
        tanggal: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        tanggal: true,
        nama: true,
      },
    });

    const hariLiburFormatted = hariLibur.map((hl) => {
      const yyyy = hl.tanggal.getUTCFullYear();
      const mm = String(hl.tanggal.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(hl.tanggal.getUTCDate()).padStart(2, "0");
      return {
        tanggalStr: `${yyyy}-${mm}-${dd}`,
        nama: hl.nama,
      };
    });

    return NextResponse.json({
      daftarKelas,
      daftarTahunAjaran,
      tahunAjaranTerpilih: tahunAjaranAktif,
      kelasTerpilih: {
        id: kelasId,
        nama: namaKelasTerpilih,
      },
      siswa,
      kehadiran: kehadiranFormatted,
      hariLibur: hariLiburFormatted,
    });
  } catch (error: any) {
    console.error("Kesalahan API laporan GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
