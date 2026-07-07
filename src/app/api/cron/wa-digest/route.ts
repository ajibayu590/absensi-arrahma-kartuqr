import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { kirimWaLangsung } from "@/lib/whatsapp";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    // Validasi otorisasi: Izinkan jika Token Cron cocok ATAU jika pengguna login adalah Admin/Guru
    let isAuthorized = false;
    let userIdForAudit: number | null = null;

    const authHeader = req.headers.get("Authorization");
    if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      isAuthorized = true;
    } else {
      const payload = getUserFromRequest(req);
      if (payload && (payload.peran === "ADMIN" || payload.peran === "GURU")) {
        isAuthorized = true;
        userIdForAudit = payload.userId;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses tidak diizinkan." }, { status: 401 });
    }

    // Tentukan Hari Ini (Zona Waktu WIB / UTC+7)
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(Date.now() + wibOffset);
    const dayOfWeek = wibDate.getUTCDay();

    // Jika dipicu secara manual, bypass validasi hari libur/akhir pekan
    const bypassHoliday = userIdForAudit !== null;

    // Lewati akhir pekan (Minggu = 0, Sabtu = 6) jika tidak di-bypass
    if (!bypassHoliday && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return NextResponse.json({
        success: true,
        message: "Hari libur akhir pekan. Laporan digest dilewati."
      });
    }

    const dateStr = wibDate.toISOString().split("T")[0];
    const cleanToday = new Date(dateStr);

    // Cek jika hari libur nasional atau khusus sekolah jika tidak di-bypass
    if (!bypassHoliday) {
      const isHoliday = await prisma.hariLibur.findUnique({
        where: { tanggal: cleanToday }
      });

      if (isHoliday) {
        return NextResponse.json({
          success: true,
          message: `Hari libur terdeteksi (${isHoliday.nama}). Laporan digest dilewati.`
        });
      }
    }

    // Ambil seluruh kelas bimbingan yang memiliki Wali Kelas
    const classes = await prisma.kelas.findMany({
      where: { idGuru: { not: null } },
      include: {
        guru: {
          include: {
            pengguna: true
          }
        },
        siswa: {
          where: { pengguna: { aktif: true } }
        }
      }
    });

    const digestLogs = [];

    for (const k of classes) {
      if (!k.guru || !k.guru.telepon) continue;

      const activeStudentIds = k.siswa.map(s => s.id);
      const totalStudentsCount = activeStudentIds.length;
      if (totalStudentsCount === 0) continue;

      // Ambil kehadiran kelas hari ini
      const kehadiran = await prisma.kehadiran.findMany({
        where: {
          tanggal: cleanToday,
          idSiswa: { in: activeStudentIds }
        }
      });

      // Buat rekaman kehadiran Alpha otomatis untuk siswa yang belum absen
      const absensiLamaMap = new Map(kehadiran.map(kh => [kh.idSiswa, kh]));
      
      for (const s of k.siswa) {
        if (!absensiLamaMap.has(s.id)) {
          await prisma.kehadiran.create({
            data: {
              idSiswa: s.id,
              tanggal: cleanToday,
              status: "ALPHA",
              tahunAjaran: k.tahunAjaran, // Catat tahun ajaran aktif
            }
          });
        }
      }

      const hadir = kehadiran.filter(x => x.status === "HADIR").length;
      const terlambat = kehadiran.filter(x => x.status === "TERLAMBAT").length;
      const sakit = kehadiran.filter(x => x.status === "SAKIT").length;
      const izin = kehadiran.filter(x => x.status === "IZIN").length;
      const alpha = kehadiran.filter(x => x.status === "ALPHA").length;
      const belumAbsen = Math.max(0, totalStudentsCount - (hadir + terlambat + sakit + izin + alpha));

      const formattedDate = wibDate.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      // Template pesan formal berbahasa Indonesia
      const message = `📌 *LAPORAN RINGKAS HARIAN ABSENSI*
🏫 Kelas: *Kelas ${k.nama}*
📅 Hari/Tanggal: *${formattedDate}*
👤 Wali Kelas: *${k.guru.pengguna.nama}*

Berikut adalah ringkasan kehadiran siswa hari ini:
✅ Hadir: *${hadir} siswa*
⏰ Terlambat: *${terlambat} siswa*
🤒 Sakit: *${sakit} siswa*
✉️ Izin: *${izin} siswa*
❌ Alpha: *${alpha} siswa*
💤 Belum Absen: *${belumAbsen} siswa*

Total Siswa Aktif: *${totalStudentsCount}*

Silakan login ke dashboard sistem absensi untuk meninjau atau memperbarui data secara lengkap.
---
*Sistem Absensi SMK AR-RAHMA MANDIRI INDONESIA*`;

      // Kirim laporan WhatsApp langsung ke Wali Kelas
      const resultWa = await kirimWaLangsung(k.guru.telepon, message);
      
      digestLogs.push({
        kelas: k.nama,
        waliKelas: k.guru.pengguna.nama,
        telepon: k.guru.telepon,
        status: resultWa.success ? "TERKIRIM" : "GAGAL",
        error: resultWa.error || null
      });
    }

    // Catat log audit jika dipicu secara manual oleh Admin/Guru
    if (userIdForAudit !== null) {
      await prisma.logAuditAdmin.create({
        data: {
          idPengguna: userIdForAudit,
          tindakan: "MANUAL_TRIGGER_WA_DIGEST",
          target: "WA_DIGEST_REPORTS",
          detail: JSON.stringify({
            tanggal: dateStr,
            jumlahKelasDikirim: digestLogs.length,
            results: digestLogs.map(log => ({ kelas: log.kelas, status: log.status }))
          })
        }
      });
    }

    return NextResponse.json({
      success: true,
      today: dateStr,
      results: digestLogs
    });
  } catch (error: any) {
    console.error("Kesalahan API wa-digest:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
