import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan melakukan pembaruan massal." },
        { status: 403 }
      );
    }

    const { studentIds, sedangMagang, tanggalMulai, tanggalSelesai } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Parameter studentIds wajib berupa array dan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const parseStudentIds = studentIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    if (parseStudentIds.length === 0) {
      return NextResponse.json(
        { error: "Daftar ID siswa tidak valid." },
        { status: 400 }
      );
    }

    const start = tanggalMulai ? new Date(tanggalMulai) : null;
    const end = tanggalSelesai ? new Date(tanggalSelesai) : null;

    // Lakukan pembaruan massal di dalam database transaction beserta log audit admin
    const result = await prisma.$transaction(async (tx) => {
      // Dapatkan data siswa sebelum diubah (untuk kebutuhan detail log audit)
      const siswaSebelumnya = await tx.siswa.findMany({
        where: { id: { in: parseStudentIds } },
        select: { id: true, nama: true, sedangMagang: true }
      });

      // Update data siswa
      const updateResult = await tx.siswa.updateMany({
        where: { id: { in: parseStudentIds } },
        data: {
          sedangMagang,
          tanggalMulaiMagang: sedangMagang ? start : null,
          tanggalSelesaiMagang: sedangMagang ? end : null
        }
      });

      // Catat log audit admin
      await tx.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "BULK_UPDATE_INTERNSHIP",
          target: `STUDENTS_COUNT_${parseStudentIds.length}`,
          detail: JSON.stringify({
            sedangMagang,
            tanggalMulaiMagang: sedangMagang ? start : null,
            tanggalSelesaiMagang: sedangMagang ? end : null,
            siswaTerdampak: siswaSebelumnya.map(s => ({ id: s.id, nama: s.nama, sedangMagangSebelumnya: s.sedangMagang }))
          })
        }
      });

      return updateResult;
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} data status magang siswa berhasil diperbarui secara massal.`,
      count: result.count
    });
  } catch (error: any) {
    console.error("Kesalahan API bulk-internship:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
