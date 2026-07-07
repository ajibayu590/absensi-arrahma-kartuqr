import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- DATABASE SCHEMA DIAGNOSTICS & ALIGNMENT ---");
  
  // 1. Cek tabel-tabel yang ada
  const tables: any[] = await prisma.$queryRawUnsafe("SHOW TABLES");
  const tableNames = tables.map(t => Object.values(t)[0] as string);
  console.log("Tabel saat ini di database:", tableNames);

  // 2. Alter enum kolom peran di tabel Pengguna
  try {
    console.log("Menyelaraskan enum peran pada tabel Pengguna...");
    await prisma.$executeRawUnsafe(
      "ALTER TABLE Pengguna MODIFY COLUMN peran ENUM('ADMIN', 'KEPALA_SEKOLAH', 'GURU', 'SISWA') NOT NULL DEFAULT 'SISWA'"
    );
    console.log("✓ Berhasil menyelaraskan enum peran!");
  } catch (err: any) {
    console.error("✗ Gagal menyelaraskan enum peran:", err.message);
  }

  // 3. Tambahkan kolom isBk ke tabel Guru jika belum ada
  try {
    console.log("Memeriksa kolom isBk di tabel Guru...");
    const columns: any[] = await prisma.$queryRawUnsafe("SHOW COLUMNS FROM Guru LIKE 'isBk'");
    if (columns.length === 0) {
      console.log("Menambahkan kolom isBk ke tabel Guru...");
      await prisma.$executeRawUnsafe("ALTER TABLE Guru ADD COLUMN isBk TINYINT(1) NOT NULL DEFAULT 0");
      console.log("✓ Kolom isBk berhasil ditambahkan!");
    } else {
      console.log("✓ Kolom isBk sudah ada.");
    }
  } catch (err: any) {
    console.error("✗ Gagal menyelaraskan kolom isBk:", err.message);
  }

  // 4. Buat tabel JadwalPiket jika belum ada
  if (!tableNames.includes("JadwalPiket")) {
    try {
      console.log("Membuat tabel JadwalPiket...");
      await prisma.$executeRawUnsafe(`
        CREATE TABLE JadwalPiket (
          id INT AUTO_INCREMENT PRIMARY KEY,
          hari ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU') NOT NULL,
          idGuru INT NOT NULL,
          dibuatPada DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
          diubahPada DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          UNIQUE KEY JadwalPiket_hari_idGuru_key (hari, idGuru),
          FOREIGN KEY (idGuru) REFERENCES Guru(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      console.log("✓ Tabel JadwalPiket berhasil dibuat!");
    } catch (err: any) {
      console.error("✗ Gagal membuat tabel JadwalPiket:", err.message);
    }
  } else {
    console.log("✓ Tabel JadwalPiket sudah ada.");
  }

  // 5. Buat tabel DispensasiKeterlambatan jika belum ada
  if (!tableNames.includes("DispensasiKeterlambatan")) {
    try {
      console.log("Membuat tabel DispensasiKeterlambatan...");
      await prisma.$executeRawUnsafe(`
        CREATE TABLE DispensasiKeterlambatan (
          id INT AUTO_INCREMENT PRIMARY KEY,
          idSiswa INT NOT NULL,
          tanggal DATE NOT NULL,
          alasan TEXT NOT NULL,
          fotoBukti VARCHAR(255) NULL,
          status ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
          disetujuiOleh INT NULL,
          dibuatPada DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
          diubahPada DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          UNIQUE KEY DispensasiKeterlambatan_idSiswa_tanggal_key (idSiswa, tanggal),
          FOREIGN KEY (idSiswa) REFERENCES Siswa(id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (disetujuiOleh) REFERENCES Pengguna(id) ON DELETE SET NULL ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      console.log("✓ Tabel DispensasiKeterlambatan berhasil dibuat!");
    } catch (err: any) {
      console.error("✗ Gagal membuat tabel DispensasiKeterlambatan:", err.message);
    }
  } else {
    console.log("✓ Tabel DispensasiKeterlambatan sudah ada.");
  }

  console.log("--- SELESAI ---");
}

main().finally(() => prisma.$disconnect());
