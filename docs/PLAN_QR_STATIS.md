# Rencana Implementasi Sistem Absensi QR Statis (Siswa di-scan Guru Piket)

## A. Alur Kerja Kehadiran QR Statis

1. **Format QR Code Statis:**
   - QR Code hanya berisi NISN siswa yang dienkripsi menggunakan algoritma `AES-256-CBC` dengan key `JWT_SECRET` dari file `.env`.
   - Data payload terenkripsi: `NISN`. Tidak menggunakan timestamp kedaluwarsa karena kartu bersifat statis dan permanen.

2. **Scanner Kamera Guru Piket (`src/app/(dashboard)/scan/page.tsx`):**
   - Integrasikan scanner kamera di halaman Guru Piket menggunakan library `html5-qrcode` yang kompatibel dengan browser Android dan iOS.
   - Mode default pemindaian kamera aktif. Begitu QR terdeteksi, langsung kirim payload ke API absensi `/api/attendance/scan`.
   - Berikan feedback audio bip dan getar (haptic feedback) pada device Guru Piket saat pemindaian sukses/gagal.
   - Durasi pembatalan pencatatan (cancel window) diperpendek dari **30 detik menjadi 10 detik**.

3. **Logika API Absensi (`src/app/api/attendance/scan/route.ts`):**
   - Mengubah otorisasi endpoint agar hanya dapat diakses oleh peran `ADMIN` atau `GURU` (yang bertugas sebagai Piket).
   - Melakukan dekripsi token QR untuk mendapatkan data `NISN`.
   - Mengambil pengaturan `jam_masuk` dan `jam_toleransi` dari database SQL.
   - **Validasi Waktu Absensi:**
     - `jamSekarang <= jamMasuk`: Status otomatis **HADIR**.
     - `jamMasuk < jamSekarang <= jamToleransi`: Status otomatis **TERLAMBAT**.
     - `jamToleransi < jamSekarang <= jamToleransi + 1 jam`: Pemindaian QR ditolak, muncul error: *"Batas scan QR berakhir. Wajib absen manual oleh Guru Piket."* Guru harus mencatat secara manual lewat tombol di dashboard.
     - `jamSekarang > jamToleransi + 1 jam`: Pemindaian ditolak secara mutlak, muncul error: *"Batas kehadiran telah berakhir. Siswa tercatat ALPHA."* Siswa otomatis masuk status **ALPHA** dan tidak bisa diabsenkan lagi.

4. **Cetak Kartu Siswa (`src/components/pdf/KartuSiswaPdf.tsx`):**
   - Layout PDF berukuran ID Card standar (`85.6mm x 54mm`) tanpa foto siswa.
   - Berisi logo sekolah, nama sekolah, nama siswa, NISN, kelas, dan QR Code terenkripsi.
   - Diintegrasikan di halaman `/students` (Admin/Guru):
     - Cetak per siswa (tombol cetak di baris tabel siswa).
     - Cetak per kelas (cetak massal seluruh siswa kelas tersebut dalam format PDF A4 berisi grid kartu siap potong).

---

## B. Rencana Perubahan File & Struktur

1. **`prisma/schema.prisma`**
   - Tidak memerlukan perubahan skema karena NISN terenkripsi statis bisa langsung dipetakan ke data siswa yang sudah ada.

2. **`src/lib/token-helper.ts`**
   - Tambahkan helper untuk enkripsi dan dekripsi NISN statis menggunakan `AES-256-CBC` dengan key `JWT_SECRET`.

3. **`src/app/api/attendance/scan/route.ts`**
   - Sesuaikan validasi peran pengirim (hanya ADMIN/GURU piket).
   - Dekripsi payload QR (dapatkan NISN) dan cari siswa di DB.
   - Terapkan validasi waktu absensi (HADIR / TERLAMBAT / Wajib Manual / Auto-ALPHA).

4. **`src/app/(dashboard)/scan/page.tsx`**
   - Tambahkan komponen pemindai kamera (`html5-qrcode`) di tab "Pencatatan Kehadiran".
   - Integrasikan toggle kamera depan/belakang, skeleton loader, bip audio, dan durasi pembatalan 10s.

5. **`src/components/pdf/KartuSiswaPdf.tsx`** (Baru)
   - Buat dokumen PDF siap cetak ID Card.

6. **`src/app/(dashboard)/students/page.tsx`**
   - Tambahkan aksi "Cetak Kartu" (tunggal) dan "Cetak Semua Kartu Kelas" (massal).
