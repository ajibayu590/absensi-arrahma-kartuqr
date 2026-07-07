import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { kirimWaDenganAntrean } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const isAuthorized = payload.peran === "ADMIN" || payload.peran === "KEPALA_SEKOLAH";

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Akses ditolak. Anda tidak memiliki hak untuk mengirim broadcast WhatsApp." },
        { status: 403 }
      );
    }

    const { pesan, kategori } = await req.json();

    if (!pesan || !kategori) {
      return NextResponse.json(
        { error: "Parameter pesan dan kategori wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Target kelas di-set ke null karena Admin/Kepala Sekolah mengirim secara global
    const targetClassId: number | null = null;

    // 2. Tentukan Tanggal Hari Ini (WIB / UTC+7)
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(Date.now() + wibOffset);
    const dateStr = wibDate.toISOString().split("T")[0];
    const cleanToday = new Date(dateStr);

    // Kueri filter dasar untuk mencari siswa
    const filterSiswa: any = {
      pengguna: { aktif: true }
    };
    if (targetClassId) {
      filterSiswa.idKelas = targetClassId;
    }

    // 3. Saring siswa berdasarkan kategori filter
    let daftarSiswaId: number[] = [];

    if (kategori === "SEMUA") {
      const siswa = await prisma.siswa.findMany({
        where: filterSiswa,
        select: { id: true }
      });
      daftarSiswaId = siswa.map(s => s.id);
    } else if (kategori === "TERLAMBAT") {
      const kehadiran = await prisma.kehadiran.findMany({
        where: {
          tanggal: cleanToday,
          status: "TERLAMBAT",
          siswa: filterSiswa
        },
        select: { idSiswa: true }
      });
      daftarSiswaId = kehadiran.map(k => k.idSiswa);
    } else if (kategori === "ALPHA") {
      const kehadiran = await prisma.kehadiran.findMany({
        where: {
          tanggal: cleanToday,
          status: "ALPHA",
          siswa: filterSiswa
        },
        select: { idSiswa: true }
      });
      daftarSiswaId = kehadiran.map(k => k.idSiswa);
    } else {
      return NextResponse.json({ error: "Kategori target tidak dikenal." }, { status: 400 });
    }

    if (daftarSiswaId.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada target siswa yang cocok dengan filter yang dipilih.",
        jumlahDaftar: 0
      });
    }

    // 4. Kueri detail siswa
    const detailSiswa = await prisma.siswa.findMany({
      where: {
        id: { in: daftarSiswaId }
      },
      include: {
        kelas: true
      }
    });

    let pesanTerkirim = 0;

    // 5. Iterasi pengiriman ke antrean WA
    for (const siswa of detailSiswa) {
      // Ganti variabel template dinamis {Nama_Siswa} dan {Nama_Kelas}
      let formatPesan = pesan
        .replace(/{Nama_Siswa}/g, siswa.nama)
        .replace(/{Nama_Kelas}/g, siswa.kelas.nama);

      // Simpan log WA TERTUNDA
      const log = await prisma.logWa.create({
        data: {
          idSiswa: siswa.id,
          telepon: siswa.teleponOrangTua,
          pesan: formatPesan,
          status: "TERTUNDA"
        }
      });

      // Panggil antrean background sync (jeda random)
      kirimWaDenganAntrean(log.id);
      pesanTerkirim++;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan ${pesanTerkirim} pesan ke antrean broadcast.`,
      jumlahDaftar: pesanTerkirim
    });
  } catch (error: any) {
    console.error("Kesalahan broadcast API:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
