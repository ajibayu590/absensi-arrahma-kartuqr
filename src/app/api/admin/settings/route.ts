import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan mengambil pengaturan sistem." },
        { status: 403 }
      );
    }

    const settings = await prisma.pengaturan.findMany({
      orderBy: { kunci: "asc" }
    });

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error: any) {
    console.error("Kesalahan API settings GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan memperbarui pengaturan sistem." },
        { status: 403 }
      );
    }

    const { settings } = await req.json();

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: "Format payload tidak valid. Diperlukan array dari pasangan pengaturan." },
        { status: 400 }
      );
    }

    const updatedSettings: any[] = [];
    const auditDetails: Record<string, { sebelum: string; sesudah: string }> = {};

    // Mulai transaksi database untuk mengupdate masal
    await prisma.$transaction(async (tx) => {
      for (const item of settings) {
        if (!item.kunci) continue;

        // Ambil nilai lama untuk log audit
        const oldVal = await tx.pengaturan.findUnique({
          where: { kunci: item.kunci }
        });

        const updated = await tx.pengaturan.upsert({
          where: { kunci: item.kunci },
          update: { nilai: item.nilai.toString() },
          create: { kunci: item.kunci, nilai: item.nilai.toString() }
        });

        updatedSettings.push(updated);

        auditDetails[item.kunci] = {
          sebelum: oldVal ? oldVal.nilai : "",
          sesudah: item.nilai.toString()
        };
      }
    });

    // Catat log audit admin
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: "UPDATE_SYSTEM_SETTINGS",
        target: "SYSTEM_CONFIG",
        detail: JSON.stringify(auditDetails)
      }
    });

    return NextResponse.json({
      success: true,
      message: "Pengaturan sistem berhasil diperbarui.",
      settings: updatedSettings
    });
  } catch (error: any) {
    console.error("Kesalahan API settings PUT:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan untuk menghapus data hari ini." },
        { status: 403 }
      );
    }

    const wibDateFormatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
    const dateStr = wibDateFormatter.format(new Date()).replace(/\//g, '-');
    const cleanToday = new Date(dateStr);

    // Hapus data kehadiran hari ini
    const deletedKehadiran = await prisma.kehadiran.deleteMany({
      where: { tanggal: cleanToday }
    });

    // Hapus data LogWa hari ini (mulai dari awal hari WIB)
    const deletedLogWa = await prisma.logWa.deleteMany({
      where: {
        sentAt: {
          gte: cleanToday
        }
      }
    });

    // Catat log audit admin
    await prisma.logAuditAdmin.create({
      data: {
        idPengguna: payload.userId,
        tindakan: "CLEAN_TODAY_ATTENDANCE",
        target: "KEHADIRAN & LOG_WA",
        detail: JSON.stringify({
          tanggal: dateStr,
          jumlahKehadiranDihapus: deletedKehadiran.count,
          jumlahLogWaDihapus: deletedLogWa.count
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus data hari ini: ${deletedKehadiran.count} kehadiran dan ${deletedLogWa.count} log WA.`
    });
  } catch (error: any) {
    console.error("Kesalahan API settings DELETE:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

