# Panduan Deploy Production Next.js di Hosting cPanel — Sistem Absensi SMK Ar Rahma

Dokumen ini menjelaskan langkah-langkah lengkap untuk melakukan deployment aplikasi absensi Next.js (dengan Prisma ORM & MySQL) pada lingkungan hosting cPanel yang dilengkapi dengan **Node.js Selector (Phusion Passenger)**.

---

## 📋 PERSYARATAN UTAMA (PREREQUISITES)
1. **cPanel Hosting** dengan dukungan fitur Node.js Selector.
2. Akses ke **Terminal** cPanel (opsional, tapi sangat disarankan) atau SSH.
3. Database **MySQL / MariaDB** pada cPanel (dan akses ke phpMyAdmin).
4. Domain/Subdomain tujuan (misalnya: `absensi.smkami.sch.id`).

---

## 🛠️ LANGKAH 1: PERSIAPAN DATABASE DI cPANEL
1. Masuk ke cPanel dan cari menu **MySQL® Databases**.
2. Buat database baru, misalnya: `arrahma_absensi`.
3. Buat pengguna database baru, misalnya: `arrahma_dbuser`, dengan sandi yang kuat.
4. Hubungkan pengguna tersebut ke database dengan memberikan izin penuh (**ALL PRIVILEGES**).
5. Masuk ke **phpMyAdmin**, pilih database `arrahma_absensi`, lalu pilih tab **Import**.
6. Ekspor skema database Anda menggunakan fitur eksport di sistem Absensi (Admin menu -> Ekspor Database `.sql`), kemudian import berkas tersebut ke phpMyAdmin cPanel.

---

## 🚀 LANGKAH 2: SETUP NODE.JS APPLICATION DI cPANEL
1. Di cPanel, cari menu **Setup Node.js App**.
2. Klik tombol **Create Application**.
3. Isi parameter aplikasi sebagai berikut:
   * **Node.js version**: Pilih versi terbaru yang stabil (direkomendasikan versi **18.x** atau **20.x**).
   * **Application Mode**: Pilih `Production`.
   * **Application root**: Isi nama folder tempat Anda akan mengunggah berkas aplikasi (misal: `absensi_app`).
   * **Application URL**: Pilih subdomain/domain tujuan deployment Anda.
   * **Application startup file**: Isi `server.js` (ini akan menunjuk ke berkas wrapper server penanganan port).
4. Klik **Create**. cPanel akan memuat status aplikasi dan menyediakan perintah Command Line virtual environment (misalnya: `source /home/username/nodevenv/absensi_app/18/bin/activate && cd /home/username/absensi_app`).

---

## 📂 LANGKAH 3: UNGGAH BERKAS APLIKASI
1. Kompres seluruh isi folder proyek `project root` ke format `.zip` **KECUALI** folder `node_modules`, `.next`, `.git`, dan berkas `.env.local` (atau `.env` lokal Anda).
2. Unggah berkas `.zip` tersebut menggunakan **File Manager** cPanel ke folder root aplikasi (misalnya: `/home/username/absensi_app`).
3. Ekstrak berkas tersebut di cPanel File Manager.
4. Buat berkas baru bernama `.env` di folder root aplikasi (`/home/username/absensi_app/.env`) dan konfigurasikan nilainya untuk produksi:
   ```env
   # Ganti kredensial database sesuai database cPanel Anda
   DATABASE_URL="mysql://arrahma_dbuser:SandiKuatDatabase@localhost:3306/arrahma_absensi"

   # JWT secret token untuk enkripsi sesi login
   JWT_SECRET="ganti_dengan_token_acak_dan_panjang_minimal_32_karakter"

   # AES Secret key untuk enkripsi QR Code TV lobi (harus tepat 32 karakter hex)
   AES_SECRET_KEY="12345678901234567890123456789012"

   # WhatsApp Gateway Token (jika menggunakan env fallback)
   FONNTE_TOKEN="isi_token_fonnte_disini_jika_tidak_diatur_dari_settings"

   # Lingkungan aplikasi
   NODE_ENV="production"
   ```

---

## 📦 LANGKAH 4: INSTALASI DAN BUILD DARI TERMINAL cPANEL
1. Masuk ke **Terminal** cPanel (atau SSH ke server Anda).
2. Aktifkan virtual environment Node.js dengan menyalin perintah yang diberikan cPanel di menu *Setup Node.js App* tadi. Contoh:
   ```bash
   source /home/username/nodevenv/absensi_app/18/bin/activate && cd /home/username/absensi_app
   ```
3. Lakukan instalasi seluruh paket dependensi:
   ```bash
   npm install --omit=dev
   # Atau jika ada dependensi dev yang dibutuhkan saat build (seperti typescript):
   npm install
   ```
4. Jalankan generate skema Prisma agar client Prisma sinkron dengan database:
   ```bash
   npx prisma generate
   ```
5. Lakukan kompilasi build produksi Next.js menggunakan Webpack (agar modul server-side `@react-pdf/renderer` ter-compile dengan benar):
   ```bash
   npm run build
   ```
6. Kembali ke menu **Setup Node.js App** di cPanel, lalu klik tombol **Restart** untuk menerapkan perubahan aplikasi.

---

## ⏰ LANGKAH 5: CRON JOB UNTUK SYNC (OPSIONAL)
Untuk performa optimal atau tugas-tugas terjadwal, Anda bisa menambahkan Cron Job di cPanel:
1. Buka menu **Cron Jobs** di cPanel.
2. Tambahkan tugas baru setiap jam atau sesuai kebutuhan.
3. Perintah eksekusi (panggil API sync atau maintenance internal jika ada):
   ```bash
   curl -sL https://absensi.smkami.sch.id/api/admin/lifecycle --data "action=cron_sync"
   ```

---

## 🔒 CATATAN PENTING SECURITY & PERFORMANCE
* **Keamanan Kunci**: Pastikan berkas `.env` di cPanel tidak memiliki hak akses publik (set permission ke `0600` atau `0640`).
* **WhatsApp Token**: Anda dapat memperbarui token Fonnte sewaktu-waktu secara real-time langsung melalui antarmuka **Pengaturan Sistem** di dashboard Admin tanpa perlu mengubah berkas `.env` dan merestart server.
* **Database Backup**: Selalu lakukan ekspor backup berkas `.sql` secara rutin dari dashboard Admin dan simpan di penyimpanan eksternal yang aman.
