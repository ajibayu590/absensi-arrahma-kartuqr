import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/token-helper";
import { broadcastAttendance } from "@/lib/sse";
import { kirimWaDenganAntrean } from "@/lib/whatsapp";
import { TokenPayload } from "@/lib/auth-helper"; // Import TokenPayload

// Fungsi rumus Haversine untuk menghitung jarak spasial (dalam meter) antara dua titik koordinat GPS
function hitungJarakHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radius Bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Jarak dalam meter
}

export async function POST(req: NextRequest) {
  try {
    const userPayloadHeader = req.headers.get('x-user-payload');
    if (!userPayloadHeader) {
      return NextResponse.json({ error: "Sesi tidak valid atau tidak ada payload pengguna." }, { status: 401 });
    }
    const payload: TokenPayload = JSON.parse(userPayloadHeader);

    if (payload.peran !== "SISWA") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya siswa yang dapat melakukan pemindaian mandiri." },
        { status: 403 }
      );
    }



    const { token, latitude, longitude } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token QR wajib dikirimkan." }, { status: 400 });
    }

    // 1. Ambil data Siswa, Pengguna, dan Kelas
    const siswa = await prisma.siswa.findUnique({
      where: { idPengguna: payload.userId },
      include: {
        kelas: true,
        pengguna: true,
      },
    });

    if (!siswa) {
      return NextResponse.json(
        { error: "Data profil siswa tidak ditemukan." },
        { status: 404 }
      );
    }

    // 2. Proteksi Blokir Scan 5 Menit (Sesi Ganda / Hijack)
    if (
      siswa.pengguna.absenDiblokirHingga &&
      new Date(siswa.pengguna.absenDiblokirHingga) > new Date()
    ) {
      const menitTersisa = Math.ceil(
        (new Date(siswa.pengguna.absenDiblokirHingga).getTime() - Date.now()) / (60 * 1000)
      );
      return NextResponse.json(
        {
          error: `Akun Anda diblokir sementara selama ${menitTersisa} menit karena terdeteksi login sharing di perangkat lain.`,
        },
        { status: 403 }
      );
    }

    // 3. Dekripsi dan Validasi Token QR Dinamis
    const decrypted = decryptToken(token);
    if (!decrypted || decrypted.target !== "absensi_smk_ar_rahma") {
      return NextResponse.json({ error: "Token QR tidak valid." }, { status: 400 });
    }

    const selisihWaktu = Date.now() - decrypted.timestamp;
    if (selisihWaktu > 60000 || selisihWaktu < -2000) {
      // Izinkan toleransi minor offset waktu server/client -2s
      return NextResponse.json(
        { error: "Token QR kedaluwarsa. Silakan scan ulang kode terbaru di layar TV." },
        { status: 400 }
      );
    }

    // 4. Validasi Geofencing (Radius Koordinat Sekolah)
    // Ambil pengaturan sekolah dari DB
    const settings = await prisma.pengaturan.findMany({
      where: {
        kunci: {
          in: ["gps_sekolah_latitude", "gps_sekolah_longitude", "gps_sekolah_radius", "gps_geofencing_aktif", "jam_masuk", "jam_toleransi"]
        }
      }
    });

    const config: Record<string, string> = {};
    settings.forEach(s => {
      config[s.kunci] = s.nilai;
    });

    const schoolLat = parseFloat(config["gps_sekolah_latitude"] || "-7.8014");
    const schoolLon = parseFloat(config["gps_sekolah_longitude"] || "112.0123");
    const schoolRadius = parseFloat(config["gps_sekolah_radius"] || "50");
    const geofencingAktif = config["gps_geofencing_aktif"] !== "false"; // Default true

    let latMhs: number | null = null;
    let lonMhs: number | null = null;

    if (geofencingAktif) {
      if (latitude === undefined || longitude === undefined) {
        return NextResponse.json(
          { error: "Akses lokasi GPS perangkat dibutuhkan untuk absensi." },
          { status: 400 }
        );
      }

      const parsedLat = parseFloat(latitude);
      const parsedLon = parseFloat(longitude);

      if (isNaN(parsedLat) || isNaN(parsedLon)) {
        return NextResponse.json(
          { error: "Format koordinat GPS tidak valid." },
          { status: 400 }
        );
      }

      latMhs = parsedLat;
      lonMhs = parsedLon;

      const jarakMeter = hitungJarakHaversine(latMhs, lonMhs, schoolLat, schoolLon);
      if (jarakMeter > schoolRadius) {
        return NextResponse.json(
          {
            error: `Gagal Absen: Lokasi Anda terlalu jauh dari sekolah. Lintang/Bujur terdeteksi ${Math.round(
              jarakMeter
            )} meter dari gerbang (Batas radius: ${schoolRadius}m).`,
          },
          { status: 400 }
        );
      }
    } else {
      // Jika geofencing nonaktif, tetap catat koordinat jika terkirim
      if (latitude !== undefined && longitude !== undefined) {
        const parsedLat = parseFloat(latitude);
        const parsedLon = parseFloat(longitude);
        if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
          latMhs = parsedLat;
          lonMhs = parsedLon;
        }
      }
    }

    // 5. Periksa Kesiapan Tanggal Absensi Harian (Zona Waktu WIB / UTC+7)
    const now = new Date(); // Get current time in UTC
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Jakarta' // Explicitly set to WIB
    };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // 'en-CA' for YYYY-MM-DD format
    const wibDateString = formatter.format(now).replace(/\//g, '-'); // Format YYYY-MM-DD
    const cleanDate = new Date(wibDateString); // Create Date object from WIB date string

    // For visual and comparison, use the same wibDateString but format time
    const wibTimeFormatter = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23', // Ensure 24-hour format
      timeZone: 'Asia/Jakarta'
    });
    const jamMenitVisual = wibTimeFormatter.format(now);
    const jamMenitSekarang = jamMenitVisual;

    // Cek duplikasi absensi hari ini
    const absensiHariIni = await prisma.kehadiran.findUnique({
      where: {
        idSiswa_tanggal: {
          idSiswa: siswa.id,
          tanggal: cleanDate,
        },
      },
    });

    if (absensiHariIni) {
      return NextResponse.json(
        { error: "Anda sudah melakukan absensi untuk hari ini." },
        { status: 400 }
      );
    }

    // 6. Tentukan Status Kehadiran (HADIR / TERLAMBAT / DITOLAK karena melebih toleransi)
    // const jamMenitSekarang = wibDate.toISOString().split("T")[1].slice(0, 5); // e.g. "07:05" // Dihapus, sudah dideklarasikan di atas
    const jamMasuk = config["jam_masuk"] || "07:00";
    const jamToleransi = config["jam_toleransi"] || "07:15";

    let statusKehadiran: "HADIR" | "TERLAMBAT";

    if (jamMenitSekarang <= jamMasuk) {
      statusKehadiran = "HADIR";
    } else if (jamMenitSekarang <= jamToleransi) {
      statusKehadiran = "TERLAMBAT";
    } else {
      return NextResponse.json(
        {
          error: `Batas toleransi kehadiran telah berakhir (${jamToleransi} WIB). Silakan lapor ke Guru Piket di gerbang untuk absensi manual.`,
        },
        { status: 400 }
      );
    }

    // 7. Simpan Absensi ke Database
    const waktuMasuk = new Date();
    const kehadiran = await prisma.kehadiran.create({
      data: {
        idSiswa: siswa.id,
        tanggal: cleanDate,
        status: statusKehadiran,
        waktuMasuk,
        latitude: latMhs,
        longitude: lonMhs,
        tahunAjaran: siswa.kelas.tahunAjaran, // Rekam tahun ajaran saat scan
      },
    });

    // Format jam untuk visual
    // const jamMenitVisual = wibDate.toISOString().split("T")[1].slice(0, 5); // Dihapus, sudah dideklarasikan di atas

    // 8. Pancarkan event real-time (SSE) ke layar TV
    broadcastAttendance(siswa.nama, jamMenitVisual);

    // 9. Susun Pesan & Buat Log Notifikasi WhatsApp (Antrean Gateway)
    const tglFormat = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jakarta" // Tambahkan timezone secara eksplisit
    });

    let pesanWa = "";
    if (statusKehadiran === "HADIR") {
      pesanWa = `📌 *NOTIFIKASI KEHADIRAN - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n✅ *HADIR* - Pukul *${jamMenitVisual} WIB*\n\nTerima kasih telah memantau kehadiran putra/putri Anda.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
    } else {
      pesanWa = `📌 *NOTIFIKASI KEHADIRAN - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n⚠️ *TERLAMBAT* - Pukul *${jamMenitVisual} WIB*\n\nMohon untuk mengingatkan putra/putri Anda agar datang tepat waktu ke sekolah.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
    }

    // Simpan ke logWa dengan status TERTUNDA
    const logWa = await prisma.logWa.create({
      data: {
        idSiswa: siswa.id,
        telepon: siswa.teleponOrangTua,
        pesan: pesanWa,
        status: "TERTUNDA",
      },
    });

    // Jalankan antrean pengiriman pesan WA di background (non-blocking)
    kirimWaDenganAntrean(logWa.id);

    return NextResponse.json({
      success: true,
      message: "Absensi berhasil direkam.",
      kehadiran: {
        status: statusKehadiran,
        waktuMasuk: jamMenitVisual,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Anda sudah melakukan absensi untuk hari ini." },
        { status: 400 }
      );
    }
    console.error("Kesalahan scan absensi API:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
