# Catatan Paritas — Kode Existing vs Dokumentasi (Wajib Baca Sebelum Coding Laravel)

**Versi:** 1.0 · **Tanggal:** 2026-07-29  
**Metodologi:** Audit langsung ke `src/**`, `prisma/**`, `public/**`, `server.js` dibandingkan dengan seluruh `docs/*.md` sebelumnya. Setiap dokumen role sudah ditandai dengan catatan inline; dokumen ini adalah **daftar konsolidasi + keputusan yang wajib diambil** sebelum implementasi Laravel dimulai, agar tim tidak salah menganggap desain lama = perilaku nyata.

> Perbaikan detail per-topik sudah disisipkan langsung di dokumen terkait (ditandai ⚠️). Dokumen ini adalah **ringkasan eksekutif + checklist keputusan**.

---

## 1. Cara Membaca Dokumen Ini

Setiap baris berisi:
- **Apa yang didokumentasikan (lama)** vs **apa yang sungguh terjadi di kode**.
- **Dampak jika diabaikan** saat migrasi.
- **Keputusan yang harus diambil** (bukan diagent putuskan sepihak — perlu approval product owner sekolah).

---

## 2. Daftar Keputusan Prioritas Tinggi

| # | Topik | Dokumentasi lama | Kode nyata | Dampak jika salah | Dokumen detail |
|---|-------|-------------------|------------|--------------------|-----------------|
| 1 | Broadcast WA | Fitur Wali Kelas, per-kelas | Hanya `ADMIN`/`KEPALA_SEKOLAH`, selalu **global** (`targetClassId=null`) | Jika Laravel ikut dokumen lama, Wali Kelas mendadak dapat akses baru yang tidak pernah ada di produksi — perlu keputusan sadar, bukan migrasi otomatis | [WALI_KELAS.md](WALI_KELAS.md) §2.5, [API.md](API.md) §5 |
| 2 | Toleransi token QR | 10 detik | **+60 detik / −2 detik** | Jika Laravel pakai 10 detik, siswa akan lebih sering gagal scan dibanding sistem lama (regresi UX) | [SISWA.md](SISWA.md) §2.4, [ARSITEKTUR.md](ARSITEKTUR.md) §4.1 |
| 3 | Kunci AES QR | `ABSENSI_TOKEN_SECRET` terpisah | Diturunkan dari `JWT_SECRET` yang sama dengan sesi login | Jika dipisah tanpa strategi, semua QR yang sedang tampil di TV saat cutover langsung invalid (tidak masalah krusial, tapi perlu tahu) | [ARSITEKTUR.md](ARSITEKTUR.md) §4.1 & §5 |
| 4 | Validasi nomor WA | 10–15 digit, tolak baris invalid | Tidak ada validasi panjang, tidak ada penolakan; endpoint import siswa malah **tidak memanggil fungsi cleaning** | Mengikuti dokumen lama = mengetatkan sistem (bisa menolak data yang sebelumnya diterima) | [ADMIN.md](ADMIN.md) §2.1 |
| 5 | EWS BK | Semester + mingguan + bulanan (banyak kriteria) | Hanya 2 kriteria, window **bulan berjalan** saja | Kalau Laravel ikut dokumen lama tanpa sadar itu bukan kode asli, EWS baru akan lebih agresif/berbeda dari histori yang dikenal guru BK | [GURU_BK.md](GURU_BK.md) §2.1 |
| 6 | `cron/wa-digest` | Hanya kirim ringkasan ke wali kelas | **Juga** membuat status `ALPHA` tanpa WA ortu individual (tumpang tindih dengan auto-alpha) | Berpotensi double-processing / status ALPHA muncul dari 2 jalur berbeda tanpa notifikasi konsisten | [WHATSAPP.md](WHATSAPP.md) §6.1 |
| 7 | `SCHEDULER_SECRET` kosong | "wajib diisi" | Kode tetap jalan dengan **default hardcoded** bila env kosong | Risiko keamanan: siapa pun yang tahu default publik bisa memicu auto-alpha | [ARSITEKTUR.md](ARSITEKTUR.md) §4.1 |
| 8 | `/api/token-qr` | "Publik (TV)" | Butuh sesi login (`SISWA`/`ADMIN`) — **tidak** ada di `publicPaths` middleware | Tanpa strategi akun/sesi khusus TV, layar `/display-qr` di Laravel bisa gagal ambil token | [API.md](API.md) §3, [SOP.md](SOP.md) §BAGIAN 4 |

---

## 3. Daftar Keputusan Prioritas Menengah

| # | Topik | Ringkasan gap | Dokumen detail |
|---|-------|----------------|-----------------|
| 9 | Tiga jalur trigger auto-alpha berjalan paralel: (a) `server.js` `setInterval` berbasis `AUTO_ALPHA_HOUR/MINUTE` + window toleransi 20 menit, (b) client `/display-qr` memicu sendiri berbasis `jam_toleransi` DB, (c) "JIT safety net" dipanggil ulang setiap `GET /api/reports` & `GET /api/dashboard/summary`. Ketiganya pakai sumber waktu berbeda (env vs DB) dan lock `isProcessing` hanya aman single-process. | Desain scheduler Laravel harus eksplisit memilih: satu sumber kebenaran waktu, dan lock berbasis cache/DB (bukan variabel in-memory) agar aman multi-worker PHP-FPM. | [ARSITEKTUR.md](ARSITEKTUR.md) §3.3, [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) Fase 3 & 9 |
| 10 | PDF: sebagian komponen (`JadwalPiketPdf`, `RekapPdfButton`, `SpPdfButton`) di-render **client-side** (`"use client"`, browser generate PDF via blob), sedangkan `student-card` di-render **server-side** (`renderToStream` di API route). | Laravel tidak punya React di server: PDF client-side bisa tetap jalan di browser (JS library), tapi PDF server-side (`student-card`) perlu diganti library PHP (DomPDF/mPDF/Snappy) — arsitektur dua jalur ini harus diputuskan eksplisit, bukan disamaratakan. | [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) Fase 5, [SOP.md](SOP.md) |
| 11 | Upload foto bukti dispensasi: tanpa validasi tipe/ukuran file, disimpan langsung ke filesystem `public/uploads/{nama}` (bukan disk abstraction). | Laravel sebaiknya pakai `Storage` disk + validasi `image|max:...`, tapi ini **penambahan validasi baru**, bukan replikasi — putuskan apakah longgar seperti lama atau diperketat. | [SISWA.md](SISWA.md), [ARSITEKTUR.md](ARSITEKTUR.md) |
| 12 | `GAGAL_OFFLINE` di enum `StatusLogWa` tidak pernah dipakai kode (`WhatsAppService` hanya set `TERKIRIM`/`GAGAL`). | Putuskan aktifkan pembedaan gagal-jaringan vs gagal-gateway di Laravel, atau biarkan status ini tetap tidak terpakai. | [DATABASE.md](DATABASE.md) §1.3, [WHATSAPP.md](WHATSAPP.md) §6 |
| 13 | `bulk-sync` tidak mengisi `Kehadiran.tahunAjaran` (beda dari `scan`/`manual`) — jatuh ke default schema `"2024/2025"`. | Perbaiki di Laravel: isi `tahunAjaran` dari `siswa.kelas.tahunAjaran` di semua jalur pembuatan `Kehadiran`, termasuk bulk-sync. | [DATABASE.md](DATABASE.md) §2.4, [GURU_PIKET.md](GURU_PIKET.md) §2.0 |
| 14 | `DELETE /api/attendance/manual` tidak membatasi umur record di backend — batas 30 detik hanya di UI. | Putuskan apakah backend Laravel perlu validasi umur record demi keamanan data, atau tetap seperti lama (client-only). | [GURU_PIKET.md](GURU_PIKET.md) §2.0, [API.md](API.md) §3 |
| 15 | String role legacy "hantu" (`WALI_KELAS`, `GURU_PIKET`, `GURU_BK`) dibandingkan di beberapa kondisi kode padahal tidak pernah ada di enum `Peran` — selalu `false`, otorisasi sebenarnya dari relasi. | Jangan porting string-check ini ke Laravel; gunakan hanya pola relasi (`kelasWali`/`isBk`/`JadwalPiket`). | [ARSITEKTUR.md](ARSITEKTUR.md) §4.1 |
| 16 | Cookie sesi produk lama selalu `secure: true` (hardcoded, tanpa cek environment) — menyulitkan testing HTTP lokal. | Laravel: `SESSION_SECURE_COOKIE` kondisional per environment, bukan hardcoded `true`. | [ARSITEKTUR.md](ARSITEKTUR.md) §4.1, [DEPLOY_LOKAL.md](DEPLOY_LOKAL.md) |
| 17 | Middleware `matcher` menyebut path `api/cron-alpha` yang tidak pernah ada sebagai route nyata (dead/typo config). | Jangan porting typo ini; gunakan nama route asli (`attendance/auto-alpha`, `cron/wa-digest`) di route grouping Laravel. | [SOP.md](SOP.md) §BAGIAN 2 |
| 18 | Format header secret berbeda antar endpoint: `X-Scheduler-Secret: {secret}` (auto-alpha) vs `Authorization: Bearer {secret}` (cron/wa-digest). | Samakan konvensi di Laravel atau dokumentasikan keduanya secara eksplisit di middleware masing-masing route group. | [API.md](API.md) §9 |
| 19 | Fingerprint browser pakai algoritma djb2 kustom (bukan `FingerprintJS`), komponen & hash spesifik. | Replikasi identik di frontend Laravel/Inertia bila ingin fingerprint lama tetap valid; jika diganti, semua siswa dianggap "device baru" sekali saat cutover. | [SISWA.md](SISWA.md) §2.1 |
| 20 | PWA: service worker **bypass total cache** untuk fetch (tidak benar-benar app-shell offline); `offline.html` tidak pernah dipanggil; push notification terdaftar tapi **tidak ada kode subscribe** (inert/belum aktif). | Jangan asumsikan PWA sudah "offline-ready" atau "push-ready" — ketahanan offline nyata hanya dari Dexie di halaman piket. | [ARSITEKTUR.md](ARSITEKTUR.md) §2 |

---

## 4. Checklist Sebelum Fase Coding Laravel Dimulai

- [ ] Product owner sekolah sudah melihat tabel §2 dan memilih opsi untuk item #1, #4, #5, #6 (yang mengubah perilaku fungsional, bukan sekadar port kode).
- [ ] Tim teknis sudah memutuskan strategi secret AES QR (#3) dan strategi sesi TV untuk `token-qr` (#8).
- [ ] Scheduler Laravel didesain dengan **satu** sumber jadwal (bukan 3 jalur berbeda seperti lama) — lihat #9.
- [ ] Strategi render PDF (client vs server) per komponen sudah dipetakan — lihat #10.
- [ ] Semua keputusan di atas dicatat di [TASK.md](TASK.md) sebelum implementasi dimulai.

---

## 5. Rujukan
[MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) · [SRS.md](SRS.md) · [ARSITEKTUR.md](ARSITEKTUR.md) · [API.md](API.md) · [WHATSAPP.md](WHATSAPP.md) · [ADMIN.md](ADMIN.md) · [SISWA.md](SISWA.md) · [GURU_PIKET.md](GURU_PIKET.md) · [GURU_BK.md](GURU_BK.md) · [WALI_KELAS.md](WALI_KELAS.md) · [DATABASE.md](DATABASE.md)
