import prisma from "./prisma";
import { kirimWaDenganAntrean } from "./whatsapp";

// Lock untuk mencegah eksekusi konkuren dari multiple sources
let isProcessing = false;

/**
 * Memproses status Alpha otomatis untuk siswa yang belum melakukan absensi hari ini.
 * Fungsi ini idempoten dan aman dipanggil berulang kali.
 * 
 * @param force Jika true, bypass pengecekan jam toleransi, hari libur, dan akhir pekan.
 */
export async function runAutoAlpha(force = false): Promise<{ success: boolean; processedCount: number; message: string }> {
  if (isProcessing) {
    return { success: true, processedCount: 0, message: "Proses auto-alpha sedang berjalan, permintaan ini dilewati." };
  }
  isProcessing = true;

  try {
    // 1. Tentukan Tanggal Hari Ini (WIB / UTC+7) secara aman
    const now = new Date();
    const wibDateFormatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
    const dateStr = wibDateFormatter.format(now).replace(/\//g, '-');
    const cleanToday = new Date(dateStr);

    // Ambil dayOfWeek di Jakarta
    const wibDayName = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'Asia/Jakarta'
    }).format(now);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = days.indexOf(wibDayName);

    // 2. Ambil Jam Toleransi dari database
    const settings = await prisma.pengaturan.findMany({
      where: {
        kunci: {
          in: ["jam_toleransi"]
        }
      }
    });
    const jamToleransiSetting = settings.find(s => s.kunci === "jam_toleransi");
    const jamToleransiStr = jamToleransiSetting?.nilai || "07:15"; // Default 07:15

    // 3. Validasi Batas Waktu & Hari Kerja (jika tidak di-force)
    if (!force) {
      // Lewati akhir pekan (Minggu = 0, Sabtu = 6)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { success: true, processedCount: 0, message: "Akhir pekan, proses auto-alpha dilewati." };
      }

      // Cek jika hari libur nasional atau khusus sekolah
      const isHoliday = await prisma.hariLibur.findUnique({
        where: { tanggal: cleanToday }
      });
      if (isHoliday) {
        return { success: true, processedCount: 0, message: `Hari libur terdeteksi (${isHoliday.nama}). Proses auto-alpha dilewati.` };
      }

      // Cek apakah waktu saat ini sudah melewati jam toleransi
      const wibTimeFormatter = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'Asia/Jakarta'
      });
      const currentHourMin = wibTimeFormatter.format(now).replace(/\./g, ":"); // "HH:MM"
      if (currentHourMin < jamToleransiStr) {
        return { success: true, processedCount: 0, message: `Belum melewati jam toleransi (${jamToleransiStr}). Proses auto-alpha ditunda.` };
      }
    }

    // 4. Ambil semua kelas aktif
    const classes = await prisma.kelas.findMany({
      include: {
        siswa: {
          where: { pengguna: { aktif: true } }
        }
      }
    });

    let processedCount = 0;
    const tglFormat = cleanToday.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    for (const k of classes) {
      const activeStudentIds = k.siswa.map(s => s.id);
      if (activeStudentIds.length === 0) continue;

      // Ambil data absensi siswa di kelas ini untuk hari ini
      const kehadiranHariIni = await prisma.kehadiran.findMany({
        where: {
          tanggal: cleanToday,
          idSiswa: { in: activeStudentIds }
        }
      });

      const absensiMap = new Map(kehadiranHariIni.map(kh => [kh.idSiswa, kh]));

      for (const s of k.siswa) {
        // Jika siswa belum absen (tidak terdata di absensiMap)
        if (!absensiMap.has(s.id)) {
          // Buat kehadiran Alpha
          await prisma.kehadiran.create({
            data: {
              idSiswa: s.id,
              tanggal: cleanToday,
              status: "ALPHA",
              tahunAjaran: k.tahunAjaran
            }
          });

          // Susun draf pesan WhatsApp Peringatan Alpha
          const pesanWa = `📌 *PERINGATAN ABSENSI - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${s.nama}*\n🏫 Kelas: *${k.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n❌ *ALPHA* (Tanpa Keterangan)\n\nMohon hubungi pihak sekolah/wali kelas untuk penjelasan lebih lanjut.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;

          // Buat LogWa dengan status TERTUNDA
          const logWa = await prisma.logWa.create({
            data: {
              idSiswa: s.id,
              telepon: s.teleponOrangTua,
              pesan: pesanWa,
              status: "TERTUNDA"
            }
          });

          // Pemicu antrean pengiriman background dengan delay acak
          kirimWaDenganAntrean(logWa.id);
          processedCount++;
        }
      }
    }

    return {
      success: true,
      processedCount,
      message: `Proses auto-alpha selesai. ${processedCount} siswa berhasil diproses dan dikirimi notifikasi WA.`
    };
  } catch (error: any) {
    console.error("Kesalahan runAutoAlpha:", error);
    return {
      success: false,
      processedCount: 0,
      message: error.message || "Terjadi kesalahan internal saat memproses auto-alpha."
    };
  } finally {
    isProcessing = false;
  }
}
