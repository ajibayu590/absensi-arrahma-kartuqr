# 🏫 Sistem Absensi Siswa SMK Ar Rahma

[![Next.js](https://img.shields.io/badge/Next.js-16.2.7-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-6.19-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Fonnte WA](https://img.shields.io/badge/WA_Gateway-Fonnte-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://fonnte.com/)

Sistem Absensi Siswa SMK Ar Rahma adalah aplikasi pengelolaan kehadiran (*attendance management system*) berbasis *single codebase* menggunakan **Next.js App Router**, **TypeScript**, dan **Tailwind CSS**. Sistem ini dilengkapi dengan penandaan lokasi GPS (Geofencing Haversine), enkripsi AES-256 putaran token QR TV lobi secara real-time via *Server-Sent Events (SSE)*, penyelamatan data *offline* dengan IndexedDB (Dexie.js), otomatisasi Notifikasi WhatsApp Gateway, serta generator dokumen rekap PDF & Excel otomatis.

---

## 📸 FITUR UTAMA SISTEM

### 1. 📱 Portal Mandiri Siswa (`/student`)
* **Geofencing GPS**: Perhitungan rumus koordinat bumi Haversine di backend guna melarang pemindaian di luar area/radius sekolah (default: 50 meter).
* **Single-Session Lock**: Mengunci peramban menggunakan sidik jari browser (`sidikJariBrowser`) untuk mencegah kecurangan/titip absen. Pelanggaran sesi ganda memicu pemblokiran otomatis presensi selama 5 menit.
* **Haptic & Audio Feedback**: Mengintegrasikan suara bip audio bersih dan getaran perangkat (`navigator.vibrate`) untuk indikator instan sukses/gagal scan.
* **Monthly Gauge Tracker**: Diagram lingkaran visual keaktifan absensi bulanan beserta riwayat kehadiran 7 hari terakhir.

### 2. 📺 Layar QR TV Lobi Utama (`/display-qr`)
* **AES-256 Encrypted Token**: Token QR terenkripsi dinamis berisi timestamp server yang otomatis kedaluwarsa dalam 10 detik.
* **Live SSE Stream**: Server-Sent Events (SSE) yang memancarkan data kehadiran siswa secara langsung ke lobi TV.
* **Modern TV Dashboard**: Layout premium dengan circular countdown timer 10 detik dan panel notifikasi melayang real-time.

### 3. 💼 Dashboard Guru Piket (`/scan`)
* **Pencarian Cepat & Satu-Klik**: Filter data siswa berdasarkan kelas dan input absensi manual (`Hadir`, `Terlambat`, `Izin`, `Sakit`) tanpa modal konfirmasi.
* **IndexedDB Offline Caching**: Penyelamatan data lokal menggunakan `Dexie.js` saat koneksi internet terputus. Data ditandai `PENDING_SYNC`.
* **Auto Sync API**: Background scheduler yang mendeteksi jaringan kembali online dan mengirim data absensi tertunda ke server secara massal (`/api/attendance/bulk-sync`).

### 4. 🗂️ Dashboard Wali Kelas & Notifikasi WA (`/reports`)
* **GitHub-Style Calendar Grid**: Grid peta kehadiran bulanan interaktif berkode warna status presensi (Hijau, Kuning, Merah, Biru, Abu-abu).
* **Slide-over Panel**: Edit cepat kehadiran dengan mengklik sel tanggal kalender.
* **WhatsApp Random Queue Delay**: Antrean asinkronus notifikasi absensi wali murid dengan jeda delay acak untuk mematuhi aturan anti-spam.
* **Ekspor Laporan**: Unduh laporan rekap kehadiran bulanan ke berkas **Excel Berwarna** (conditional formatting) dan **PDF Cetak A4**.

### 5. ⚖️ Dashboard Guru BK & Early Warning System (EWS) (`/bk`)
* **EWS Engine**: Otomatis mendeteksi siswa rawan dengan kriteria ketat: Alpha $\ge 3$ hari berturut-turut atau Terlambat $>5$ kali dalam sebulan.
* **Official PDF SP Generator**: Cetak Surat Panggilan Orang Tua resmi bertingkat (SP 1, SP 2, SP 3) dengan kop surat yayasan, detail pelanggaran, jadwal bimbingan konseling, dan kolom tanda tangan.
* **Log Konseling BK**: Pengarsipan catatan bimbingan konseling rahasia dengan pembatasan hak akses (hanya BK & Admin yang dapat menulis/mengedit).

### 6. ⚙️ Pengaturan Admin & cPanel Utilities (`/settings`)
* **Lifecycle Management**: Fitur kenaikan kelas massal dan kelulusan massal siswa kelas XII menjadi alumni (`aktif = false`).
* **cPanel Backup Exporter**: API backup database manual yang mengubah data relasi tabel Prisma langsung menjadi berkas SQL script siap pakai di phpMyAdmin cPanel tanpa perintah CLI `mysqldump`.
* **WhatsApp Diagnostics**: Widget monitor sisa saldo kuota Fonnte dan formulir pesan diagnostik langsung.

---

## 🛠️ TEKNOLOGI YANG DIGUNAKAN

### **Frontend & Framework**
* **React 19** & **Next.js 16** (Webpack Mode untuk isolasi modul SSR)
* **Tailwind CSS v4** (Desain responsif & modern)
* **Zustand** (State management)
* **Lucide React** (Kumpulan ikon premium)
* **Dexie.js** (Wrapper IndexedDB lokal)
* **@react-pdf/renderer** (Pembuatan PDF client-side)

### **Backend & Database**
* **Next.js Route Handlers** (API endpoints)
* **Prisma ORM** (Skema relasi database & kueri)
* **MySQL / MariaDB** (Penyimpanan database relasional)
* **JWT (JsonWebToken) & Bcrypt** (Autentikasi & enkripsi sandi)
* **Axios** (WhatsApp API integration)

## 📚 DOKUMENTASI LENGKAP

Seluruh dokumentasi proyek (PRD, SOP, spesifikasi fitur, arsitektur, database, panduan deploy, dll) tersimpan terpusat di folder **[`docs/`](docs/INDEX.md)**.

*   **[AGENTS.md](AGENTS.md)** — Panduan universal untuk AI agent (Claude, Gemini, Copilot, dll)
*   **[docs/INDEX.md](docs/INDEX.md)** — Daftar isi & navigasi seluruh dokumentasi
*   **[docs/PRD.md](docs/PRD.md)** — Product Requirements Document v3.7
*   **[docs/SOP.md](docs/SOP.md)** — SOP Implementasi & skema Prisma

---

## 🚀 PANDUAN MEMULAI PENGEMBANGAN LOKAL

### 1. Kloning Repositori
```bash
git clone https://github.com/smkarrahma/absensi.git
cd absensi/absensi_smk_ar_rahma
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables (`.env`)
Salin berkas `.env.example` ke `.env` dan lengkapi konfigurasi berikut:
```env
DATABASE_URL="mysql://username:password@localhost:3306/absensi_db"
JWT_SECRET="isi_kunci_jwt_rahasia_dan_panjang"
AES_SECRET_KEY="12345678901234567890123456789012" # Harus tepat 32 karakter
FONNTE_TOKEN="token_api_fonnte_anda"
```

### 4. Sinkronisasi Database (Prisma)
Jalankan perintah prisma untuk memvalidasi dan migrasi database:
```bash
npx prisma generate
npx prisma db seed # Mengisi data default Pengaturan, HariLibur, dan Admin Awal
```

### 5. Jalankan Server Pengembangan (Webpack Mode)
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:3000`.

---

## 📦 PRODUKSI & DEPLOYMENT cPANEL
Untuk merilis aplikasi Next.js ini ke lingkungan hosting produksi cPanel (dengan Node.js Selector / Phusion Passenger):
1. Jalankan proses kompilasi build produksi:
   ```bash
   npm run build
   ```
2. Ikuti instruksi detail mengenai pemetaan berkas startup `server.js` dan pengaturan virtual environment yang ada di berkas panduan **[docs/DEPLOY.md](docs/DEPLOY.md)**.
