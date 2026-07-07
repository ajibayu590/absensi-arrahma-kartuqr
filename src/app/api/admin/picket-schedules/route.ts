import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import { HariPiket } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan mengelola jadwal piket." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const downloadParam = searchParams.get("download");

    // Ambil semua jadwal piket beserta relasi gurunya
    const schedules = await prisma.jadwalPiket.findMany({
      include: {
        guru: {
          include: {
            pengguna: true
          }
        }
      },
      orderBy: [
        { hari: "asc" }
      ]
    });

    if (downloadParam === "true") {
      return NextResponse.json({
        success: true,
        schedules: schedules.map(s => ({
          hari: s.hari,
          nama: s.guru.pengguna.nama,
          nip: s.guru.nip,
          telepon: s.guru.telepon
        }))
      });
    }

    // Ambil semua guru untuk pilihan dropdown di UI
    const teachersList = await prisma.guru.findMany({
      include: {
        pengguna: true
      },
      where: {
        pengguna: {
          aktif: true
        }
      }
    });

    return NextResponse.json({
      success: true,
      schedules: schedules.map(s => ({
        id: s.id,
        hari: s.hari,
        idGuru: s.idGuru,
        nip: s.guru.nip,
        nama: s.guru.pengguna.nama,
        telepon: s.guru.telepon
      })),
      teachers: teachersList.map(t => ({
        id: t.id,
        nip: t.nip,
        nama: t.pengguna.nama
      }))
    });
  } catch (error: any) {
    console.error("Kesalahan API admin picket-schedules GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { hari, idGuru } = await req.json();

    if (!hari || !idGuru) {
      return NextResponse.json({ error: "Parameter hari dan idGuru wajib diisi." }, { status: 400 });
    }

    const parseGuruId = parseInt(idGuru, 10);

    // Validasi enum HariPiket
    if (!Object.values(HariPiket).includes(hari as HariPiket)) {
      return NextResponse.json({ error: "Format hari tidak valid." }, { status: 400 });
    }

    // Cek apakah guru sudah dijadwalkan pada hari tersebut
    const existSchedule = await prisma.jadwalPiket.findUnique({
      where: {
        hari_idGuru: {
          hari: hari as HariPiket,
          idGuru: parseGuruId
        }
      }
    });

    if (existSchedule) {
      return NextResponse.json({ error: "Guru tersebut sudah dijadwalkan pada hari ini." }, { status: 400 });
    }

    const newSchedule = await prisma.$transaction(async (tx) => {
      const s = await tx.jadwalPiket.create({
        data: {
          hari: hari as HariPiket,
          idGuru: parseGuruId
        },
        include: {
          guru: {
            include: {
              pengguna: true
            }
          }
        }
      });

      // Catat log audit admin
      await tx.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "CREATE_PICKET_SCHEDULE",
          target: `PICKET_${s.id}`,
          detail: JSON.stringify({
            id: s.id,
            hari: s.hari,
            namaGuru: s.guru.pengguna.nama,
            idGuru: s.idGuru
          })
        }
      });

      return s;
    });

    return NextResponse.json({
      success: true,
      message: `Jadwal piket berhasil ditambahkan untuk ${newSchedule.guru.pengguna.nama}.`,
      schedule: {
        id: newSchedule.id,
        hari: newSchedule.hari,
        idGuru: newSchedule.idGuru,
        nip: newSchedule.guru.nip,
        nama: newSchedule.guru.pengguna.nama
      }
    });
  } catch (error: any) {
    console.error("Kesalahan API admin picket-schedules POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID jadwal wajib disertakan." }, { status: 400 });
    }

    const scheduleId = parseInt(id, 10);

    const exist = await prisma.jadwalPiket.findUnique({
      where: { id: scheduleId },
      include: {
        guru: {
          include: {
            pengguna: true
          }
        }
      }
    });

    if (!exist) {
      return NextResponse.json({ error: "Jadwal piket tidak ditemukan." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.jadwalPiket.delete({
        where: { id: scheduleId }
      });

      // Catat log audit admin
      await tx.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "DELETE_PICKET_SCHEDULE",
          target: `PICKET_${scheduleId}`,
          detail: JSON.stringify({
            id: scheduleId,
            hari: exist.hari,
            namaGuru: exist.guru.pengguna.nama,
            idGuru: exist.idGuru
          })
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Jadwal piket berhasil dihapus."
    });
  } catch (error: any) {
    console.error("Kesalahan API admin picket-schedules DELETE:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
