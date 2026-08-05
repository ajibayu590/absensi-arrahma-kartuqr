import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { broadcastAttendance } from "@/lib/sse";
import { kirimWaDenganAntrean } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    let isAuthorized = payload.peran === "ADMIN" || payload.peran === "GURU_PIKET" || payload.peran === "WALI_KELAS";
    let guru = null;

    if (payload.peran === "GURU") {
      guru = await prisma.guru.findUnique({
        where: { idPengguna: payload.userId },
        include: { kelasWali: true }
      });
      if (guru) {
        const isWali = !!guru.kelasWali;
        const isPiket = (await prisma.jadwalPiket.count({ where: { idGuru: guru.id } })) > 0;
        if (isWali || isPiket) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Akses ditolak. Peran Anda tidak memiliki izin untuk mencatat manual." },
        { status: 403 }
      );
    }

    const { idSiswa, tanggal, status, catatan } = await req.json();

    if (!idSiswa || !tanggal || !status) {
      return NextResponse.json(
        { error: "Parameter idSiswa, tanggal, dan status wajib diisi." },
        { status: 400 }
      );
    }

    // Ambil detail siswa
    const siswa = await prisma.siswa.findUnique({
      where: { id: parseInt(idSiswa, 10) },
      include: {
        kelas: true
      }
    });

    if (!siswa) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    const cleanDate = new Date(tanggal);

    // Kueri jika absensi hari ini sudah ada
    const absensiLama = await prisma.kehadiran.findUnique({
      where: {
        idSiswa_tanggal: {
          idSiswa: siswa.id,
          tanggal: cleanDate
        }
      }
    });

    let kehadiran;
    const waktuMasuk = new Date();

    if (absensiLama) {
      // Update kehadiran yang sudah ada
      kehadiran = await prisma.kehadiran.update({
        where: { id: absensiLama.id },
        data: {
          status,
          waktuMasuk: (status === "HADIR" || status === "TERLAMBAT") ? waktuMasuk : null,
          dicatatOleh: payload.userId,
          catatan: catatan || null,
          tahunAjaran: siswa.kelas.tahunAjaran // Update tahun ajaran jika berubah
        }
      });
      
      // Batalkan log WA lama yang masih berstatus TERTUNDA untuk siswa ini
      await prisma.logWa.deleteMany({
        where: {
          idSiswa: siswa.id,
          status: "TERTUNDA"
        }
      });
    } else {
      // Buat kehadiran baru
      kehadiran = await prisma.kehadiran.create({
        data: {
          idSiswa: siswa.id,
          tanggal: cleanDate,
          status,
          waktuMasuk: (status === "HADIR" || status === "TERLAMBAT") ? waktuMasuk : null,
          dicatatOleh: payload.userId,
          catatan: catatan || null,
          tahunAjaran: siswa.kelas.tahunAjaran // Rekam tahun ajaran aktif
        }
      });
    }

    // Format visual jam secara aman menggunakan Intl.DateTimeFormat (WIB)
    const jamMenitVisual = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Jakarta'
    }).format(new Date()).replace(/\./g, ":");

    // Jika HADIR/TERLAMBAT, pancarkan live stream TV
    if (status === "HADIR" || status === "TERLAMBAT") {
      broadcastAttendance(siswa.nama, jamMenitVisual);
    }

    // Susun pesan WA notifikasi orang tua
    const tglFormat = cleanDate.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jakarta"
    });

    let pesanWa = "";
    if (status === "HADIR") {
      pesanWa = `📌 *NOTIFIKASI KEHADIRAN - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n✅ *HADIR (DICATAT PIKET)* - Pukul *${jamMenitVisual} WIB*\n\nTerima kasih telah memantau kehadiran putra/putri Anda.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
    } else if (status === "TERLAMBAT") {
      pesanWa = `📌 *NOTIFIKASI KEHADIRAN - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n⚠️ *TERLAMBAT (DICATAT PIKET)* - Pukul *${jamMenitVisual} WIB*\n\nMohon ingatkan putra/putri Anda agar hadir lebih awal.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
    } else if (status === "SAKIT") {
      pesanWa = `📌 *NOTIFIKASI ABSENSI - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus laporan hari ini:\n🏥 *SAKIT* (Keterangan: _${catatan || "Surat Dokter/Keterangan Keluarga"}_)\n\nTerima kasih atas informasinya. Semoga lekas sembuh.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
    } else if (status === "IZIN") {
      pesanWa = `📌 *NOTIFIKASI ABSENSI - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus laporan hari ini:\n✈️ *IZIN* (Keterangan: _${catatan || "Keterangan resmi orang tua"}_)\n\nTerima kasih atas konfirmasinya.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
    } else if (status === "ALPHA") {
      pesanWa = `📌 *PERINGATAN ABSENSI - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n❌ *ALPHA* (Tanpa Keterangan)\n\nMohon hubungi pihak sekolah/wali kelas untuk penjelasan lebih lanjut.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
    }

    // Masukkan log WA dan trigger antrean
    const logWa = await prisma.logWa.create({
      data: {
        idSiswa: siswa.id,
        telepon: siswa.teleponOrangTua,
        pesan: pesanWa,
        status: "TERTUNDA"
      }
    });

    kirimWaDenganAntrean(logWa.id);

    return NextResponse.json({
      success: true,
      message: "Absensi berhasil dicatat secara manual.",
      kehadiran: {
        id: kehadiran.id,
        namaSiswa: siswa.nama,
        status: kehadiran.status,
        waktuMasuk: kehadiran.waktuMasuk ? jamMenitVisual : null
      }
    });
  } catch (error: any) {
    console.error("Kesalahan manual attendance POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    let isAuthorized = payload.peran === "ADMIN" || payload.peran === "GURU_PIKET" || payload.peran === "WALI_KELAS";

    if (payload.peran === "GURU") {
      const guru = await prisma.guru.findUnique({
        where: { idPengguna: payload.userId },
        include: { kelasWali: true }
      });
      if (guru) {
        const isWali = !!guru.kelasWali;
        const isPiket = (await prisma.jadwalPiket.count({ where: { idGuru: guru.id } })) > 0;
        if (isWali || isPiket) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Akses ditolak. Peran Anda tidak memiliki izin untuk membatalkan absensi." },
        { status: 403 }
      );
    }

    const { idKehadiran } = await req.json();

    if (!idKehadiran) {
      return NextResponse.json({ error: "idKehadiran wajib dikirimkan." }, { status: 400 });
    }

    const kehadiran = await prisma.kehadiran.findUnique({
      where: { id: parseInt(idKehadiran, 10) }
    });

    if (!kehadiran) {
      return NextResponse.json({ error: "Data kehadiran tidak ditemukan." }, { status: 404 });
    }

    // 1. Hapus record kehadiran
    await prisma.kehadiran.delete({
      where: { id: kehadiran.id }
    });

    // 2. Batalkan pengiriman pesan WA yang masih TERTUNDA untuk siswa ini hari ini
    // (Ini menghentikan pengiriman pesan salah jika dibatalkan oleh guru dalam 30 detik)
    await prisma.logWa.deleteMany({
      where: {
        idSiswa: kehadiran.idSiswa,
        status: "TERTUNDA"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Pencatatan absensi berhasil dibatalkan."
    });
  } catch (error: any) {
    console.error("Kesalahan manual attendance DELETE:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
