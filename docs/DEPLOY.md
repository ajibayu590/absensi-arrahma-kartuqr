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
2. Buat database baru, contoh: `smkamisc_absen` (sesuai `DATABASE_URL` di env).
3. Buat pengguna database baru, contoh: `smkamisc_absen`, dengan sandi yang kuat (sesuai `DATABASE_URL` di env).
4. Hubungkan pengguna tersebut ke database dengan memberikan izin penuh (**ALL PRIVILEGES**).
5. Masuk ke **phpMyAdmin**, pilih database `smkamisc_absen`, lalu pilih tab **Import**.
6. Ekspor skema database Anda menggunakan fitur eksport di sistem Absensi (Admin menu -> Ekspor Database `.sql`), kemudian import berkas tersebut ke phpMyAdmin cPanel.

---

## 🚀 LANGKAH 2: SETUP NODE.JS APPLICATION DI cPANEL
1. Di cPanel, cari menu **Setup Node.js App**.
2. Klik tombol **Create Application**.
3. Isi parameter aplikasi sebagai berikut:
   * **Node.js version**: Pilih versi terbaru yang stabil (direkomendasikan versi **18.x** atau **20.x**).
   * **Application Mode**: Pilih `Production`.
   * **Application root**: Isi nama folder tempat Anda akan mengunggah berkas aplikasi (contoh: `/home/smkamisc/absen.smkami.sch.id`).
   * **Application URL**: Pilih subdomain/domain tujuan deployment Anda (contoh: `absen.smkami.sch.id`).
   * **Application startup file**: Isi `server.js` (ini akan menunjuk ke berkas wrapper server penanganan port).
4. Klik **Create**. cPanel akan memuat status aplikasi dan menyediakan perintah Command Line virtual environment (contoh: `source /home/smkamisc/nodevenv/absen.smkami.sch.id/20/bin/activate && cd /home/smkamisc/absen.smkami.sch.id`).

### Konfigurasi Environment Variables di cPanel GUI
Setelah aplikasi dibuat, tambahkan variabel lingkungan berikut di bagian **Environment variables** pada GUI Node.js App di cPanel:

| Name                    | Value                                                |
| :---------------------- | :--------------------------------------------------- |
| `AUTO_ALPHA_HOUR`       | `7`                                                  |
| `AUTO_ALPHA_INTERVAL_MS`| `30000`                                              |
| `AUTO_ALPHA_MINUTE`     | `10`                                                 |
| `DATABASE_URL`          | `mysql://smkamisc_absen:Smkamioke@localhost:3306/smkamisc_absen` (Ganti dengan kredensial DB Anda) |
| `JWT_EXPIRES_IN`        | `7d`                                                 |
| `JWT_SECRET`            | `6zf6P87few-81MRk1uz-zi6fFujFU0_D8qqQoDNyeJB1OjkATV7A3GsF6aKOVjI` (Ganti dengan token acak dan panjang) |
| `SCHEDULER_SECRET`      | `absensi_smk_ar_rahma_scheduler_secret_key_2026`     |
| `NODE_ENV`              | `production`                                         |
| `FONNTE_TOKEN`          | `isi_token_fonnte_disini_jika_ada` (Opsional, jika tidak dikelola dari Pengaturan) |

---

## 📂 LANGKAH 3: UNGGAH BERKAS APLIKASI
1. Kompres seluruh isi folder proyek Anda ke format `.zip` **KECUALI** folder `node_modules`, `.next`, `.git`, dan berkas `.env` (atau `.env.local` lokal Anda).
   *   **PENTING (CloudLinux Node.js Selector)**: cPanel Node.js Selector membutuhkan folder `node_modules` dibuat secara terpisah di virtual environment-nya. **PASTIKAN Anda tidak menyertakan folder `node_modules` dalam berkas `.zip` yang diunggah.**
2. Unggah berkas `.zip` tersebut menggunakan **File Manager** cPanel ke folder root aplikasi (misalnya: `/home/smkamisc/absen.smkami.sch.id`).
3. Ekstrak berkas tersebut di cPanel File Manager.
   *   **CATATAN**: Anda tidak perlu membuat file `.env` di server, karena semua Environment Variables sudah diatur via GUI cPanel di Langkah 2.

---

## 📦 LANGKAH 4: INSTALASI DAN BUILD
Setelah mengunggah berkas aplikasi, Anda perlu menginstal dependensi dan melakukan build.

### Opsi A: Menggunakan Terminal cPanel (Direkomendasikan)
Jika Anda memiliki akses ke Terminal cPanel atau SSH, ini adalah metode yang paling fleksibel:
1. Masuk ke **Terminal** cPanel (atau SSH ke server Anda).
2. Aktifkan virtual environment Node.js dengan menyalin perintah yang diberikan cPanel di menu *Setup Node.js App*. Contoh:
   ```bash
   source /home/smkamisc/nodevenv/absen.smkami.sch.id/20/bin/activate && cd /home/smkamisc/absen.smkami.sch.id
   ```
3. Lakukan instalasi seluruh paket dependensi:
   ```bash
   npm install --omit=dev
   # Atau jika ada dependensi dev yang dibutuhkan saat build (seperti typescript):
   # npm install
   ```
4. Jalankan generate skema Prisma agar client Prisma sinkron dengan database:
   ```bash
   npx prisma generate
   ```
5. Lakukan kompilasi build produksi Next.js menggunakan Webpack (agar modul server-side `@react-pdf/renderer` ter-compile dengan benar):
   ```bash
   npm run build
   ```

### Opsi B: Menggunakan GUI Node.js App (Jika Terminal Tidak Koneksi/Akses Terbatas)
Jika Anda tidak bisa konek ke Terminal cPanel, Anda bisa menggunakan fitur di GUI Node.js App:
1. Kembali ke menu **Setup Node.js App** di cPanel.
2. Di bawah detail aplikasi Anda, cari tombol **"Run NPM Install"**. Klik ini untuk menginstal dependensi.
3. Untuk menjalankan `npx prisma generate` dan `npm run build`:
   * Klik tombol **"Run JS Script"**.
   * Di pop-up yang muncul, untuk perintah `npx prisma generate`, isi:
     * **File**: `node_modules/.bin/prisma`
     * **Arguments**: `generate`
     * Klik **Run**.
   * Ulangi langkah ini untuk perintah `npm run build`:
     * **File**: `node_modules/.bin/npm`
     * **Arguments**: `run build`
     * Klik **Run**.

### Setelah Instalasi & Build:
1. Kembali ke menu **Setup Node.js App** di cPanel, lalu klik tombol **Restart** untuk menerapkan perubahan aplikasi.

---

## ⏰ LANGKAH 5: CRON JOB UNTUK SYNC (OPSIONAL)
Untuk performa optimal atau tugas-tugas terjadwal, Anda bisa menambahkan Cron Job di cPanel:
1. Buka menu **Cron Jobs** di cPanel.
2. Tambahkan tugas baru setiap jam atau sesuai kebutuhan.
3. Perintah eksekusi (panggil API sync atau maintenance internal jika ada):
   ```bash
   curl -sL https://absen.smkami.sch.id/api/admin/lifecycle --data "action=cron_sync"
   ```

---

## 🔒 CATATAN PENTING SECURITY & PERFORMANCE
* **Keamanan Kunci**: Karena environment variables sudah diatur via GUI, tidak perlu lagi mengelola file `.env` di root aplikasi cPanel.
* **WhatsApp Token**: Anda dapat memperbarui token Fonnte sewaktu-waktu secara real-time langsung melalui antarmuka **Pengaturan Sistem** di dashboard Admin tanpa perlu mengubah variabel di cPanel GUI dan merestart server.
* **Database Backup**: Selalu lakukan ekspor backup berkas `.sql` secara rutin dari dashboard Admin dan simpan di penyimpanan eksternal yang aman.
