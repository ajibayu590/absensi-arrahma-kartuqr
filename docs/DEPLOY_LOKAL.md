# 💻 Panduan Pengembangan & Deploy Lokal — SMK Ar Rahma

Dokumen ini menjelaskan daftar perangkat lunak yang harus dipersiapkan serta prosedur lengkap untuk menjalankan aplikasi **Sistem Absensi Siswa SMK Ar Rahma** di lingkungan komputer lokal (Windows/macOS/Linux).

---

## 🛠️ APLIKASI YANG HARUS DISIAPKAN

Sebelum memulai, pastikan perangkat lunak berikut telah terinstal di komputer Anda:

1. **Node.js (Versi 18.x atau lebih baru)**
   * Digunakan untuk menjalankan runtime Javascript aplikasi Next.js.
   * Unduh di: [nodejs.org](https://nodejs.org/) (Disarankan versi LTS).
2. **Git**
   * Digunakan untuk mengelola repositori kode.
   * Unduh di: [git-scm.com](https://git-scm.com/).
3. **Database Server (MySQL / MariaDB)**
   * Pilih salah satu paket aplikasi server lokal berikut untuk kemudahan setup:
     * **XAMPP** (Multiplatform): Mengandung Apache + MariaDB + PHP. Unduh di: [apachefriends.org](https://www.apachefriends.org/).
     * **Laragon** (Windows - Sangat direkomendasikan): Ringan dan cepat. Unduh di: [laragon.org](https://laragon.org/).
     * **Docker** (Opsional): Jika Anda terbiasa dengan kontainerisasi.
4. **Editor Kode (VS Code)**
   * Untuk membuka dan mengedit berkas proyek.
   * Unduh di: [code.visualstudio.com](https://code.visualstudio.com/).
5. **Database Client (Opsional)**
   * Untuk mempermudah melihat isi tabel database secara visual:
     * **phpMyAdmin** (Bawaan XAMPP/Laragon di browser).
     * **DBeaver** atau **HeidiSQL** (Desktop).

---

## 🚀 PROSEDUR DEPLOYMENT LOKAL

### Langkah 1: Persiapan Database
1. Pastikan server **MySQL** Anda di XAMPP atau Laragon sudah dalam status **Running/Start**.
2. Masuk ke phpMyAdmin (`http://localhost/phpmyadmin`) atau database client Anda.
3. Buat database baru bernama: `absensi_smk_ar_rahma`.

### Langkah 2: Konfigurasi File Environment (`.env`)
Buat berkas bernama `.env` di root folder proyek (`/mnt/save/project/absensi/absensi_smk_ar_rahma/.env`) dan isi dengan konfigurasi berikut:

```env
# Koneksi ke MySQL lokal (Sesuaikan username, password, port, dan nama database)
DATABASE_URL="mysql://root:password_mysql_anda@localhost:3306/absensi_smk_ar_rahma"

# Kunci rahasia JWT untuk token sesi (buat string acak dan panjang)
JWT_SECRET="b6zf6P87few-81MRk1uz-zi6fFujFU0_D8qqQoDNyeJB1OjkATV7A3GsF6aKOVjI"
JWT_EXPIRES_IN="7d"

# Kunci enkripsi AES token QR TV (Harus tepat 32 karakter)
AES_SECRET_KEY="12345678901234567890123456789012"

# Token integrasi Fonnte WA Gateway (Dapatkan dari dashboard Fonnte)
FONNTE_TOKEN="isi_token_fonnte_anda"

# Konfigurasi Auto-Alpha Scheduler
AUTO_ALPHA_HOUR=7
AUTO_ALPHA_MINUTE=10
AUTO_ALPHA_INTERVAL_MS=30000
SCHEDULER_SECRET="absensi_smk_ar_rahma_scheduler_secret_key_2026"
```

### Langkah 3: Instalasi Dependensi Proyek
Buka terminal/command prompt di folder proyek ini dan jalankan perintah berikut untuk mengunduh packages:
```bash
npm install
```

### Langkah 4: Sinkronisasi Skema Database & Seeding
Jalankan perintah ini untuk membuat tabel database dan mengisi data bawaan (Akun admin awal, pengaturan awal, hari libur default):
```bash
# Membuat tabel di database berdasarkan skema Prisma
npx prisma db push

# Memasukkan data awal (seed data) ke dalam database
npx prisma db seed
```

### Langkah 5: Menjalankan Aplikasi

Anda dapat menjalankan aplikasi dalam dua mode:

#### A. Mode Pengembangan (Development Mode)
Cocok untuk melakukan modifikasi kode karena perubahan file akan langsung dimuat secara otomatis (*Hot Reload*).
```bash
npm run dev
```
Buka peramban (browser) dan akses alamat: `http://localhost:3000`.

#### B. Mode Produksi (Production Mode dengan Scheduler)
Disarankan jika Anda ingin mensimulasikan lingkungan rilis serta mengaktifkan background cron scheduler harian untuk penandaan status absen Alpha secara otomatis.
```bash
# Melakukan kompilasi build produksi Next.js
npm run build

# Menjalankan server kustom dengan cron scheduler aktif
node server.js
```
Buka peramban (browser) dan akses alamat: `http://localhost:3000`.

---

## 🔑 KREDENSI LOGIN AKUN DEFAULT (SEED DATA)

Setelah menjalankan `npx prisma db seed`, Anda dapat login menggunakan akun administrator awal berikut:
* **Email**: `admin@arrahma.sch.id`
* **Kata Sandi**: `admin123`
