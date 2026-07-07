import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { StatusDispensasi, StatusKehadiran } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
    }

    // Check if ADMIN or GURU with isPiket
    let isAuthorized = payload.peran === "ADMIN";
    if (payload.peran === "GURU") {
      const count = await prisma.jadwalPiket.count({
        where: { guru: { idPengguna: payload.userId } }
      });
      if (count > 0) isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses ditolak. Khusus Guru Piket atau Admin." }, { status: 403 });
    }

    // Ambil dispensasi pending beserta info siswa
    const dispensations = await prisma.dispensasiKeterlambatan.findMany({
      include: {
        siswa: {
          include: {
            kelas: true
          }
        }
      },
      orderBy: { tanggal: "desc" }
    });

    return NextResponse.json({
      success: true,
      dispensations: dispensations.map(d => ({
        id: d.id,
        idSiswa: d.idSiswa,
        namaSiswa: d.siswa.nama,
        nisn: d.siswa.nisn,
        kelas: d.siswa.kelas.nama,
        tanggal: d.tanggal.toISOString().split("T")[0],
        alasan: d.alasan,
        fotoBukti: d.fotoBukti,
        status: d.status,
        disetujuiOleh: d.disetujuiOleh
      }))
    });
  } catch (error: any) {
    console.error("Kesalahan API picket dispensations GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
    }

    let isAuthorized = payload.peran === "ADMIN";
    if (payload.peran === "GURU") {
      const count = await prisma.jadwalPiket.count({
        where: { guru: { idPengguna: payload.userId } }
      });
      if (count > 0) isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Parameter id dan status wajib diisi." }, { status: 400 });
    }

    if (!Object.values(StatusDispensasi).includes(status as StatusDispensasi)) {
      return NextResponse.json({ error: "Status dispensasi tidak valid." }, { status: 400 });
    }

    // Lakukan persetujuan dispensasi di dalam transaksi database
    const result = await prisma.$transaction(async (tx) => {
      const disp = await tx.dispensasiKeterlambatan.findUnique({
        where: { id: parseInt(id, 10) },
        include: { siswa: true }
      });

      if (!disp) {
        throw new Error("Dispensasi tidak ditemukan.");
      }

      // Update status dispensasi
      const updatedDisp = await tx.dispensasiKeterlambatan.update({
        where: { id: disp.id },
        data: {
          status: status as StatusDispensasi,
          disetujuiOleh: payload.userId
        }
      });

      // Jika disetujui, update/upsert status kehadiran siswa hari itu menjadi TERLAMBAT dengan catatan dispensasi
      if (status === "DISETUJUI") {
        await tx.kehadiran.upsert({
          where: {
            idSiswa_tanggal: {
              idSiswa: disp.idSiswa,
              tanggal: disp.tanggal
            }
          },
          update: {
            status: StatusKehadiran.TERLAMBAT,
            catatan: `Dispensasi disetujui: ${disp.alasan}`
          },
          create: {
            idSiswa: disp.idSiswa,
            tanggal: disp.tanggal,
            status: StatusKehadiran.TERLAMBAT,
            catatan: `Dispensasi disetujui: ${disp.alasan}`,
            dicatatOleh: payload.userId
          }
        });
      }

      return updatedDisp;
    });

    return NextResponse.json({
      success: true,
      message: `Dispensasi keterlambatan berhasil diupdate menjadi ${status}.`,
      dispensasi: result
    });
  } catch (error: any) {
    console.error("Kesalahan API picket dispensations PUT:", error);
    return NextResponse.json({ error: error.message || "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
