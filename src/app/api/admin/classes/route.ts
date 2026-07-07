import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan mengelola kelas." },
        { status: 403 }
      );
    }

    // Ambil semua kelas beserta detail guru wali kelasnya
    const kelas = await prisma.kelas.findMany({
      include: {
        guru: {
          include: {
            pengguna: {
              select: {
                nama: true
              }
            }
          }
        },
        _count: {
          select: { siswa: true }
        }
      },
      orderBy: { nama: "asc" }
    });

    // Ambil daftar guru yang belum menjadi wali kelas atau sudah menjadi wali kelas saat ini (untuk pilihan dropdown)
    const guruPilihan = await prisma.guru.findMany({
      include: {
        pengguna: {
          select: {
            nama: true
          }
        },
        kelasWali: true
      }
    });

    return NextResponse.json({
      success: true,
      kelas: kelas.map(k => ({
        id: k.id,
        nama: k.nama,
        tahunAjaran: k.tahunAjaran,
        idGuru: k.idGuru,
        namaWali: k.guru ? `${k.guru.pengguna.nama} (${k.guru.nip ? "NIP. " + k.guru.nip : "Tanpa NIP"})` : "Belum Ditentukan",
        wali: k.guru || null,
        jumlahSiswa: k._count.siswa
      })),
      guruPilihan: guruPilihan.map(g => ({
        id: g.id,
        nip: g.nip,
        telepon: g.telepon,
        sudahWali: g.kelasWali !== null,
        namaWaliKelas: g.pengguna.nama
      }))
    });
  } catch (error: any) {
    console.error("Kesalahan API classes GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { nama, tahunAjaran, idGuru } = await req.json();

    if (!nama || !tahunAjaran) {
      return NextResponse.json({ error: "Parameter nama dan tahunAjaran wajib diisi." }, { status: 400 });
    }

    const parseGuruId = idGuru ? parseInt(idGuru, 10) : null;

    // Periksa keunikan nama kelas
    const cekKelas = await prisma.kelas.findUnique({
      where: { nama }
    });

    if (cekKelas) {
      return NextResponse.json({ error: "Nama kelas sudah digunakan di sistem." }, { status: 400 });
    }

    // Buat kelas baru
    const kelasBaru = await prisma.kelas.create({
      data: {
        nama,
        tahunAjaran,
        idGuru: parseGuruId
      }
    });

    // Log audit admin
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: "CREATE_CLASS",
        target: `KELAS_${kelasBaru.id}`,
        detail: JSON.stringify(kelasBaru)
      }
    });

    return NextResponse.json({
      success: true,
      message: `Kelas ${nama} berhasil ditambahkan.`,
      kelas: kelasBaru
    });
  } catch (error: any) {
    console.error("Kesalahan API classes POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id, nama, tahunAjaran, idGuru } = await req.json();

    if (!id || !nama || !tahunAjaran) {
      return NextResponse.json({ error: "Parameter id, nama, dan tahunAjaran wajib diisi." }, { status: 400 });
    }

    const parseClassId = parseInt(id, 10);
    const parseGuruId = idGuru ? parseInt(idGuru, 10) : null;

    // Cek nama kelas kembar
    const duplicate = await prisma.kelas.findFirst({
      where: {
        nama,
        NOT: { id: parseClassId }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: "Nama kelas sudah terpakai." }, { status: 400 });
    }

    // Update data kelas
    const kelasUpdate = await prisma.kelas.update({
      where: { id: parseClassId },
      data: {
        nama,
        tahunAjaran,
        idGuru: parseGuruId
      }
    });

    // Log audit admin
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: "UPDATE_CLASS",
        target: `KELAS_${parseClassId}`,
        detail: JSON.stringify(kelasUpdate)
      }
    });

    return NextResponse.json({
      success: true,
      message: `Kelas ${nama} berhasil diperbarui.`,
      kelas: kelasUpdate
    });
  } catch (error: any) {
    console.error("Kesalahan API classes PUT:", error);
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
      return NextResponse.json({ error: "ID kelas wajib dikirimkan." }, { status: 400 });
    }

    const parseClassId = parseInt(id, 10);

    // Cek apakah ada siswa di kelas ini
    const countSiswa = await prisma.siswa.count({
      where: { idKelas: parseClassId }
    });

    if (countSiswa > 0) {
      return NextResponse.json(
        { error: "Gagal menghapus. Kelas masih memiliki siswa terdaftar. Pindahkan siswa terlebih dahulu." },
        { status: 400 }
      );
    }

    await prisma.kelas.delete({
      where: { id: parseClassId }
    });

    // Log audit admin
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: "DELETE_CLASS",
        target: `KELAS_${parseClassId}`,
        detail: JSON.stringify({ deletedId: parseClassId })
      }
    });

    return NextResponse.json({
      success: true,
      message: "Kelas berhasil dihapus dari sistem."
    });
  } catch (error: any) {
    console.error("Kesalahan API classes DELETE:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
