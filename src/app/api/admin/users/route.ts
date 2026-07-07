import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth-helper";
import * as bcrypt from "bcrypt";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang diizinkan mengakses data ini." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const downloadParam = searchParams.get("download");

    // Jika parameter download ada, filter hanya user dengan password sementara
    const whereClause: any = {
      NOT: { peran: "SISWA" }
    };

    if (downloadParam === "true") {
      whereClause.isPasswordSementara = true;
    }

    // Ambil semua pengguna non-siswa beserta data profil guru jika ada
    const users = await prisma.pengguna.findMany({
      where: whereClause,
      include: {
        guru: {
          include: {
            kelasWali: true
          }
        }
      },
      orderBy: { nama: "asc" }
    });

    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        nama: u.nama,
        email: u.email,
        peran: u.peran,
        isPasswordSementara: u.isPasswordSementara,
        aktif: u.aktif,
        sidikJariBrowser: u.sidikJariBrowser,
        dibuatPada: u.dibuatPada,
        guruId: u.guru?.id || null,
        nip: u.guru?.nip || null,
        telepon: u.guru?.telepon || null,
        isBk: u.guru?.isBk || false,
        namaKelasWali: u.guru?.kelasWali?.nama || null
      }))
    });
  } catch (error: any) {
    console.error("Kesalahan API admin users GET:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { nama, email, kataSandi, peran, aktif, isPasswordSementara, nip, telepon, isBk } = await req.json();

    if (!nama || !email || !kataSandi || !peran) {
      return NextResponse.json({ error: "Parameter nama, email, kataSandi, dan peran wajib diisi." }, { status: 400 });
    }

    // Periksa keunikan email
    const existEmail = await prisma.pengguna.findUnique({
      where: { email }
    });

    if (existEmail) {
      return NextResponse.json({ error: "Email sudah digunakan oleh pengguna lain." }, { status: 400 });
    }

    // Periksa keunikan NIP jika ada
    if (peran === "GURU" && nip) {
      const existNip = await prisma.guru.findUnique({
        where: { nip }
      });
      if (existNip) {
        return NextResponse.json({ error: "NIP sudah terdaftar di sistem." }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(kataSandi, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const p = await tx.pengguna.create({
        data: {
          nama,
          email,
          kataSandi: hashedPassword,
          peran,
          aktif: aktif ?? true,
          isPasswordSementara: isPasswordSementara ?? true
        }
      });

      if (peran === "GURU") {
        await tx.guru.create({
          data: {
            nip: nip || null,
            telepon: telepon || null,
            isBk: isBk ?? false,
            idPengguna: p.id
          }
        });
      }

      // Catat log audit admin
      await tx.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "CREATE_USER",
          target: `USER_${p.id}`,
          detail: JSON.stringify({
            id: p.id,
            nama: p.nama,
            email: p.email,
            peran: p.peran,
            nip: nip || null,
            isBk: isBk ?? false
          })
        }
      });

      return p;
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${nama} berhasil ditambahkan.`,
      user: newUser
    });
  } catch (error: any) {
    console.error("Kesalahan API admin users POST:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload || payload.peran !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const { id, nama, email, kataSandi, peran, aktif, isPasswordSementara, nip, telepon, isBk } = await req.json();

    if (!id || !nama || !email || !peran) {
      return NextResponse.json({ error: "Parameter id, nama, email, dan peran wajib diisi." }, { status: 400 });
    }

    const userId = parseInt(id, 10);

    // Cek keunikan email lain
    const existEmail = await prisma.pengguna.findFirst({
      where: {
        email,
        NOT: { id: userId }
      }
    });

    if (existEmail) {
      return NextResponse.json({ error: "Email sudah digunakan oleh akun lain." }, { status: 400 });
    }

    // Cek keunikan NIP jika ada
    if (peran === "GURU" && nip) {
      const existNip = await prisma.guru.findFirst({
        where: {
          nip,
          NOT: { idPengguna: userId }
        }
      });
      if (existNip) {
        return NextResponse.json({ error: "NIP sudah digunakan oleh guru lain." }, { status: 400 });
      }
    }

    const hashedPassword = kataSandi ? await bcrypt.hash(kataSandi, 10) : undefined;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const p = await tx.pengguna.update({
        where: { id: userId },
        data: {
          nama,
          email,
          peran,
          aktif,
          isPasswordSementara,
          ...(hashedPassword ? { kataSandi: hashedPassword } : {})
        }
      });

      if (peran === "GURU") {
        await tx.guru.upsert({
          where: { idPengguna: userId },
          create: {
            nip: nip || null,
            telepon: telepon || null,
            isBk: isBk ?? false,
            idPengguna: userId
          },
          update: {
            nip: nip || null,
            telepon: telepon || null,
            isBk: isBk ?? false
          }
        });
      } else {
        // Jika peran berubah dari GURU ke peran lain, hapus rekam data gurunya
        const existGuru = await tx.guru.findUnique({
          where: { idPengguna: userId }
        });
        if (existGuru) {
          await tx.guru.delete({
            where: { idPengguna: userId }
          });
        }
      }

      // Catat log audit admin
      await tx.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "UPDATE_USER",
          target: `USER_${userId}`,
          detail: JSON.stringify({
            id: userId,
            nama: p.nama,
            email: p.email,
            peran: p.peran,
            nip: nip || null,
            isBk: isBk ?? false
          })
        }
      });

      return p;
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${nama} berhasil diperbarui.`,
      user: updatedUser
    });
  } catch (error: any) {
    console.error("Kesalahan API admin users PUT:", error);
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
      return NextResponse.json({ error: "ID pengguna wajib disertakan." }, { status: 400 });
    }

    const deleteId = parseInt(id, 10);

    if (deleteId === payload.userId) {
      return NextResponse.json({ error: "Gagal menghapus. Anda tidak diperkenankan menghapus akun Anda sendiri." }, { status: 400 });
    }

    const userObj = await prisma.pengguna.findUnique({
      where: { id: deleteId }
    });

    if (!userObj) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Hapus pengguna (Profil Guru akan otomatis terhapus karena ON DELETE CASCADE)
      await tx.pengguna.delete({
        where: { id: deleteId }
      });

      // Catat log audit admin
      await tx.logAuditAdmin.create({
        data: {
          idPengguna: payload.userId,
          tindakan: "DELETE_USER",
          target: `USER_${deleteId}`,
          detail: JSON.stringify({ id: deleteId, email: userObj.email, nama: userObj.nama, peran: userObj.peran })
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${userObj.nama} berhasil dihapus.`
    });
  } catch (error: any) {
    console.error("Kesalahan API admin users DELETE:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}
