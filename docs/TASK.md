# Rencana Tugas Pengerjaan (Task Manager) — Sistem Absensi SMK Ar Rahma

Dokumen ini berisi daftar tugas pengerjaan (*checklist TODO*) yang dibagi ke dalam fase dan sub-fase terstruktur untuk memantau progres koding sistem absensi Next.js.

---

## 📋 DAFTAR TUGAS UTAMA

### FASE 1: INISIALISASI PROYEK & KONFIGURASI BASIS DATA
*   **[x] Sub-Fase 1.1: Inisialisasi Proyek Next.js (Single Codebase)**
    *   [x] Inisialisasi folder `/mnt/save/project/absensi/absensi_smk_ar_rahma` menggunakan `create-next-app` (TypeScript, Tailwind, ESLint, App Router).
    *   [x] Instalasi dependensi tambahan: `prisma`, `@prisma/client`, `zustand`, `lucide-react`, `xlsx`, `date-fns`, `react-hot-toast`, `dexie` (IndexedDB), `@react-pdf/renderer`, `bcrypt`, `jsonwebtoken`, `axios`, `qrcode`, `tsx`.
*   **[x] Sub-Fase 1.2: Konfigurasi Prisma ORM & Database MySQL**
    *   [x] Buat berkas `prisma/schema.prisma` menggunakan penamaan Bahasa Indonesia sesuai kamus data.
    *   [x] Jalankan `npx prisma validate` untuk memeriksa konseptual skema.
    *   [x] Jalankan migrasi database awal (diaplikasikan via `schema.sql` manual karena pembatasan hak akses shadow database & perbaikan ketidaksesuaian versi tabel MariaDB).
*   **[x] Sub-Fase 1.3: Pembuatan Script Seeding & Global Settings**
    *   [x] Tulis berkas `prisma/seed.ts` untuk menyuntikkan data default: Pengguna Admin awal, setelan parameter `Pengaturan` (GPS sekolah, jam toleransi, jeda WA), dan data kalender `HariLibur` awal.

---

### FASE 2: PORTAL SISWA, HP SCANNER & GEOLOCATION (F-SISWA)
*   **[x] Sub-Fase 2.1: Autentikasi Pengguna, Force Change Password & Sesi Tunggal**
    *   [x] Implementasi route login API dengan JWT cookies.
    *   [x] Implementasi pengenal sidik jari browser (`sidikJariBrowser`) untuk *Single-Session* di database.
    *   [x] Implementasi middleware/guard pembatasan scan 5 menit jika melanggar sesi ganda.
    *   [x] Implementasi halaman ganti kata sandi wajib (`isPasswordSementara = true`).
*   **[x] Sub-Fase 2.2: Layout Halaman Portal HP Siswa**
    *   [x] Pembuatan desain antarmuka responsif portal siswa di HP.
    *   [x] Pembuatan widget persentase kehadiran bulanan (diagram lingkaran).
    *   [x] Pembuatan tabel riwayat kehadiran 7 hari terakhir.
*   **[x] Sub-Fase 2.3: Modul Pemindai Kamera & Audio/Haptic Feedback**
    *   [x] Integrasi kamera browser menggunakan library pemindai QR Code.
    *   [x] Tambahkan kontrol Flash kamera belakang, tombol ganti kamera, dan skeleton loader saat inisialisasi.
    *   [x] Pembuatan feedback suara bip bersih dan getaran HP (`navigator.vibrate`) sukses/gagal.
*   **[x] Sub-Fase 2.4: Validasi API Scan Absensi (Haversine GPS & Usia Token)**
    *   [x] Buat route API `/api/attendance/scan`.
    *   [x] Tulis fungsi hitung rumus Haversine di backend untuk mengecek radius geofencing sekolah.
    *   [x] Tulis logika dekripsi AES token QR TV dan validasi batas waktu maksimal 10 detik.

---

### FASE 3: LAYAR TV DISPLAY QR & REAL-TIME SSE BROADCAST (F-DISP)
*   **[x] Sub-Fase 3.1: Token Generator Terenkripsi AES-256**
    *   [x] Buat route API `/api/token-qr` untuk menghasilkan token terenkripsi dinamis berisi timestamp server.
*   **[x] Sub-Fase 3.2: Arsitektur Server-Sent Events (SSE) Live Stream**
    *   [x] Buat route API `/api/attendance/live-stream` dengan ReadableStream default controller global registry.
    *   [x] Tulis helper fungsi `broadcastKehadiran` (broadcastAttendance) untuk memancarkan data siswa absensi sukses ke seluruh TV.
*   **[x] Sub-Fase 3.3: Layar TV Display QR `/display-qr`**
    *   [x] Buat layout dark-theme premium TV lobi.
    *   [x] Tampilkan QR Code dinamis dengan visual circular progress countdown timer 10s.
    *   [x] Tampilkan panel notifikasi melayang di samping QR untuk memuat daftar nama siswa yang sukses scan secara real-time via SSE.

---

### FASE 4: DASHBOARD GURU PIKET & PENYELAMATAN OFFLINE (F-PIKET)
*   **[x] Sub-Fase 4.1: Antarmuka Pencarian Cepat & Satu-Klik Input Manual**
    *   [x] Buat halaman dashboard Guru Piket `/scan`.
    *   [x] Buat form pencarian cepat siswa dan filter dropdown kelas.
    *   [x] Tambahkan tombol status absensi besar satu-klik (`Hadir`, `Terlambat`, `Izin`, `Sakit`) tanpa konfirmasi modal.
    *   [x] Tampilkan bouncy toast notifikasi hijau dengan inisial nama siswa saat sukses.
*   **[x] Sub-Fase 4.2: Integrasi IndexedDB Lokal Cache**
    *   [x] Konfigurasi database lokal IndexedDB browser Guru Piket menggunakan `Dexie.js` untuk meng-cache daftar siswa aktif.
*   **[x] Sub-Fase 4.3: Background Auto-Sync Data Offline**
    *   [x] Tulis logika pemantau status internet (`window.online`).
    *   [x] Buat route API `/api/attendance/bulk-sync` untuk memproses masal absensi tertunda.
    *   [x] Tulis fungsi background sync yang otomatis mengirim data IndexedDB ke server saat online kembali.

---

### FASE 5: DASHBOARD WALI KELAS & NOTIFIKASI WHATSAPP (F-WALI & F-WA)
*   **[x] Sub-Fase 5.1: Grid Kalender Kehadiran & Slide-over Panel**
    *   [x] Buat dashboard Wali Kelas.
    *   [x] Desain kalender grid bulanan ala GitHub (warna hijau/kuning/biru/merah/abu-abu).
    *   [x] Hubungkan kueri sel tanggal ke laci panel samping (*slide-over drawer*) untuk detail & edit status cepat.
*   **[x] Sub-Fase 5.2: Ekspor Excel Berwarna & PDF Cetak A4**
    *   [x] Integrasi pembuatan file Excel dengan conditional formatting warna status absensi.
    *   [x] Implementasi pembuatan dokumen PDF laporan rekap bulanan A4 ramah cetak.
*   **[x] Sub-Fase 5.3: Integrasi API WhatsApp Gateway & Queue Delay**
    *   [x] Tulis utilitas konektor Fonnte API untuk pengiriman notifikasi.
    *   [x] Tulis modul antrean asinkronus (queue) dengan jeda delay acak (*random delay min-max*) dari database.
*   **[x] Sub-Fase 5.4: Custom WA Broadcast & Draf Cepat Hubungi Ortu**
    *   [x] Implementasi draf URL `wa.me` otomatis ke nomor orang tua siswa Alpha.
    *   [x] Buat halaman broadcast massal custom Wali Kelas ke wali murid kelasnya.

---

### FASE 6: GURU BK, EWS, & KEPALA SEKOLAH (F-BK & F-KEPSEK)
*   **[x] Sub-Fase 6.1: Mesin Early Warning System (EWS) Guru BK**
    *   [x] Buat dashboard Guru BK.
    *   [x] Tulis kueri pendeteksi otomatis siswa rawan pelanggaran: Alpha $\ge 3$ hari berturut-turut atau telat $>5$ kali sebulan.
*   **[x] Sub-Fase 6.2: Cetak Surat Panggilan PDF Resmi & Log Konseling Rahasia**
    *   [x] Buat template PDF Surat Panggilan resmi bertingkat (SP 1, SP 2, SP 3).
    *   [x] Buat form input log konseling BK rahasia (`LogKonselingBk`).
    *   [x] Konfigurasi filter RBAC (Wali Kelas hanya baca, BK/Admin tulis/edit).
*   **[x] Sub-Fase 6.3: Executive Dashboard Kepala Sekolah**
    *   [x] Buat dashboard Kepala Sekolah.
    *   [x] Integrasi Recharts untuk grafik tren garis bulanan dan diagram donat harian.
    *   [x] Buat widget leaderboard disiplin kelas teratas/terbawah dan widget pemantau Guru Piket.
*   **[x] Sub-Fase 6.4: Siklus Tahun Ajaran (Kenaikan Kelas & Alumni)**
    *   [x] Buat fungsi kenaikan kelas massal (memindahkan relasi kelas siswa secara massal).
    *   [x] Buat fitur penonaktifan kelulusan massal kelas XII menjadi alumni (`aktif = false`).

---

### FASE 7: DASHBOARD ADMIN, AUDIT TRAIL, BACKUP & cPANEL (F-ADMIN)
*   **[x] Sub-Fase 7.1: CRUD Master Data & Regex Formatter Nomor WA**
    *   [x] Buat modul CRUD Pengguna, Guru, Siswa, Kelas, HariLibur.
    *   [x] Integrasi regex pembersih otomatis nomor WA orang tua ke format internasional (`62812...`).
*   **[x] Sub-Fase 7.2: Log Audit Aktivitas Admin**
    *   [x] Tulis interceptor audit trail di backend untuk mencatat aktivitas edit krusial Admin ke dalam tabel `LogAuditAdmin` berformat JSON.
*   **[x] Sub-Fase 7.3: Backup Database Manual SQL (cPanel Compatible)**
    *   [x] Tulis route API `/api/admin/backup-db` yang mengkueri seluruh tabel database via Prisma dan mengubahnya menjadi berkas `.sql` manual tanpa memanggil `mysqldump` command line.
*   **[x] Sub-Fase 7.4: Uji Coba WA Connector & Monitor Saldo Kuota**
    *   [x] Buat tombol uji coba pengiriman WA diagnostik langsung di dashboard Admin.
    *   [x] Integrasikan penayangan sisa saldo kuota WhatsApp Gateway di dashboard Admin.
*   **[x] Sub-Fase 7.5: Pengujian Sistem Menyeluruh & Panduan Deploy cPanel**
    *   [x] Lakukan pengujian E2E (Siswa scan, TV update, Ortu terima WA, Piket manual, BK cetak SP).
    *   [x] Persiapkan dokumen build production Next.js and skema deploy di hosting cPanel.

---

### FASE 8: KUSTOMISASI & PERBAIKAN OPERASIONAL (GURU & SISTEM)
*   **[x] Sub-Fase 8.1: Isolasi Database Proyek Sendiri**
    *   [x] Konfigurasikan koneksi database mandiri `absensi_smk_ar_rahma` pada `.env`.
    *   [x] Terapkan skema tabel secara bersih menggunakan `prisma/schema.sql`.
    *   [x] Jalankan penyuntikan data benih default (`db seed`) untuk konfigurasi dasar absensi dan akun pengguna standar.
*   **[x] Sub-Fase 8.2: Integrasi Dual-Tema (Siang & Malam)**
    *   [x] Buat logika pendeteksi preferensi tema bawaan sistem & penyimpanan persisten di `localStorage`.
    *   [x] Pasang tombol pengganti tema (Sun/Moon) pada footer profil sidebar (Desktop) and header bar (Mobile).
    *   [x] Pasang tombol pengganti tema pada header bar Portal Siswa.
    *   [x] Verifikasi transisi style CSS dark-mode (Emerald green accents, clean dark/light backgrounds) di seluruh halaman.
*   **[x] Sub-Fase 8.3: Perbaikan Bug Race Condition IndexedDB**
    *   [x] Deteksi penyebab `ConstraintError` di halaman Guru Piket karena pemanggilan paralel `bulkAdd` oleh StrictMode React.
    *   [x] Konversi pemanggilan `bulkAdd` menjadi `bulkPut` (upsert) di [scan/page.tsx](../src/app/(dashboard)/scan/page.tsx) untuk memastikan ketahanan operasi lokal cache.
*   **[x] Sub-Fase 8.4: Kelola Pengguna (Non-Siswa) & Penjadwalan Piket**
    *   [x] Ubah enum `Peran` menjadi `GURU` tunggal dan tambahkan flag penugasan (`isBk`) pada model `Guru` di `prisma/schema.prisma`.
    *   [x] Buat model `JadwalPiket` mingguan di `prisma/schema.prisma` dan sinkronkan database.
    *   [x] Buat API Route CRUD Pengguna non-Siswa (Admin, Kepala Sekolah, Guru) di `/api/admin/users`.
    *   [x] Buat API Route CRUD Jadwal Piket di `/api/admin/picket-schedules`.
    *   [x] Buat halaman antarmuka "Kelola Guru & Staf" untuk Admin dengan filter jabatan (BK, Piket, Wali Kelas).
    *   [x] Buat halaman antarmuka "Penjadwalan Piket Mingguan" untuk Admin dengan format grid hari kerja.
    *   [x] Integrasikan menu sidebar "Kelola Guru" dan "Jadwal Piket" khusus untuk peran `ADMIN`.
    *   [x] Perbaiki kueri dropdown Wali Kelas di `/api/admin/classes` agar menampilkan nama asli Pengguna hasil join tabel `Pengguna`, bukan hanya NIP.
    *   [x] Integrasikan penayangan daftar nama Guru Piket hari ini pada halaman TV Display `/display-qr`.
    *   [x] Buat API Route untuk mengambil daftar siswa per kelas secara asinkron di `/api/admin/classes/[id]/students`.
    *   [x] Hubungkan kolom jumlah siswa di halaman Kelola Kelas (`/classes`) ke modal pop-up detail siswa (lazy load).
    *   [x] Tambahkan tombol pintasan "Kelola Siswa Kelas Ini" di dalam modal untuk mengarah ke `/students` dengan parameter filter otomatis.
    *   [x] Tambahkan kolom checkbox seleksi baris pada tabel Kelola Siswa (`/students`) dengan status seleksi persisten lintas halaman/filter.
    *   [x] Buat komponen bilah aksi melayang (Floating Action Bar) di halaman Kelola Siswa yang terintegrasi dengan modal pengeditan massal status magang.
    *   [x] Buat sistem tugas terjadwal (cron scheduler) untuk Laporan Ringkas Harian WhatsApp Wali Kelas di `/api/cron/wa-digest`.
    *   [x] Tambahkan tombol "Kirim Laporan Harian WA" di dasbor Admin (Pengaturan) sebagai pemicu manual laporan Wali Kelas (Opsi tanpa cron job).
    *   [x] Sesuaikan API route `/api/cron/wa-digest` agar dapat dipicu secara aman oleh sesi masuk Admin/Piket tanpa memerlukan token `CRON_SECRET`.
    *   [x] Buat formulir pengajuan dispensasi keterlambatan di Portal Siswa (`/student`) dengan input alasan dan unggah foto.
    *   [x] Integrasikan panel persetujuan dispensasi keterlambatan pada dashboard Guru Piket (`/scan`) untuk memperbarui status absensi siswa.
    *   [x] Buat API Route dan layout cetak Rapor Kehadiran Bulanan Siswa (PDF A4) di `/api/reports/student-card`.
*   **[x] Sub-Fase 8.5: Reset Kata Sandi Siswa oleh Admin**
    *   [x] Modifikasi API PUT `/api/admin/students` agar mendukung parameter `resetPassword` untuk mereset kata sandi siswa ke default NISN dan mengeset status `isPasswordSementara: true`.
    *   [x] Tambahkan tombol "Reset Kata Sandi" dengan ikon Kunci di setiap baris tabel siswa di `/students` dengan modal konfirmasi.
*   **[x] Sub-Fase 8.6: Optimalisasi Jarak Pindai QR Code (2 Meter)**
    *   [x] Kompresi payload token QR terenkripsi menjadi format ringkas `SMK:timestamp:rand` (dari 193 karakter hex menjadi 97 karakter hex) untuk memperbesar ukuran piksel kotak QR (densitas rendah).
    *   [x] Modifikasi `absensi_smk_ar_rahma/src/app/display-qr/page.tsx` untuk meningkatkan resolusi QR, kontras hitam pekat, margin 0, ukuran max-h-[60vh], dan skala grid kiri menjadi 8 kolom.
    *   [x] Modifikasi `absensi_smk_ar_rahma/src/app/student/page.tsx` untuk memperbesar target `qrbox` (multiplier 0.85) dan memaksimalkan target ideal resolusi kamera ke Full HD (1080p).
    *   [x] Rapikan dan percantik visual display QR `/display-qr` dengan digital clock, date widget, status koneksi berkilau, dan transisi log siswa real-time (tampilan satu layar tanpa scrollbar).
*   **[x] Sub-Fase 8.8: Perbaikan Hak Akses Role Wali Kelas (GURU) pada Dashboard & Laporan**
    *   [x] Pembaruan validasi otorisasi di API `/api/dashboard/summary`
    *   [x] Pembaruan validasi otorisasi di API `/api/reports`
    *   [x] Pembaruan validasi otorisasi di API `/api/dashboard/broadcast`
    *   [x] Pembaruan validasi otorisasi di API `/api/attendance/manual`
    *   [x] Pembaruan validasi otorisasi di API `/api/attendance/bulk-sync`
    *   [x] Sinkronisasi visual frontend di `src/app/(dashboard)/page.tsx`
*   **[x] Sub-Fase 8.7: Rekapitulasi Lanjutan & Audit Keamanan (Update v3.7)**
    *   [x] Perbarui `PRD.md` dengan fitur rekap tahun ajaran, rekap password default, dan cetak jadwal piket.
    *   [x] Modifikasi `prisma/schema.prisma` untuk menambah kolom `tahunAjaran` pada `Kehadiran` dan regenerasi Client.
    *   [x] Implementasi filter Tahun Ajaran dan Bulan pada API `/api/reports` & UI Dashboard.
    *   [x] Implementasi logika filter `isPasswordSementara` pada fitur unduh data pengguna Admin.
    *   [x] Penyesuaian UI dashboard untuk akses download rekap/jadwal piket berdasarkan RBAC.
    *   [x] Validasi build production dan perbaikan bug variabel `tx` pada route manual attendance.
*   [ ] **Sub-Fase 8.9: Optimalisasi Pengalaman Pengguna iOS (PWA)**
    *   [ ] Edukasi pengguna untuk "Add to Home Screen" di iOS.
    *   [x] Buat pesan informatif sebelum permintaan izin GPS jika geofencing aktif.
    *   [x] Tambahkan panduan jelas di UI cara mengaktifkan GPS/kamera jika izin ditolak di iOS.
    *   [x] Pesan error kamera lebih informatif, jelaskan konfigurasi fallback.
    *   [x] Informasikan zoom digital sebagai alternatif zoom optik di iOS.
    *   [ ] Verifikasi `cleanupScanner()` selalu terpanggil untuk mematikan kamera di iOS.
    *   [ ] Pastikan `font-size` minimal `16px` untuk elemen input untuk menghindari auto-zoom iOS.

### FASE 9: AUTO-ALPHA SCHEDULER & NOTIFIKASI ADMIN
*   **[x] Sub-Fase 9.1: Scheduler Auto-Alpha Terkonfigurasi via Environment**
    *   [x] Tambahkan variabel `AUTO_ALPHA_HOUR`, `AUTO_ALPHA_MINUTE`, dan `AUTO_ALPHA_INTERVAL_MS` di `.env`.
    *   [x] Modifikasi `server.js` untuk menjalankan `setInterval` scheduler yang membaca konfigurasi dari env vars.
    *   [x] Implementasi `schedulerTick()` dengan deteksi waktu WIB dan reset harian `autoAlphaTriggeredToday`.
    *   [x] Implementasi `triggerAutoAlpha()` yang memanggil endpoint `/api/attendance/auto-alpha` via fetch internal.
    *   [x] Pastikan scheduler hanya trigger sekali per hari dalam jendela toleransi 20 menit.
*   **[x] Sub-Fase 9.2: Notifikasi Pop-up Admin & Trigger Manual Alpha**
    *   [x] Tambahkan state `processingAlpha` dan fungsi `handleManualAlpha()` di `src/app/(dashboard)/page.tsx`.
    *   [x] Gunakan `react-hot-toast` custom modal untuk konfirmasi sebelum memproses (mengikuti pola destructive action).
    *   [x] Panggil API `/api/attendance/auto-alpha` dengan `force: true` dan tampilkan feedback via `react-hot-toast`.
    *   [x] Tambahkan banner peringatan amber yang muncul ketika `data.peran === "ADMIN"` dan `data.ringkasanHariIni.belumAbsen > 0`.
    *   [x] Banner menampilkan jumlah siswa belum absen dan tombol "Proses Alpha Manual" dengan loading state.
    *   [x] Setelah sukses, dashboard otomatis refresh (`fetchSummary()`) dan banner hilang karena `belumAbsen` menjadi 0.
*   **[x] Sub-Fase 9.3: Security Hardening & Bug Fix (Audit)**
    *   [x] Tambahkan autentikasi header `X-Scheduler-Secret` pada endpoint `/api/attendance/auto-alpha` untuk mencegah akses tanpa otorisasi (CRITICAL).
    *   [x] Tambahkan `isProcessing` lock di `src/lib/auto-alpha.ts` untuk mencegah race condition dari eksekusi konkuren (WARNING).
    *   [x] Perbaiki perhitungan tanggal WIB di `server.js` menggunakan `wibTime.toISOString().split("T")[0]` agar konsisten dengan timezone server (WARNING).
    *   [x] Tambahkan variabel `SCHEDULER_SECRET` di `.env` dan header `X-Scheduler-Secret` pada request internal scheduler di `server.js`.
    *   [x] Verifikasi build production berhasil tanpa error setelah semua perbaikan diterapkan.

### FASE 10: IMPORT DATA MASTER XLSX
*   **[x] Sub-Fase 10.1: Implementasi Import Data Kelas dari XLSX**
    *   [x] Tambahkan tombol "Import Kelas" di `src/app/(dashboard)/classes/page.tsx`.
    *   [x] Buat modal import dengan input file dan link template contoh.
    *   [x] Buat API `/api/admin/classes/import` (POST) untuk menangani upload XLSX.
    *   [x] Implementasi parsing XLSX, validasi data (nama, tahunAjaran, idGuru - lookup), dan bulk upsert Prisma.
    *   [x] Berikan feedback sukses/gagal per baris di UI.
*   **[x] Sub-Fase 10.2: Implementasi Import Data Siswa dari XLSX**
    *   [x] Tambahkan tombol "Import Siswa" di `src/app/(dashboard)/students/page.tsx`.
    *   [x] Buat modal import dengan input file dan link template contoh.
    *   [x] Buat API `/api/admin/students/import` (POST) untuk menangani upload XLSX.
    *   [x] Implementasi parsing XLSX, validasi data (NISN, Nama, ID Kelas - lookup, TeleponOrangTua, SedangMagang), pembuatan `Pengguna` baru, dan bulk upsert Prisma.
    *   [x] Berikan feedback sukses/gagal per baris di UI.
*   **[x] Sub-Fase 10.3: Implementasi Import Data Guru/Staff dari XLSX**
    *   [x] Tambahkan tombol "Import Guru/Staf" di `src/app/(dashboard)/teachers/page.tsx`.
    *   [x] Buat modal import dengan input file dan link template contoh.
    *   [x] Buat API `/api/admin/users/import` (POST) untuk menangani upload XLSX.
    *   [x] Implementasi parsing XLSX, validasi data (Nama, Email, NIP, Telepon, Peran, isBk), pembuatan `Pengguna` baru, dan bulk upsert Prisma.
    *   [x] Berikan feedback sukses/gagal per baris di UI.

---

### FASE 11: OPTIMALISASI PWA (PROGRESSIVE WEB APP) UNTUK ANDROID & iOS

*   [ ] **Sub-Fase 11.1: Implementasi Dasar PWA**
    *   [ ] Buat `manifest.json` yang sesuai dengan spesifikasi PWA.
    *   [ ] Buat `service-worker.js` untuk caching aset dan offline functionality.
    *   [ ] Daftarkan Service Worker di `src/app/layout.tsx` atau file entry point aplikasi.
    *   [ ] Pastikan aplikasi berfungsi di HTTPS.
*   [ ] **Sub-Fase 11.2: Penanganan Event PWA & Notifikasi**
    *   [ ] Implementasi `beforeinstallprompt` untuk Android (jika relevan).
    *   [ ] Implementasi notifikasi push untuk PWA (Android & iOS).
    *   [ ] Tangani lifecycle event Service Worker (install, activate, fetch).

---

## 🐛 LOG PERBAIKAN BUG & PERUBAHAN LAINNYA
*(Bagian ini mencatat semua bug fix, kustomisasi, dan konfigurasi pasca-fase awal)*

| Tanggal | Fitur / Komponen | Deskripsi Masalah | Solusi / Perbaikan | Status |
| :--- | :--- | :--- | :--- | :--- |
| 2026-06-04 | Database Isolation | Database bercampur dengan project lain. | Konfigurasi database mandiri `absensi_smk_ar_rahma`, inisialisasi `prisma/schema.sql`, dan seeding data awal. | Selesai |
| 2026-06-04 | Routing Collision | Path `/` menampilkan template bawaan Vercel/Next.js, bukan halaman login. | Menghapus file `src/app/page.tsx` yang bentrok dengan route dashboard/login di `src/app/(dashboard)/page.tsx`. | Selesai |
| 2026-06-04 | IndexedDB Cache | `siswa.bulkAdd()` crash `ConstraintError: Key already exists` di halaman Guru Piket. | Mengubah `bulkAdd()` menjadi `bulkPut()` untuk menghindari crash akibat double rendering React.StrictMode. | Selesai |
| 2026-06-04 | PDF Export | Halaman `/reports` crash with error runtime `su is not a function` saat unduh PDF. | Memisahkan dokumen PDF `RekapAbsensiPdf.tsx` secara tersendiri dan meloadnya dengan dynamic import `ssr: false` di client page. | Selesai |
| 2026-06-04 | Dual-Theme (Day/Night) | Halaman tidak memiliki perbedaan visual yang kontras antara mode terang dan mode gelap. | Menambahkan pendeteksi tema, class-based dark mode Tailwind v4 `@custom-variant`, toggler di Layout dan Portal Siswa. | Selesai |
| 2026-06-05 | Project Tasks | Kebutuhan dokumentasi tugas terpusat di root project. | Memindahkan file pelacakan `task.md` ke folder root project `docs/TASK.md`. | Selesai |
| 2026-06-05 | Version 3.7 Update | Penambahan rekap tahun ajaran, audit password default, dan cetak jadwal piket. | Update PRD, Skema Prisma, API filter, dan UI Dashboard download. | Selesai |
| 2026-06-05 | Database Schema Sync | Kolom `Kehadiran.tahunAjaran` belum sinkron di database. | Melakukan kueri `ALTER TABLE` dan `CREATE INDEX` secara manual karena error MariaDB `mysql.proc` di server. | Selesai |
| 2026-06-05 | Performance Optimization | Kueri settings duplikat pada pengiriman pesan WA. | Mengoptimalkan kueri `findUnique` menjadi `findMany` pada `whatsapp.ts` untuk meminimalkan beban pool koneksi database. | Selesai |
| 2026-06-18 | Auto-Alpha Scheduler | Belum ada mekanisme otomatis penandaan Alpha harian dari sisi server. | Menambahkan scheduler `setInterval` di `server.js` dengan konfigurasi env vars (`AUTO_ALPHA_HOUR`, `AUTO_ALPHA_MINUTE`, `AUTO_ALPHA_INTERVAL_MS`). | Selesai |
| 2026-06-18 | Admin Notification | Admin tidak mendapat notifikasi ketika masih ada siswa belum absen. | Menambahkan banner amber peringatan + tombol "Proses Alpha Manual" di dashboard Admin dengan `confirm()` dan `react-hot-toast`. | Selesai |
| 2026-06-18 | Auto-Alpha Security | Endpoint `/api/attendance/auto-alpha` dapat diakses tanpa autentikasi (CRITICAL). | Menambahkan validasi header `X-Scheduler-Secret` pada `route.ts` dan lock `isProcessing` pada `auto-alpha.ts` untuk mencegah akses ilegal & race condition. | Selesai |
| 2026-06-18 | Scheduler Timezone | Variabel `today` di `server.js` menggunakan timezone lokal server, bukan WIB. | Mengganti `now.toDateString()` menjadi `wibTime.toISOString().split("T")[0]` agar tanggal konsisten WIB. | Selesai |
| 2026-07-03 | Konfirmasi UI | Notifikasi `confirm()` masih menggunakan bawaan browser. | Mengganti `confirm()` dengan `react-hot-toast` custom modal di `src/app/(dashboard)/page.tsx`, `students/page.tsx`, `teachers/page.tsx`, `picket-schedules/page.tsx`, `settings/page.tsx`, `classes/page.tsx`, `reports/page.tsx`. | Selesai |
| 2026-07-03 | Bug Syntax `page.tsx` | Error: `Expected '}', got '<eof>'` di `src/app/(dashboard)/page.tsx` pada baris 851. | Memindahkan helper `Info` ke dalam `DashboardPage` untuk memperbaiki scoping. | Selesai |
| 2026-07-03 | Hardcode Token WA | Token WA Gateway di `src/lib/whatsapp.ts` menggunakan nilai hardcode untuk debugging. | Mengembalikan pengambilan token dari database/env vars. | Selesai |
| 2026-07-03 | Import Data Master XLSX | Implementasi fitur import data master (Kelas, Siswa, Guru/Staf) menggunakan file XLSX. | Menambahkan UI (tombol, modal import) dan API backend (`/api/admin/classes/import`, `/api/admin/students/import`, `/api/admin/users/import`). | Selesai |
| 2026-07-04 | Timezone Issue | Waktu yang ditampilkan di Portal Siswa berbeda dengan waktu di laporan absensi dan notifikasi. | Mengubah pemformatan `waktuMasuk` di `/api/student/dashboard/route.ts` dari UTC ke waktu lokal WIB (`toLocaleTimeString("id-ID", ...)`). | Selesai |