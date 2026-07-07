import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

// GET: Ambil daftar hari libur
export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const holidays = await prisma.hariLibur.findMany({
      orderBy: { tanggal: "asc" }
    });

    // Format tanggal menjadi YYYY-MM-DD agar mudah diproses oleh frontend
    const formattedHolidays = holidays.map(h => {
      const yyyy = h.tanggal.getFullYear();
      const mm = String(h.tanggal.getMonth() + 1).padStart(2, "0");
      const dd = String(h.tanggal.getDate()).padStart(2, "0");
      return {
        ...h,
        tanggalStr: `${yyyy}-${mm}-${dd}`
      };
    });

    return NextResponse.json({ success: true, holidays: formattedHolidays });
  } catch (error: any) {
    console.error("Kesalahan GET holidays:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

// POST: Tambah hari libur baru
export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { tanggal, nama } = await req.json();
    if (!tanggal || !nama) {
      return NextResponse.json({ error: "Parameter tanggal dan nama wajib diisi." }, { status: 400 });
    }

    // Pastikan format tanggal bersih YYYY-MM-DD
    const dateStr = tanggal.split("T")[0];
    const cleanDate = new Date(dateStr);

    // Cek jika tanggal sudah terdaftar
    const existing = await prisma.hariLibur.findUnique({
      where: { tanggal: cleanDate }
    });

    if (existing) {
      return NextResponse.json({ error: "Tanggal tersebut sudah terdaftar sebagai hari libur." }, { status: 400 });
    }

    const holiday = await prisma.hariLibur.create({
      data: {
        tanggal: cleanDate,
        nama,
        isKustom: true
      }
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error: any) {
    console.error("Kesalahan POST holiday:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

// PUT: Edit hari libur
export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id, tanggal, nama } = await req.json();
    if (!id || !tanggal || !nama) {
      return NextResponse.json({ error: "Parameter id, tanggal, dan nama wajib diisi." }, { status: 400 });
    }

    const idParsed = parseInt(id, 10);
    const dateStr = tanggal.split("T")[0];
    const cleanDate = new Date(dateStr);

    // Cek jika ada duplikasi tanggal pada ID lain
    const duplicate = await prisma.hariLibur.findFirst({
      where: {
        tanggal: cleanDate,
        id: { not: idParsed }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: "Tanggal tersebut sudah digunakan oleh hari libur lain." }, { status: 400 });
    }

    const holiday = await prisma.hariLibur.update({
      where: { id: idParsed },
      data: {
        tanggal: cleanDate,
        nama,
        isKustom: true
      }
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error: any) {
    console.error("Kesalahan PUT holiday:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

// DELETE: Hapus hari libur
export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Parameter id wajib diisi." }, { status: 400 });
    }

    await prisma.hariLibur.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ success: true, message: "Hari libur berhasil dihapus." });
  } catch (error: any) {
    console.error("Kesalahan DELETE holiday:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
