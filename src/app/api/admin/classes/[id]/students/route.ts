import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const classId = parseInt(id, 10);

    if (isNaN(classId)) {
      return NextResponse.json({ error: "ID Kelas tidak valid." }, { status: 400 });
    }

    // Ambil detail siswa di kelas ini beserta status penggunanya
    const students = await prisma.siswa.findMany({
      where: { idKelas: classId },
      include: {
        pengguna: {
          select: {
            aktif: true,
            email: true
          }
        }
      },
      orderBy: { nama: "asc" }
    });

    return NextResponse.json({
      success: true,
      students: students.map(s => ({
        id: s.id,
        nisn: s.nisn,
        nama: s.nama,
        teleponOrangTua: s.teleponOrangTua,
        sedangMagang: s.sedangMagang,
        aktif: s.pengguna.aktif,
        email: s.pengguna.email
      }))
    });
  } catch (error: any) {
    console.error("Kesalahan API classes student list GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
