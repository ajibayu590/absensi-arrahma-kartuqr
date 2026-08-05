import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth-helper";

export async function POST(req: Request) {
  try {
    const { usernameOrEmail, kataSandi, sidikJariBrowser } = await req.json();

    if (!usernameOrEmail || !kataSandi) {
      return NextResponse.json(
        { error: "Username/Email/NISN dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    // Query pengguna berdasarkan email atau NISN siswa
    const pengguna = await prisma.pengguna.findFirst({
      where: {
        OR: [
          { email: usernameOrEmail },
          { siswa: { nisn: usernameOrEmail } }
        ]
      },
      include: {
        siswa: {
          include: {
            kelas: true
          }
        },
        guru: {
          include: {
            kelasWali: true
          }
        }
      }
    });

    if (!pengguna) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!pengguna.aktif) {
      return NextResponse.json(
        { error: "Akun Anda telah dinonaktifkan. Silakan hubungi administrator." },
        { status: 403 }
      );
    }

    // Verifikasi kata sandi
    const sandiCocok = await bcrypt.compare(kataSandi, pengguna.kataSandi);
    if (!sandiCocok) {
      return NextResponse.json(
        { error: "Kata sandi salah." },
        { status: 401 }
      );
    }

    // Single-Session & Browser Fingerprinting Logic (Hanya untuk Siswa)
    if (pengguna.peran === "SISWA") {
      if (!sidikJariBrowser) {
        return NextResponse.json(
          { error: "Akses ditolak. Sidik jari browser tidak terdeteksi." },
          { status: 400 }
        );
      }

      if (!pengguna.sidikJariBrowser) {
        // Daftarkan fingerprint pertama kali
        await prisma.pengguna.update({
          where: { id: pengguna.id },
          data: { sidikJariBrowser }
        });
      } else if (pengguna.sidikJariBrowser !== sidikJariBrowser) {
        // Sidik jari berbeda -> Deteksi login baru di HP lain
        // Blokir aktivitas scan selama 5 menit
        const waktuBlokir = new Date(Date.now() + 5 * 60 * 1000); // 5 Menit dari sekarang
        await prisma.pengguna.update({
          where: { id: pengguna.id },
          data: {
            sidikJariBrowser,
            absenDiblokirHingga: waktuBlokir
          }
        });
      }
    }

    // Generate JWT token
    const payload = {
      userId: pengguna.id,
      email: pengguna.email,
      peran: pengguna.peran,
      nama: pengguna.nama
    };
    const token = signToken(payload);

    // Kirim response & atur cookie
    const response = NextResponse.json({
      success: true,
      message: "Login berhasil.",
      pengguna: {
        id: pengguna.id,
        nama: pengguna.nama,
        email: pengguna.email,
        peran: pengguna.peran,
        isPasswordSementara: pengguna.isPasswordSementara,
        siswa: pengguna.siswa ? {
          nisn: pengguna.siswa.nisn,
          idKelas: pengguna.siswa.idKelas,
          namaKelas: pengguna.siswa.kelas.nama,
          teleponOrangTua: pengguna.siswa.teleponOrangTua,
          sedangMagang: pengguna.siswa.sedangMagang
        } : null,
        guru: pengguna.guru ? {
          id: pengguna.guru.id,
          nip: pengguna.guru.nip,
          telepon: pengguna.guru.telepon,
          isBk: pengguna.guru.isBk,
          isPiket: (await prisma.jadwalPiket.count({ where: { idGuru: pengguna.guru.id } })) > 0,
          idKelasWali: pengguna.guru.kelasWali?.id || null,
          namaKelasWali: pengguna.guru.kelasWali?.nama || null
        } : null
      }
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: req.url.startsWith("https://"),
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 hari
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("Kesalahan login API:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
