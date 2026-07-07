import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "SISWA") {
      return NextResponse.json(
        { error: "Akses ditolak. Peran Anda bukan Siswa." },
        { status: 403 }
      );
    }

    // Cari data siswa
    const siswa = await prisma.siswa.findUnique({
      where: { idPengguna: payload.userId },
      include: {
        kelas: true
      }
    });

    if (!siswa) {
      return NextResponse.json(
        { error: "Data profil siswa tidak ditemukan." },
        { status: 404 }
      );
    }

    // Ambil tanggal mulai dan akhir bulan berjalan
    const hariIni = new Date();
    const tglMulaiBulan = startOfMonth(hariIni);
    const tglAkhirBulan = endOfMonth(hariIni);

    // Kueri semua kehadiran siswa di bulan ini untuk perhitungan persentase
    const kehadiranBulanIni = await prisma.kehadiran.findMany({
      where: {
        idSiswa: siswa.id,
        tanggal: {
          gte: tglMulaiBulan,
          lte: tglAkhirBulan
        }
      }
    });

    const totalHari = kehadiranBulanIni.length;
    const jumlahHadir = kehadiranBulanIni.filter(k => k.status === "HADIR").length;
    const jumlahTerlambat = kehadiranBulanIni.filter(k => k.status === "TERLAMBAT").length;
    const jumlahSakit = kehadiranBulanIni.filter(k => k.status === "SAKIT").length;
    const jumlahIzin = kehadiranBulanIni.filter(k => k.status === "IZIN").length;
    const jumlahAlpha = kehadiranBulanIni.filter(k => k.status === "ALPHA").length;

    // Persentase kehadiran = (Hadir + Terlambat) / Total Hari tercatat * 100
    // Jika belum ada record hari ini/bulan ini, default 100%
    const persentaseKehadiran = totalHari > 0 
      ? Math.round(((jumlahHadir + jumlahTerlambat) / totalHari) * 100) 
      : 100;

    // Ambil riwayat kehadiran 7 hari terakhir
    const riwayatTujuhHari = await prisma.kehadiran.findMany({
      where: { idSiswa: siswa.id },
      orderBy: { tanggal: "desc" },
      take: 7
    });

    // Periksa status pemindaian diblokir (Single-Session Lock)
    const pengguna = await prisma.pengguna.findUnique({
      where: { id: payload.userId }
    });

    const isAbsenDiblokir = pengguna?.absenDiblokirHingga 
      ? new Date(pengguna.absenDiblokirHingga) > new Date() 
      : false;
    
    const detikBlokirTersisa = pengguna?.absenDiblokirHingga && isAbsenDiblokir
      ? Math.max(0, Math.round((new Date(pengguna.absenDiblokirHingga).getTime() - Date.now()) / 1000))
      : 0;

    return NextResponse.json({
      success: true,
      profil: {
        nisn: siswa.nisn,
        nama: siswa.nama,
        kelas: siswa.kelas.nama,
        sedangMagang: siswa.sedangMagang,
        isAbsenDiblokir,
        detikBlokirTersisa
      },
      statistik: {
        totalHari,
        jumlahHadir,
        jumlahTerlambat,
        jumlahSakit,
        jumlahIzin,
        jumlahAlpha,
        persentaseKehadiran
      },
      riwayat: riwayatTujuhHari.map(k => ({
        id: k.id,
        tanggal: k.tanggal.toISOString().split("T")[0],
        status: k.status,
        waktuMasuk: k.waktuMasuk ? new Date(k.waktuMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : null,
        catatan: k.catatan
      }))
    });
  } catch (error: any) {
    console.error("Kesalahan student-dashboard API:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
