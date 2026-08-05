import { PrismaClient } from "@prisma/client";
import { Peran } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // 1. Seed Pengaturan (Settings)
  const pengaturanData = [
    { kunci: "gps_sekolah_latitude", nilai: "-7.8014" },
    { kunci: "gps_sekolah_longitude", nilai: "112.0123" },
    { kunci: "gps_sekolah_radius", nilai: "50" }, // Radius toleransi GPS dalam meter
    { kunci: "gps_geofencing_aktif", nilai: "true" }, // Status aktif geofencing (true/false)
    { kunci: "wa_gateway_token", nilai: "fonnte_token_placeholder" },
    { kunci: "wa_delay_min", nilai: "2" }, // Jeda antrean minimum dalam detik
    { kunci: "wa_delay_max", nilai: "5" }, // Jeda antrean maksimum dalam detik
    { kunci: "jam_masuk", nilai: "07:00" }, // Jam masuk normal
    { kunci: "jam_toleransi", nilai: "07:15" }, // Jam batas toleransi terlambat
  ];

  for (const item of pengaturanData) {
    await prisma.pengaturan.upsert({
      where: { kunci: item.kunci },
      update: { nilai: item.nilai },
      create: { kunci: item.kunci, nilai: item.nilai },
    });
  }

  // 2. Seed HariLibur (Holidays)
  const hariLiburData = [
    { tanggal: new Date("2026-01-01"), nama: "Tahun Baru Masehi", isKustom: false },
    { tanggal: new Date("2026-05-01"), nama: "Hari Buruh Internasional", isKustom: false },
    { tanggal: new Date("2026-08-17"), nama: "Hari Kemerdekaan Republik Indonesia", isKustom: false },
    { tanggal: new Date("2026-12-25"), nama: "Hari Raya Natal", isKustom: false },
  ];

  for (const item of hariLiburData) {
    // Set format tanggal agar bersih hanya YYYY-MM-DD
    const tglOnly = new Date(item.tanggal.toISOString().split("T")[0]);
    await prisma.hariLibur.upsert({
      where: { tanggal: tglOnly },
      update: { nama: item.nama, isKustom: item.isKustom },
      create: { tanggal: tglOnly, nama: item.nama, isKustom: item.isKustom },
    });
  }

  // Hash sandi default dengan bcrypt
  const sandiDefaultAdmin = await bcrypt.hash("admin123", 10);
  const sandiDefaultBk = await bcrypt.hash("bk123", 10);
  const sandiDefaultPiket = await bcrypt.hash("piket123", 10);
  const sandiDefaultWali = await bcrypt.hash("wali123", 10);
  const sandiDefaultSiswa = await bcrypt.hash("siswa123", 10);

  // 3. Seed Pengguna - ADMIN
  const adminPengguna = await prisma.pengguna.upsert({
    where: { email: "admin@arrahma.sch.id" },
    update: {},
    create: {
      nama: "Administrator Utama",
      email: "admin@arrahma.sch.id",
      kataSandi: sandiDefaultAdmin,
      peran: Peran.ADMIN,
      isPasswordSementara: false,
      aktif: true,
    },
  });

  // 4. Seed Pengguna - GURU BK
  const bkPengguna = await prisma.pengguna.upsert({
    where: { email: "bk@arrahma.sch.id" },
    update: {},
    create: {
      nama: "Guru BK (Bimbingan Konseling)",
      email: "bk@arrahma.sch.id",
      kataSandi: sandiDefaultBk,
      peran: Peran.GURU,
      isPasswordSementara: false,
      aktif: true,
    },
  });

  // Seed Profil Guru BK
  const bkProfil = await prisma.guru.upsert({
    where: { idPengguna: bkPengguna.id },
    update: { isBk: true },
    create: {
      nip: "199005122015042001",
      telepon: "628998877665",
      idPengguna: bkPengguna.id,
      isBk: true,
    },
  });

  // 5. Seed Pengguna - GURU PIKET
  const piketPengguna = await prisma.pengguna.upsert({
    where: { email: "piket@arrahma.sch.id" },
    update: {},
    create: {
      nama: "Guru Piket Absensi",
      email: "piket@arrahma.sch.id",
      kataSandi: sandiDefaultPiket,
      peran: Peran.GURU,
      isPasswordSementara: false,
      aktif: true,
    },
  });

  // Seed Profil Guru Piket
  const piketProfil = await prisma.guru.upsert({
    where: { idPengguna: piketPengguna.id },
    update: {},
    create: {
      nip: "198810232012011003",
      telepon: "628112233445",
      idPengguna: piketPengguna.id,
    },
  });

  // Buat Jadwal Piket agar guru piket terdeteksi sebagai "Piket"
  await prisma.jadwalPiket.upsert({
    where: {
      hari_idGuru: {
        hari: "SENIN",
        idGuru: piketProfil.id,
      }
    },
    update: {},
    create: {
      hari: "SENIN",
      idGuru: piketProfil.id,
    }
  });

  // 6. Seed Pengguna - GURU (Wali Kelas)
  const waliPengguna = await prisma.pengguna.upsert({
    where: { email: "wali.rpl@arrahma.sch.id" },
    update: {},
    create: {
      nama: "Budi Santoso, S.Pd",
      email: "wali.rpl@arrahma.sch.id",
      kataSandi: sandiDefaultWali,
      peran: Peran.GURU,
      isPasswordSementara: false,
      aktif: true,
    },
  });

  // 7. Seed Profil Guru (Wali Kelas)
  const guruProfil = await prisma.guru.upsert({
    where: { idPengguna: waliPengguna.id },
    update: {},
    create: {
      nip: "198503112010011002",
      telepon: "628123456789", // Nomor WA wali kelas untuk laporan harian
      idPengguna: waliPengguna.id,
    },
  });

  // 8. Seed Kelas
  const kelasRpl = await prisma.kelas.upsert({
    where: { nama: "XII RPL 1" },
    update: { idGuru: guruProfil.id },
    create: {
      nama: "XII RPL 1",
      tahunAjaran: "2025/2026",
      idGuru: guruProfil.id,
    },
  });

  // 9. Seed Pengguna - SISWA
  const siswaPengguna = await prisma.pengguna.upsert({
    where: { email: "1234567890@arrahma.sch.id" },
    update: {},
    create: {
      nama: "Ahmad Faisal",
      email: "1234567890@arrahma.sch.id",
      kataSandi: sandiDefaultSiswa,
      peran: Peran.SISWA,
      isPasswordSementara: false,
      aktif: true,
    },
  });

  // 10. Seed Profil Siswa
  await prisma.siswa.upsert({
    where: { idPengguna: siswaPengguna.id },
    update: { idKelas: kelasRpl.id },
    create: {
      nisn: "1234567890",
      nama: "Ahmad Faisal",
      idKelas: kelasRpl.id,
      teleponOrangTua: "628987654321",
      sedangMagang: false,
      idPengguna: siswaPengguna.id,
    },
  });

  console.log("Seeding data basis data absensi berhasil!");
}

main()
  .catch((e) => {
    console.error("Kesalahan saat seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
