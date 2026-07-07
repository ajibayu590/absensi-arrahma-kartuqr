import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { kirimWaDenganAntrean } from "@/lib/whatsapp";

interface OfflineLog {
  idSiswa: number;
  tanggal: string; // Format YYYY-MM-DD
  status: "HADIR" | "TERLAMBAT" | "SAKIT" | "IZIN" | "ALPHA";
  waktuMasuk: string; // Format ISO string waktu masuk
  dicatatOleh: number;
  catatan?: string;
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    let isAuthorized = payload.peran === "ADMIN" || payload.peran === "GURU_PIKET";
    if (payload.peran === "GURU") {
      const guru = await prisma.guru.findUnique({
        where: { idPengguna: payload.userId }
      });
      if (guru) {
        const isPiket = (await prisma.jadwalPiket.count({ where: { idGuru: guru.id } })) > 0;
        if (isPiket) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Akses ditolak. Peran Anda tidak diizinkan menyinkronkan data massal." },
        { status: 403 }
      );
    }

    const { logs } = await req.json();

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: "Parameter logs harus berupa array data absensi." },
        { status: 400 }
      );
    }

    let suksesCount = 0;
    let skipCount = 0;

    for (const log of logs as OfflineLog[]) {
      try {
        const cleanDate = new Date(log.tanggal);
        
        // Cek apakah data kehadiran sudah ada untuk tanggal tersebut
        const existing = await prisma.kehadiran.findUnique({
          where: {
            idSiswa_tanggal: {
              idSiswa: log.idSiswa,
              tanggal: cleanDate
            }
          }
        });

        if (existing) {
          skipCount++;
          continue; // Lewati jika sudah ada record
        }

        // Ambil info detail siswa untuk penyusunan notifikasi
        const siswa = await prisma.siswa.findUnique({
          where: { id: log.idSiswa },
          include: {
            kelas: true
          }
        });

        if (!siswa) {
          skipCount++;
          continue;
        }

        // Parse waktu masuk dari log offline
        const dbWaktuMasuk = log.waktuMasuk ? new Date(log.waktuMasuk) : null;
        
        // Buat record Kehadiran
        await prisma.kehadiran.create({
          data: {
            idSiswa: log.idSiswa,
            tanggal: cleanDate,
            status: log.status,
            waktuMasuk: dbWaktuMasuk,
            dicatatOleh: log.dicatatOleh || payload.userId,
            catatan: log.catatan || null
          }
        });

        // Susun log WA
        const tglFormat = cleanDate.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        });

        const jamMenitVisual = dbWaktuMasuk 
          ? new Date(dbWaktuMasuk.getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[1].slice(0, 5)
          : "-";

        let pesanWa = "";
        if (log.status === "HADIR") {
          pesanWa = `📌 *NOTIFIKASI KEHADIRAN - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n✅ *HADIR (SYNCHRONIZED)* - Pukul *${jamMenitVisual} WIB*\n\nTerima kasih telah memantau kehadiran putra/putri Anda.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
        } else if (log.status === "TERLAMBAT") {
          pesanWa = `📌 *NOTIFIKASI KEHADIRAN - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n⚠️ *TERLAMBAT (SYNCHRONIZED)* - Pukul *${jamMenitVisual} WIB*\n\nMohon ingatkan putra/putri Anda agar hadir lebih awal.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
        } else if (log.status === "SAKIT") {
          pesanWa = `📌 *NOTIFIKASI ABSENSI - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus laporan hari ini:\n🏥 *SAKIT* (Keterangan: _${log.catatan || "Surat Dokter/Keterangan Keluarga"}_)\n\nTerima kasih atas informasinya.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
        } else if (log.status === "IZIN") {
          pesanWa = `📌 *NOTIFIKASI ABSENSI - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus laporan hari ini:\n✈️ *IZIN* (Keterangan: _${log.catatan || "Keterangan resmi orang tua"}_)\n\nTerima kasih atas konfirmasinya.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
        } else if (log.status === "ALPHA") {
          pesanWa = `📌 *PERINGATAN ABSENSI - SMK AR-RAHMA MANDIRI INDONESIA*\n\nKepada Yth. Orang Tua/Wali dari:\n👤 Nama: *${siswa.nama}*\n🏫 Kelas: *${siswa.kelas.nama}*\n📅 Tanggal: *${tglFormat}*\n\nStatus kehadiran hari ini:\n❌ *ALPHA* (Tanpa Keterangan)\n\nMohon hubungi pihak sekolah/wali kelas.\n---\n*SMK AR-RAHMA MANDIRI INDONESIA*`;
        }

        const logWa = await prisma.logWa.create({
          data: {
            idSiswa: siswa.id,
            telepon: siswa.teleponOrangTua,
            pesan: pesanWa,
            status: "TERTUNDA"
          }
        });

        // Trigger antrean WA
        kirimWaDenganAntrean(logWa.id);
        
        suksesCount++;
      } catch (err) {
        console.error("Gagal menyinkronkan satu record offline:", err);
        skipCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi selesai. Berhasil: ${suksesCount}, Dilewati: ${skipCount}`,
      statistik: {
        suksesCount,
        skipCount
      }
    });
  } catch (error: any) {
    console.error("Kesalahan bulk-sync API:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
