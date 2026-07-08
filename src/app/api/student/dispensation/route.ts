import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { TokenPayload } from "@/lib/auth-helper"; // Import TokenPayload
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const userPayloadHeader = req.headers.get('x-user-payload');
    if (!userPayloadHeader) {
      return NextResponse.json({ error: "Sesi tidak valid atau tidak ada payload pengguna." }, { status: 401 });
    }
    const payload: TokenPayload = JSON.parse(userPayloadHeader);

    if (!payload || payload.peran !== "SISWA") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    // Ambil data siswa
    const siswa = await prisma.siswa.findUnique({
      where: { idPengguna: payload.userId }
    });

    if (!siswa) {
      return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
    }

    const formData = await req.formData();
    const alasan = formData.get("alasan") as string;
    const file = formData.get("foto") as File | null;

    if (!alasan) {
      return NextResponse.json({ error: "Alasan pengajuan wajib diisi." }, { status: 400 });
    }

    // Tentukan hari ini (WIB)
    const wibOffset = 7 * 60 * 60 * 1000;
    const cleanToday = new Date(new Date(Date.now() + wibOffset).toISOString().split("T")[0]);

    // Cek jika dispensasi hari ini sudah pernah diajukan
    const existDisp = await prisma.dispensasiKeterlambatan.findUnique({
      where: {
        idSiswa_tanggal: {
          idSiswa: siswa.id,
          tanggal: cleanToday
        }
      }
    });

    if (existDisp) {
      return NextResponse.json({ error: "Anda sudah mengajukan dispensasi untuk hari ini." }, { status: 400 });
    }

    let fotoPath = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Pastikan direktori public/uploads ada
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate nama file unik
      const ext = path.extname(file.name) || ".jpg";
      const filename = `disp-${siswa.id}-${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, filename);

      await fs.writeFile(filePath, buffer);
      fotoPath = `/uploads/${filename}`;
    }

    const disp = await prisma.dispensasiKeterlambatan.create({
      data: {
        idSiswa: siswa.id,
        tanggal: cleanToday,
        alasan,
        fotoBukti: fotoPath,
        status: "MENUNGGU"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Dispensasi keterlambatan berhasil diajukan. Mohon tunggu persetujuan Guru Piket.",
      dispensasi: disp
    });
  } catch (error: any) {
    console.error("Kesalahan API student dispensation POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { TokenPayload } from "@/lib/auth-helper"; // Import TokenPayload
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const userPayloadHeader = req.headers.get('x-user-payload');
    if (!userPayloadHeader) {
      return NextResponse.json({ error: "Sesi tidak valid atau tidak ada payload pengguna." }, { status: 401 });
    }
    const payload: TokenPayload = JSON.parse(userPayloadHeader);

    if (!payload || payload.peran !== "SISWA") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const siswa = await prisma.siswa.findUnique({
      where: { idPengguna: payload.userId }
    });

    if (!siswa) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    const dispensations = await prisma.dispensasiKeterlambatan.findMany({
      where: { idSiswa: siswa.id },
      orderBy: { tanggal: "desc" }
    });

    return NextResponse.json({
      success: true,
      dispensations
    });
  } catch (error: any) {
    console.error("Kesalahan API student dispensation GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
