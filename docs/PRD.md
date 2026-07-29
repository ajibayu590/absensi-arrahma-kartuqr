# Product Requirements Document (PRD) — Sistem Absensi SMK Ar Rahma (v3.10)

**Versi:** 3.10
**Tanggal:** 2026-07-04
**Penulis:** Kilo (AI Engineer)

---

## 1. Pendahuluan

Dokumen ini menjelaskan persyaratan fungsional dan non-fungsional untuk Sistem Absensi Siswa SMK Ar Rahma. Sistem ini adalah aplikasi web berbasis Next.js yang bertujuan untuk mengelola kehadiran siswa secara efisien menggunakan QR Code, geofencing GPS, notifikasi WhatsApp real-time, dan dashboard Role-Based Access Control (RBAC) untuk berbagai peran pengguna (Siswa, Guru Piket, Wali Kelas, Guru BK, Kepala Sekolah, Admin).

Versi 3.9 ini mencakup penambahan fitur import data master dari file XLSX untuk Kelas, Siswa, dan Guru, serta peningkatan UX notifikasi menjadi lebih modern dan konsisten, dan penyelesaian fase pengembangan `AUTO-ALPHA SCHEDULER & NOTIFIKASI ADMIN`.

---

## 2. Tujuan

1.  **Mempercepat proses absensi:** Mengurangi antrean dan waktu pencatatan kehadiran secara manual melalui pemindaian QR Code.
2.  **Meningkatkan akurasi data:** Memastikan data kehadiran tercatat dengan akurat melalui validasi lokasi (geofencing) dan waktu.
3.  **Memperbaiki komunikasi:** Memberikan notifikasi kehadiran real-time kepada orang tua/wali melalui WhatsApp.
4.  **Memudahkan monitoring:** Menyediakan dashboard informatif bagi pihak sekolah untuk memantau kehadiran siswa, kinerja guru piket, dan pelanggaran.
5.  **Memenuhi kebutuhan administrasi:** Menyediakan fitur CRUD data master, laporan, ekspor data, dan manajemen siklus tahun ajaran.
6.  **Memudahkan pengelolaan data awal:** Memungkinkan admin untuk mengimpor data master dalam jumlah besar melalui file XLSX.
7.  **Meningkatkan pengalaman pengguna:** Mengganti notifikasi `confirm()` bawaan browser dengan antarmuka yang lebih modern dan konsisten (menggunakan `react-hot-toast` custom modal).

---

## 3. Ruang Lingkup (Fitur Utama)

### Fase 1: Inisialisasi Proyek & Konfigurasi Basis Data (Selesai v3.7)
-   Inisialisasi Proyek Next.js (TypeScript, Tailwind, App Router).
-   Konfigurasi Prisma ORM & Database MySQL (skema Bahasa Indonesia).
-   Script Seeding & Global Settings (pengguna Admin, GPS sekolah, jam toleransi, hari libur).

### Fase 2: Portal Siswa, HP Scanner & Geolocation (F-SISWA) (Selesai v3.7)
-   Autentikasi Pengguna, Force Change Password & Sesi Tunggal.
-   Layout Halaman Portal HP Siswa (desain responsif, widget persentase, riwayat kehadiran).
-   Modul Pemindai Kamera & Audio/Haptic Feedback (Flash, ganti kamera, bip suara/getaran).
-   Validasi API Scan Absensi (rumus Haversine GPS, usia token QR).

### Fase 3: Layar TV Display QR & Real-time SSE Broadcast (F-DISP) (Selesai v3.7)
-   Token Generator Terenkripsi AES-256.
-   Arsitektur Server-Sent Events (SSE) Live Stream.
-   Layar TV Display QR `/display-qr` (dark-theme, QR dinamis, notifikasi live via SSE).

### Fase 4: Dashboard Guru Piket & Penyelamatan Offline (F-PIKET) (Selesai v3.7)
-   Antarmuka Pencarian Cepat & Satu-Klik Input Manual.
-   Integrasi IndexedDB Lokal Cache.
-   Background Auto-Sync Data Offline.

### Fase 5: Dashboard Wali Kelas & Notifikasi WhatsApp (F-WALI & F-WA) (Selesai v3.7)
-   Grid Kalender Kehadiran & Slide-over Panel (detail & edit status cepat).
-   Ekspor Excel Berwarna & PDF Cetak A4.
-   Integrasi API WhatsApp Gateway & Queue Delay.
-   Custom WA Broadcast & Draf Cepat Hubungi Ortu.

### Fase 6: Guru BK, EWS, & Kepala Sekolah (F-BK & F-KEPSEK) (Selesai v3.7)
-   Mesin Early Warning System (EWS) Guru BK.
-   Cetak Surat Panggilan PDF Resmi & Log Konseling Rahasia.
-   Executive Dashboard Kepala Sekolah (grafik tren, leaderboard kelas, pemantau guru piket).
-   Siklus Tahun Ajaran (Kenaikan Kelas & Alumni).

### Fase 7: Dashboard Admin, Audit Trail, Backup & cPanel (F-ADMIN) (Selesai v3.7)
-   CRUD Master Data & Regex Formatter Nomor WA.
-   Log Audit Aktivitas Admin.
-   Backup Database Manual SQL (cPanel Compatible).
-   Uji Coba WA Connector & Monitor Saldo Kuota.
-   Pengujian Sistem Menyeluruh & Panduan Deploy cPanel.

### Fase 8: Kustomisasi & Perbaikan Operasional (GURU & SISTEM) (Selesai v3.7)
-   Isolasi Database Proyek Sendiri.
-   Integrasi Dual-Tema (Siang & Malam).
-   Perbaikan Bug Race Condition IndexedDB.
-   Kelola Pengguna (Non-Siswa) & Penjadwalan Piket (Admin).
-   Reset Kata Sandi Siswa oleh Admin.
-   Optimalisasi Jarak Pindai QR Code (2 Meter).
-   Perbaikan Hak Akses Role Wali Kelas (GURU) pada Dashboard & Laporan.
-   Rekapitulasi Lanjutan & Audit Keamanan (Update v3.7).

### Fase 9: AUTO-ALPHA SCHEDULER & NOTIFIKASI ADMIN (Selesai v3.8)
-   **Sub-Fase 9.1: Scheduler Auto-Alpha Terkonfigurasi via Environment (Selesai)**
    -   Tambahkan variabel `AUTO_ALPHA_HOUR`, `AUTO_ALPHA_MINUTE`, dan `AUTO_ALPHA_INTERVAL_MS` di `.env`.
    -   Modifikasi `server.js` untuk menjalankan `setInterval` scheduler yang membaca konfigurasi dari env vars.
    -   Implementasi `schedulerTick()` dengan deteksi waktu WIB dan reset harian `autoAlphaTriggeredToday`.
    -   Implementasi `triggerAutoAlpha()` yang memanggil endpoint `/api/attendance/auto-alpha` via fetch internal.
    -   Pastikan scheduler hanya trigger sekali per hari dalam jendela toleransi 20 menit.
-   **Sub-Fase 9.2: Notifikasi Pop-up Admin & Trigger Manual Alpha (Selesai)**
    -   Tambahkan state `processingAlpha` dan fungsi `handleManualAlpha()` di `src/app/(dashboard)/page.tsx`.
    -   Gunakan `react-hot-toast` custom modal untuk konfirmasi sebelum memproses (mengikuti pola destructive action).
    -   Panggil API `/api/attendance/auto-alpha` dengan `force: true` dan tampilkan feedback via `react-hot-toast`.
    -   Tambahkan banner peringatan amber yang muncul ketika `data.peran === "ADMIN"` dan `data.ringkasanHariIni.belumAbsen > 0`.
    -   Banner menampilkan jumlah siswa belum absen dan tombol "Proses Alpha Manual" dengan loading state.
    -   Setelah sukses, dashboard otomatis refresh (`fetchSummary()`) dan banner hilang karena `belumAbsen` menjadi 0.
-   **Sub-Fase 9.3: Security Hardening & Bug Fix (Audit) (Selesai)**
    -   Tambahkan autentikasi header `X-Scheduler-Secret` pada endpoint `/api/attendance/auto-alpha` untuk mencegah akses tanpa otorisasi (CRITICAL).
    -   Tambahkan `isProcessing` lock di `src/lib/auto-alpha.ts` untuk mencegah race condition dari eksekusi konkuren (WARNING).
    -   Perbaiki perhitungan tanggal WIB di `server.js` menggunakan `wibTime.toISOString().split("T")[0]` agar konsisten dengan timezone server (WARNING).
    -   Tambahkan variabel `SCHEDULER_SECRET` di `.env` dan header `X-Scheduler-Secret` pada request internal scheduler di `server.js`.
    -   Verifikasi build production berhasil tanpa error setelah semua perbaikan diterapkan.

### Fase 11: Perbaikan Geofencing Siswa (Baru v3.10)
-   **Sub-Fase 11.1: Kondisionalisasi Akses GPS Siswa**
    -   Siswa hanya akan diminta untuk mengaktifkan dan mengirimkan data lokasi GPS jika fitur geofencing diaktifkan oleh Admin pada pengaturan sistem.
    -   Jika geofencing dinonaktifkan, aplikasi siswa tidak akan meminta akses lokasi GPS dan akan mengirimkan nilai `null` untuk koordinat lokasi ke API absensi.
    -   Pesan di antarmuka pemindai QR siswa akan diperbarui secara dinamis untuk mencerminkan apakah GPS diperlukan atau tidak.
-   **Sub-Fase 10.1: Implementasi Import Data Kelas dari XLSX**
    -   Admin dapat mengimpor data master kelas dari file XLSX.
    -   Sistem akan memvalidasi kolom `nama`, `tahunAjaran`, dan `idGuru` (lookup guru berdasarkan nama/NIP).
    -   Sistem akan melakukan bulk upsert data ke database.
    -   Memberikan feedback yang jelas terkait status import (sukses/gagal, detail error per baris).
-   **Sub-Fase 10.2: Implementasi Import Data Siswa dari XLSX**
    -   Admin dapat mengimpor data master siswa dari file XLSX.
    -   Sistem akan memvalidasi kolom `NISN`, `Nama`, `ID Kelas` (lookup kelas berdasarkan nama), `TeleponOrangTua`, `SedangMagang`.
    -   Otomatis membuat akun `Pengguna` baru untuk setiap siswa dengan kata sandi default NISN.
    -   Sistem akan melakukan bulk upsert data ke database.
    -   Memberikan feedback yang jelas terkait status import.
-   **Sub-Fase 10.3: Implementasi Import Data Guru/Staff dari XLSX**
    -   Admin dapat mengimpor data master guru/staff dari file XLSX.
    -   Sistem akan memvalidasi kolom `Nama`, `Email`, `NIP` (opsional), `Telepon` (opsional), `Peran`, `isBk`.
    -   Otomatis membuat akun `Pengguna` baru untuk setiap guru/staff.
    -   Sistem akan melakukan bulk upsert data ke database.
    -   Memberikan feedback yang jelas terkait status import.

---

## 4. Persyaratan Fungsional

### 4.1. Manajemen Konfirmasi UI (Revisi v3.8)
-   **RF001:** Semua penggunaan `window.confirm()` bawaan browser harus diganti dengan `react-hot-toast` custom modal atau komponen modal UI kustom lainnya yang menyediakan pengalaman pengguna yang lebih modern dan konsisten.
-   **RF002:** Modal konfirmasi harus menampilkan pesan yang jelas dan relevan dengan tindakan yang akan dilakukan (misalnya, penghapusan data, reset kata sandi, proses massal).
-   **RF003:** Modal konfirmasi harus memiliki tombol "Ya" (atau konfirmasi positif) dan "Batal" (atau konfirmasi negatif) yang jelas.
-   **RF004:** Tindakan konfirmasi (misalnya, "Ya, Hapus") harus memicu fungsi yang relevan setelah konfirmasi pengguna.
-   **RF005:** Implementasi `react-hot-toast` custom modal ini akan diterapkan pada halaman-halaman berikut:
    -   `src/app/(dashboard)/page.tsx` (untuk "Proses Alpha Manual")
    -   `src/app/(dashboard)/students/page.tsx` (untuk "Hapus Siswa" dan "Reset Kata Sandi Siswa")
    -   `src/app/(dashboard)/teachers/page.tsx` (untuk "Hapus Akun Guru/Staf")
    -   `src/app/(dashboard)/picket-schedules/page.tsx` (untuk "Hapus Jadwal Piket")
    -   `src/app/(dashboard)/settings/page.tsx` (untuk "Kenaikan Kelas Massal", "Kelulusan Siswa (Alumni)", "Kirim Laporan Harian WA", dan "Hapus Data Absensi Hari Ini")
    -   `src/app/(dashboard)/classes/page.tsx` (untuk "Hapus Kelas")
    -   `src/app/(dashboard)/reports/page.tsx` (untuk "Hapus Catatan Absensi")

### 4.2. Pengelolaan Pengaturan Sistem (Admin)
-   **RF006:** Admin dapat mengatur koordinat Latitude dan Longitude sekolah untuk validasi geofencing.
-   **RF007:** Admin dapat mengatur radius geofencing dalam meter.
-   **RF008:** Admin dapat mengaktifkan/menonaktifkan fitur geofencing.
-   **RF009:** Admin dapat mengatur jam masuk sekolah dan batas toleransi keterlambatan.
-   **RF010:** Admin dapat mengatur token dan URL WhatsApp Gateway.
-   **RF011:** Admin dapat mengatur minimal dan maksimal jeda pengiriman pesan WhatsApp (delay acak).
-   **RF012:** Sistem harus menyediakan konsol status WhatsApp Gateway (tersambung/terputus, nama perangkat, sisa kuota) dan pesan error.
-   **RF013:** Admin dapat mengirim pesan uji coba ke nomor WhatsApp tertentu untuk mendiagnosis koneksi gateway.
-   **RF014:** Admin dapat mengunduh daftar pengguna (Guru/Staf) yang masih menggunakan kata sandi default/sementara.
-   **RF015:** Admin dapat memicu pengiriman laporan ringkas harian WhatsApp ke Wali Kelas secara manual.
-   **RF016:** Admin dapat menghapus seluruh data kehadiran dan log WhatsApp untuk hari ini (fitur reset/ulang data).

### 4.3. Siklus Tahun Ajaran (Admin)
-   **RF017:** Admin dapat melakukan kenaikan kelas massal siswa dari satu kelas ke kelas lain (misal: X RPL 1 ke XI RPL 1).
-   **RF018:** Admin dapat memproses kelulusan massal siswa kelas XII menjadi alumni (menonaktifkan akun login mereka secara otomatis).

### 4.4. Import Data Master (Admin) (Baru v3.9)
-   **RF019:** Admin dapat mengunggah file XLSX untuk mengimpor data master Kelas, Siswa, dan Guru/Staf.
-   **RF020:** Sistem harus memvalidasi format dan isi data XLSX sebelum diimpor.
-   **RF021:** Proses impor harus mendukung bulk upsert (insert atau update jika data sudah ada).
-   **RF022:** Sistem harus memberikan laporan hasil impor yang terperinci, termasuk baris yang berhasil diimpor dan baris yang gagal beserta alasan kegagalannya.
-   **RF023:** Data siswa yang diimpor otomatis akan membuat akun `Pengguna` dengan kata sandi default NISN dan status `isPasswordSementara: true`.
-   **RF024:** Data guru/staf yang diimpor otomatis akan membuat akun `Pengguna` dengan kata sandi default dan status `isPasswordSementara: true`.

### 4.5. Kontrol Akses GPS Siswa (Baru v3.10)
-   **RF025:** Aplikasi portal siswa secara otomatis akan mendeteksi status `gps_geofencing_aktif` dari pengaturan sistem. Jika `gps_geofencing_aktif` adalah `false`, aplikasi tidak akan meminta atau menggunakan lokasi GPS perangkat siswa.
-   **RF026:** Jika `gps_geofencing_aktif` adalah `true`, aplikasi akan meminta izin lokasi GPS dari perangkat siswa dan mengirimkannya bersama data absensi.
-   **RF027:** Antarmuka pemindai QR siswa harus secara dinamis menampilkan pesan yang relevan mengenai kebutuhan GPS berdasarkan status `gps_geofencing_aktif`.

---

## 5. Persyaratan Non-Fungsional

### 5.1. Performa
-   **NP001:** Waktu respons API untuk absensi real-time harus < 500ms.
-   **NP002:** Pemuatan dashboard statistik harus < 3 detik.
-   **NP003:** Proses ekspor Excel/PDF harus < 10 detik untuk 1000 data siswa.
-   **NP004:** Auto-alpha scheduler harus berjalan di background tanpa mengganggu kinerja aplikasi utama.
-   **NP005:** Proses impor XLSX harus efisien dan dapat menangani file dengan ratusan hingga ribuan baris dalam waktu yang wajar (< 30 detik).

### 5.2. Keamanan
-   **NP006:** Autentikasi JWT dengan penyimpanan cookie `httpOnly`.
-   **NP007:** Hashing kata sandi menggunakan `bcrypt`.
-   **NP008:** Validasi input untuk mencegah XSS, SQL Injection, dll., termasuk validasi data dari file XLSX yang diimpor.
-   **NP009:** Autorisasi berbasis peran (RBAC) diterapkan di setiap API dan komponen UI.
-   **NP010:** `X-Scheduler-Secret` untuk otentikasi internal scheduler.
-   **NP011:** Mekanisme `isProcessing` lock untuk mencegah race condition pada eksekusi tugas kritikal (misal: auto-alpha, import massal).
-   **NP012:** Log Audit Admin untuk merekam tindakan krusial.

### 5.3. Skalabilitas
-   **NP013:** Database skema didesain untuk pertumbuhan data kehadiran siswa yang besar.
-   **NP014:** Next.js API Routes menggunakan serverless functions untuk skala otomatis.
-   **NP015:** Notifikasi WhatsApp menggunakan antrean asinkron dengan delay acak untuk menghindari pemblokiran.

### 5.4. Keterpeliharaan
-   **NP016:** Kode harus bersih, modular, dan mengikuti standar Next.js/TypeScript.
-   **NP017:** Dokumentasi (SOP.md, PRD.md, TASK.md) harus selalu terbarui.
-   **NP018:** Penggunaan variabel lingkungan untuk konfigurasi sensitif.

### 5.5. Pengalaman Pengguna (UX)
-   **NP019:** Antarmuka responsif dan ramah seluler untuk portal siswa.
-   **NP020:** Desain konsisten dengan Tailwind CSS (dark/light theme).
-   **NP021:** Notifikasi dan feedback pengguna yang jelas (toast, spinner).
-   **NP022:** Transisi UI yang halus dan cepat.
-   **NP023:** Penggunaan `react-hot-toast` custom modal untuk konfirmasi aksi penting, menggantikan `window.confirm()` bawaan browser.
-   **NP024:** Antarmuka impor XLSX yang intuitif dengan template yang jelas.
-   **NP025:** Pesan di antarmuka pemindai QR siswa harus secara dinamis menyesuaikan apakah GPS diperlukan atau tidak berdasarkan pengaturan geofencing.

---

## 6. Model Data (Dari `prisma/schema.prisma`)

*(Lihat `docs/DATABASE.md` dan `prisma/schema.prisma` untuk detail lengkap)*

-   `Pengguna` (User)
-   `Kelas` (Class)
-   `Guru` (Teacher)
-   `Siswa` (Student)
-   `Kehadiran` (Attendance)
-   `LogWa` (WhatsApp Log)
-   `Pengaturan` (Settings)
-   `HariLibur` (Holiday)
-   `LogAuditAdmin` (Admin Audit Log)
-   `LogKonselingBk` (Counseling Log)
-   `JadwalPiket` (Picket Schedule)
-   `DispensasiKeterlambatan` (Late Dispensasi)

---

## 7. Desain Antarmuka Pengguna (UI)

*(Lihat `docs/ARSITEKTUR.md` untuk gambaran umum)*

-   **Dashboard Admin:** Statistik kehadiran, monitoring guru piket, kontrol pengaturan sistem.
-   **Dashboard Wali Kelas:** Rekap kehadiran bulanan, daftar siswa alpha, fitur broadcast WA.
-   **Dashboard Guru Piket:** Absensi manual, daftar siswa, sinkronisasi offline.
-   **Portal Siswa:** Pemindai QR Code, riwayat kehadiran pribadi.
-   **Layar TV:** Display QR Code dinamis, notifikasi kehadiran real-time.
-   **Halaman Master Data (Kelas, Siswa, Guru):** Tambahan tombol "Import XLSX" dengan modal untuk mengunggah file dan menampilkan hasil impor.

---

## 8. Alur Kerja Pengguna (User Flow)

*(Lihat `docs/ALUR_KERJA.md` dan `docs/SISWA.md`, `docs/GURU_PIKET.md`, dst. untuk detail)*

1.  **Siswa:** Login -> Buka portal HP -> Scan QR Code di TV -> Notifikasi sukses/gagal.
2.  **Guru Piket:** Login -> Dashboard -> Absensi manual/Verifikasi dispensasi -> Cek status siswa.
3.  **Wali Kelas:** Login -> Dashboard -> Lihat rekap kelas -> Ekspor laporan/Kirim broadcast WA.
4.  **Admin:** Login -> Dashboard -> Kelola master data/pengaturan sistem/siklus tahun ajaran -> Monitor sistem.
    -   **Admin (Import Data):** Buka halaman master data (Kelas/Siswa/Guru) -> Klik "Import XLSX" -> Unggah file -> Review hasil import -> Konfirmasi.
5.  **Kepala Sekolah:** Login -> Dashboard -> Pantau ringkasan eksekutif.

---

## 9. Metrik Keberhasilan

-   **Kecepatan Absensi:** Rata-rata waktu absensi < 5 detik per siswa.
-   **Tingkat Akurasi:** Data kehadiran 99% akurat (sesuai lokasi/waktu).
-   **Reliabilitas Notifikasi WA:** Tingkat pengiriman pesan WA > 95%.
-   **Adopsi Fitur:** > 80% guru piket menggunakan fitur absensi manual.
-   **Uptime Sistem:** > 99.9% (server aplikasi dan WA Gateway).
-   **Efisiensi Import:** Data master 1000 baris dapat diimpor dalam < 30 detik dengan akurasi > 98%.

---

## 10. Non-Goals

-   Integrasi dengan sistem informasi akademik (SIAKAD) pihak ketiga.
-   Pengembangan aplikasi mobile native (saat ini hanya PWA web-based).
-   Sistem penjadwalan pelajaran yang kompleks.
-   Fitur chat individual via WhatsApp di luar notifikasi.
-   Pembayaran atau modul keuangan lainnya.


## 1. Pendahuluan

Dokumen ini menjelaskan persyaratan fungsional dan non-fungsional untuk Sistem Absensi Siswa SMK Ar Rahma. Sistem ini adalah aplikasi web berbasis Next.js yang bertujuan untuk mengelola kehadiran siswa secara efisien menggunakan QR Code, geofencing GPS, notifikasi WhatsApp real-time, dan dashboard Role-Based Access Control (RBAC) untuk berbagai peran pengguna (Siswa, Guru Piket, Wali Kelas, Guru BK, Kepala Sekolah, Admin).

Versi 3.8 ini mencakup peningkatan UX notifikasi menjadi lebih modern dan konsisten, serta penyelesaian fase pengembangan `AUTO-ALPHA SCHEDULER & NOTIFIKASI ADMIN`.

---

## 2. Tujuan

1.  **Mempercepat proses absensi:** Mengurangi antrean dan waktu pencatatan kehadiran secara manual melalui pemindaian QR Code.
2.  **Meningkatkan akurasi data:** Memastikan data kehadiran tercatat dengan akurat melalui validasi lokasi (geofencing) dan waktu.
3.  **Memperbaiki komunikasi:** Memberikan notifikasi kehadiran real-time kepada orang tua/wali melalui WhatsApp.
4.  **Memudahkan monitoring:** Menyediakan dashboard informatif bagi pihak sekolah untuk memantau kehadiran siswa, kinerja guru piket, dan pelanggaran.
5.  **Memenuhi kebutuhan administrasi:** Menyediakan fitur CRUD data master, laporan, ekspor data, dan manajemen siklus tahun ajaran.
6.  **Meningkatkan pengalaman pengguna:** Mengganti notifikasi `confirm()` bawaan browser dengan antarmuka yang lebih modern dan konsisten (menggunakan `react-hot-toast` custom modal).

---

## 3. Ruang Lingkup (Fitur Utama)

### Fase 1: Inisialisasi Proyek & Konfigurasi Basis Data (Selesai v3.7)
-   Inisialisasi Proyek Next.js (TypeScript, Tailwind, App Router).
-   Konfigurasi Prisma ORM & Database MySQL (skema Bahasa Indonesia).
-   Script Seeding & Global Settings (pengguna Admin, GPS sekolah, jam toleransi, hari libur).

### Fase 2: Portal Siswa, HP Scanner & Geolocation (F-SISWA) (Selesai v3.7)
-   Autentikasi Pengguna, Force Change Password & Sesi Tunggal.
-   Layout Halaman Portal HP Siswa (desain responsif, widget persentase, riwayat kehadiran).
-   Modul Pemindai Kamera & Audio/Haptic Feedback (Flash, ganti kamera, bip suara/getaran).
-   Validasi API Scan Absensi (rumus Haversine GPS, usia token QR).

### Fase 3: Layar TV Display QR & Real-time SSE Broadcast (F-DISP) (Selesai v3.7)
-   Token Generator Terenkripsi AES-256.
-   Arsitektur Server-Sent Events (SSE) Live Stream.
-   Layar TV Display QR `/display-qr` (dark-theme, QR dinamis, notifikasi live via SSE).

### Fase 4: Dashboard Guru Piket & Penyelamatan Offline (F-PIKET) (Selesai v3.7)
-   Antarmuka Pencarian Cepat & Satu-Klik Input Manual.
-   Integrasi IndexedDB Lokal Cache.
-   Background Auto-Sync Data Offline.

### Fase 5: Dashboard Wali Kelas & Notifikasi WhatsApp (F-WALI & F-WA) (Selesai v3.7)
-   Grid Kalender Kehadiran & Slide-over Panel (detail & edit status cepat).
-   Ekspor Excel Berwarna & PDF Cetak A4.
-   Integrasi API WhatsApp Gateway & Queue Delay.
-   Custom WA Broadcast & Draf Cepat Hubungi Ortu.

### Fase 6: Guru BK, EWS, & Kepala Sekolah (F-BK & F-KEPSEK) (Selesai v3.7)
-   Mesin Early Warning System (EWS) Guru BK.
-   Cetak Surat Panggilan PDF Resmi & Log Konseling Rahasia.
-   Executive Dashboard Kepala Sekolah (grafik tren, leaderboard kelas, pemantau guru piket).
-   Siklus Tahun Ajaran (Kenaikan Kelas & Alumni).

### Fase 7: Dashboard Admin, Audit Trail, Backup & cPanel (F-ADMIN) (Selesai v3.7)
-   CRUD Master Data & Regex Formatter Nomor WA.
-   Log Audit Aktivitas Admin.
-   Backup Database Manual SQL (cPanel Compatible).
-   Uji Coba WA Connector & Monitor Saldo Kuota.
-   Pengujian Sistem Menyeluruh & Panduan Deploy cPanel.

### Fase 8: Kustomisasi & Perbaikan Operasional (GURU & SISTEM) (Selesai v3.7)
-   Isolasi Database Proyek Sendiri.
-   Integrasi Dual-Tema (Siang & Malam).
-   Perbaikan Bug Race Condition IndexedDB.
-   Kelola Pengguna (Non-Siswa) & Penjadwalan Piket (Admin).
-   Reset Kata Sandi Siswa oleh Admin.
-   Optimalisasi Jarak Pindai QR Code (2 Meter).
-   Perbaikan Hak Akses Role Wali Kelas (GURU) pada Dashboard & Laporan.
-   Rekapitulasi Lanjutan & Audit Keamanan (Update v3.7).

### Fase 9: AUTO-ALPHA SCHEDULER & NOTIFIKASI ADMIN (Selesai v3.8)
-   **Sub-Fase 9.1: Scheduler Auto-Alpha Terkonfigurasi via Environment (Selesai)**
    -   Tambahkan variabel `AUTO_ALPHA_HOUR`, `AUTO_ALPHA_MINUTE`, dan `AUTO_ALPHA_INTERVAL_MS` di `.env`.
    -   Modifikasi `server.js` untuk menjalankan `setInterval` scheduler yang membaca konfigurasi dari env vars.
    -   Implementasi `schedulerTick()` dengan deteksi waktu WIB dan reset harian `autoAlphaTriggeredToday`.
    -   Implementasi `triggerAutoAlpha()` yang memanggil endpoint `/api/attendance/auto-alpha` via fetch internal.
    -   Pastikan scheduler hanya trigger sekali per hari dalam jendela toleransi 20 menit.
-   **Sub-Fase 9.2: Notifikasi Pop-up Admin & Trigger Manual Alpha (Selesai)**
    -   Tambahkan state `processingAlpha` dan fungsi `handleManualAlpha()` di `src/app/(dashboard)/page.tsx`.
    -   Gunakan `react-hot-toast` custom modal untuk konfirmasi sebelum memproses (mengikuti pola destructive action).
    -   Panggil API `/api/attendance/auto-alpha` dengan `force: true` dan tampilkan feedback via `react-hot-toast`.
    -   Tambahkan banner peringatan amber yang muncul ketika `data.peran === "ADMIN"` dan `data.ringkasanHariIni.belumAbsen > 0`.
    -   Banner menampilkan jumlah siswa belum absen dan tombol "Proses Alpha Manual" dengan loading state.
    -   Setelah sukses, dashboard otomatis refresh (`fetchSummary()`) dan banner hilang karena `belumAbsen` menjadi 0.
-   **Sub-Fase 9.3: Security Hardening & Bug Fix (Audit) (Selesai)**
    -   Tambahkan autentikasi header `X-Scheduler-Secret` pada endpoint `/api/attendance/auto-alpha` untuk mencegah akses tanpa otorisasi (CRITICAL).
    -   Tambahkan `isProcessing` lock di `src/lib/auto-alpha.ts` untuk mencegah race condition dari eksekusi konkuren (WARNING).
    -   Perbaiki perhitungan tanggal WIB di `server.js` menggunakan `wibTime.toISOString().split("T")[0]` agar konsisten dengan timezone server (WARNING).
    -   Tambahkan variabel `SCHEDULER_SECRET` di `.env` dan header `X-Scheduler-Secret` pada request internal scheduler di `server.js`.
    -   Verifikasi build production berhasil tanpa error setelah semua perbaikan diterapkan.

---

## 4. Persyaratan Fungsional

### 4.1. Manajemen Konfirmasi UI (Revisi v3.8)
-   **RF001:** Semua penggunaan `window.confirm()` bawaan browser harus diganti dengan `react-hot-toast` custom modal atau komponen modal UI kustom lainnya yang menyediakan pengalaman pengguna yang lebih modern dan konsisten.
-   **RF002:** Modal konfirmasi harus menampilkan pesan yang jelas dan relevan dengan tindakan yang akan dilakukan (misalnya, penghapusan data, reset kata sandi, proses massal).
-   **RF003:** Modal konfirmasi harus memiliki tombol "Ya" (atau konfirmasi positif) dan "Batal" (atau konfirmasi negatif) yang jelas.
-   **RF004:** Tindakan konfirmasi (misalnya, "Ya, Hapus") harus memicu fungsi yang relevan setelah konfirmasi pengguna.
-   **RF005:** Implementasi `react-hot-toast` custom modal ini akan diterapkan pada halaman-halaman berikut:
    -   `src/app/(dashboard)/page.tsx` (untuk "Proses Alpha Manual")
    -   `src/app/(dashboard)/students/page.tsx` (untuk "Hapus Siswa" dan "Reset Kata Sandi Siswa")
    -   `src/app/(dashboard)/teachers/page.tsx` (untuk "Hapus Akun Guru/Staf")
    -   `src/app/(dashboard)/picket-schedules/page.tsx` (untuk "Hapus Jadwal Piket")
    -   `src/app/(dashboard)/settings/page.tsx` (untuk "Kenaikan Kelas Massal", "Kelulusan Siswa (Alumni)", "Kirim Laporan Harian WA", dan "Hapus Data Absensi Hari Ini")
    -   `src/app/(dashboard)/classes/page.tsx` (untuk "Hapus Kelas")
    -   `src/app/(dashboard)/reports/page.tsx` (untuk "Hapus Catatan Absensi")

### 4.2. Pengelolaan Pengaturan Sistem (Admin)
-   **RF006:** Admin dapat mengatur koordinat Latitude dan Longitude sekolah untuk validasi geofencing.
-   **RF007:** Admin dapat mengatur radius geofencing dalam meter.
-   **RF008:** Admin dapat mengaktifkan/menonaktifkan fitur geofencing.
-   **RF009:** Admin dapat mengatur jam masuk sekolah dan batas toleransi keterlambatan.
-   **RF010:** Admin dapat mengatur token dan URL WhatsApp Gateway.
-   **RF011:** Admin dapat mengatur minimal dan maksimal jeda pengiriman pesan WhatsApp (delay acak).
-   **RF012:** Sistem harus menyediakan konsol status WhatsApp Gateway (tersambung/terputus, nama perangkat, sisa kuota) dan pesan error.
-   **RF013:** Admin dapat mengirim pesan uji coba ke nomor WhatsApp tertentu untuk mendiagnosis koneksi gateway.
-   **RF014:** Admin dapat mengunduh daftar pengguna (Guru/Staf) yang masih menggunakan kata sandi default/sementara.
-   **RF015:** Admin dapat memicu pengiriman laporan ringkas harian WhatsApp ke Wali Kelas secara manual.
-   **RF016:** Admin dapat menghapus seluruh data kehadiran dan log WhatsApp untuk hari ini (fitur reset/ulang data).

### 4.3. Siklus Tahun Ajaran (Admin)
-   **RF017:** Admin dapat melakukan kenaikan kelas massal siswa dari satu kelas ke kelas lain (misal: X RPL 1 ke XI RPL 1).
-   **RF018:** Admin dapat memproses kelulusan massal siswa kelas XII menjadi alumni (menonaktifkan akun login mereka secara otomatis).

---

## 5. Persyaratan Non-Fungsional

### 5.1. Performa
-   **NP001:** Waktu respons API untuk absensi real-time harus < 500ms.
-   **NP002:** Pemuatan dashboard statistik harus < 3 detik.
-   **NP03:** Proses ekspor Excel/PDF harus < 10 detik untuk 1000 data siswa.
-   **NP004:** Auto-alpha scheduler harus berjalan di background tanpa mengganggu kinerja aplikasi utama.

### 5.2. Keamanan
-   **NP005:** Autentikasi JWT dengan penyimpanan cookie `httpOnly`.
-   **NP006:** Hashing kata sandi menggunakan `bcrypt`.
-   **NP007:** Validasi input untuk mencegah XSS, SQL Injection, dll.
-   **NP008:** Autorisasi berbasis peran (RBAC) diterapkan di setiap API dan komponen UI.
-   **NP009:** `X-Scheduler-Secret` untuk otentikasi internal scheduler.
-   **NP010:** Mekanisme `isProcessing` lock untuk mencegah race condition pada eksekusi tugas kritikal (misal: auto-alpha).
-   **NP011:** Log Audit Admin untuk merekam tindakan krusial.

### 5.3. Skalabilitas
-   **NP012:** Database skema didesain untuk pertumbuhan data kehadiran siswa yang besar.
-   **NP013:** Next.js API Routes menggunakan serverless functions untuk skala otomatis.
-   **NP014:** Notifikasi WhatsApp menggunakan antrean asinkron dengan delay acak untuk menghindari pemblokiran.

### 5.4. Keterpeliharaan
-   **NP015:** Kode harus bersih, modular, dan mengikuti standar Next.js/TypeScript.
-   **NP016:** Dokumentasi (SOP.md, PRD.md, TASK.md) harus selalu terbarui.
-   **NP017:** Penggunaan variabel lingkungan untuk konfigurasi sensitif.

### 5.5. Pengalaman Pengguna (UX)
-   **NP018:** Antarmuka responsif dan ramah seluler untuk portal siswa.
-   **NP019:** Desain konsisten dengan Tailwind CSS (dark/light theme).
-   **NP020:** Notifikasi dan feedback pengguna yang jelas (toast, spinner).
-   **NP021:** Transisi UI yang halus dan cepat.
-   **NP022:** Penggunaan `react-hot-toast` custom modal untuk konfirmasi aksi penting, menggantikan `window.confirm()` bawaan browser.

---

## 6. Model Data (Dari `prisma/schema.prisma`)

*(Lihat `docs/DATABASE.md` dan `prisma/schema.prisma` untuk detail lengkap)*

-   `Pengguna` (User)
-   `Kelas` (Class)
-   `Guru` (Teacher)
-   `Siswa` (Student)
-   `Kehadiran` (Attendance)
-   `LogWa` (WhatsApp Log)
-   `Pengaturan` (Settings)
-   `HariLibur` (Holiday)
-   `LogAuditAdmin` (Admin Audit Log)
-   `LogKonselingBk` (Counseling Log)
-   `JadwalPiket` (Picket Schedule)
-   `DispensasiKeterlambatan` (Late Dispensation)

---

## 7. Desain Antarmuka Pengguna (UI)

*(Lihat `docs/ARSITEKTUR.md` untuk gambaran umum)*

-   **Dashboard Admin:** Statistik kehadiran, monitoring guru piket, kontrol pengaturan sistem.
-   **Dashboard Wali Kelas:** Rekap kehadiran bulanan, daftar siswa alpha, fitur broadcast WA.
-   **Dashboard Guru Piket:** Absensi manual, daftar siswa, sinkronisasi offline.
-   **Portal Siswa:** Pemindai QR Code, riwayat kehadiran pribadi.
-   **Layar TV:** Display QR Code dinamis, notifikasi kehadiran real-time.

---

## 8. Alur Kerja Pengguna (User Flow)

*(Lihat `docs/ALUR_KERJA.md` dan `docs/SISWA.md`, `docs/GURU_PIKET.md`, dst. untuk detail)*

1.  **Siswa:** Login -> Buka portal HP -> Scan QR Code di TV -> Notifikasi sukses/gagal.
2.  **Guru Piket:** Login -> Dashboard -> Absensi manual/Verifikasi dispensasi -> Cek status siswa.
3.  **Wali Kelas:** Login -> Dashboard -> Lihat rekap kelas -> Ekspor laporan/Kirim broadcast WA.
4.  **Admin:** Login -> Dashboard -> Kelola master data/pengaturan sistem/siklus tahun ajaran -> Monitor sistem.
5.  **Kepala Sekolah:** Login -> Dashboard -> Pantau ringkasan eksekutif.

---

## 9. Metrik Keberhasilan

-   **Kecepatan Absensi:** Rata-rata waktu absensi < 5 detik per siswa.
-   **Tingkat Akurasi:** Data kehadiran 99% akurat (sesuai lokasi/waktu).
-   **Reliabilitas Notifikasi WA:** Tingkat pengiriman pesan WA > 95%.
-   **Adopsi Fitur:** > 80% guru piket menggunakan fitur absensi manual.
-   **Uptime Sistem:** > 99.9% (server aplikasi dan WA Gateway).

---

## 10. Non-Goals

-   Integrasi dengan sistem informasi akademik (SIAKAD) pihak ketiga.
-   Pengembangan aplikasi mobile native (saat ini hanya PWA web-based).
-   Sistem penjadwalan pelajaran yang kompleks.
-   Fitur chat individual via WhatsApp di luar notifikasi.
-   Pembayaran atau modul keuangan lainnya.

---
