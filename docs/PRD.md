# Product Requirements Document (PRD) — Sistem Absensi SMK Ar Rahma (v3.11 Laravel)

**Versi:** 3.11-L  
**Tanggal:** 2026-07-29  
**Stack target:** Laravel 12 + Inertia.js + React + Eloquent + MySQL  
**Tujuan dokumen:** Acuan produk **dan** migrasi penuh ke Laravel agar sistem berjalan normal di production PHP.

---

## 1. Pendahuluan

Sistem Absensi Siswa SMK Ar Rahma mengelola kehadiran melalui QR Code dinamis, geofencing GPS (opsional), notifikasi WhatsApp (Fonnte), dan dashboard RBAC multi-role.

Versi **3.11-L** menegaskan bahwa **implementasi target adalah Laravel monolith** (bukan Next.js). Perilaku produk (aturan absensi, role, skema DB Bahasa Indonesia) **tetap sama**; yang berubah adalah platform teknis agar deploy PHP, scheduler Artisan, dan queue WA lebih andal di hosting sekolah.

### 1.1 Pernyataan Masalah
Absensi manual lambat & rawan manipulasi; orang tua lambat mendapat kabar. Dibutuhkan scan HP, validasi lokasi/waktu, cadangan Guru Piket (offline), laporan per role, EWS BK, dan WA otomatis — berjalan stabil di infrastruktur Laravel.

### 1.2 Tujuan Migrasi Laravel (Non-Negotiable Ops)
1. Aplikasi **boot** dengan `php artisan serve` / PHP-FPM tanpa runtime Node production untuk backend.
2. Auth session + RBAC middleware berfungsi untuk semua role.
3. Scan QR, TV SSE, piket offline sync, auto-alpha scheduler, dan antrean WA **setara perilaku** PRD Next.js sebelumnya.
4. Schema MySQL **tidak diubah namanya** (kompatibel data existing).

---

## 2. Tujuan Produk

1. Mempercepat absensi lewat scan QR TV dari HP siswa.  
2. Akurasi via token QR, jam masuk/toleransi, geofencing Haversine (bisa dimatikan Admin).  
3. Notifikasi WA ortu + digest Wali Kelas.  
4. Monitoring dashboard per role.  
5. Administrasi: CRUD, import XLSX, audit, backup SQL, lifecycle tahun ajaran.  
6. Ketahanan: IndexedDB piket, queue WA, scheduler auto-alpha, dispensasi keterlambatan.

---

## 3. Stack & Ruang Lingkup Teknis

| Lapisan | Teknologi |
|---------|-----------|
| Backend | Laravel 12, PHP 8.2+ |
| ORM | Eloquent (`App\Models\*`) |
| Frontend | Inertia.js + React + Vite + Tailwind CSS v4 |
| Auth | Session cookie; model `Pengguna`; kolom `kataSandi` |
| Job/Cron | `queue:work` + `schedule:work` / crontab `schedule:run` |
| WA | Fonnte **atau** OpenWA via `WhatsAppService` + `KirimWaJob` (lihat [WHATSAPP.md](WHATSAPP.md)) |
| DB | MySQL/MariaDB — 12 tabel Bahasa Indonesia |

### Fase produk (perilaku — status konsep)

| Fase | Kode | Isi |
|------|------|-----|
| 1 | INIT | Laravel project, migration Eloquent = DATABASE.md, seeder |
| 2 | F-SISWA | Portal HP, scan, GPS kondisional, fingerprint |
| 3 | F-DISP | `/display-qr`, token AES, SSE |
| 4 | F-PIKET | Manual + Dexie + bulk-sync |
| 5 | F-WALI/WA | Kalender, Excel/PDF, broadcast |
| 6 | F-BK/KEPSEK | EWS, SP PDF, dashboard eksekutif |
| 7 | F-ADMIN | CRUD, import, audit, backup, lifecycle |
| 8 | OPS | Dual-tema, jadwal piket, reset sandi |
| 9 | AUTO-ALPHA | Scheduler Artisan + alpha manual Admin |
| 10 | IMPORT | XLSX Kelas/Siswa/Guru |
| 11 | GEO/PWA | Geofencing kondisional + PWA |

Checklist teknis migrasi: [`MIGRASI_LARAVEL.md`](MIGRASI_LARAVEL.md).

---

## 4. Aktor & RBAC

Enum `Peran`: `ADMIN` | `KEPALA_SEKOLAH` | `GURU` | `SISWA`.

| Peran efektif | Penentuan | Hak utama |
|---------------|-----------|-----------|
| Admin | `peran = ADMIN` | Full settings, CRUD, import, backup, lifecycle, alpha manual |
| Kepala Sekolah | `KEPALA_SEKOLAH` | Dashboard eksekutif, ekspor sekolah |
| Wali Kelas | `GURU` + `kelasWali` | Rekap/edit kelas sendiri, broadcast |
| Guru Piket | `GURU` + `JadwalPiket` hari ini | Manual gerbang, dispensasi, offline |
| Guru BK | `GURU` + `isBk` | EWS, SP, konseling |
| Siswa | `SISWA` | Portal, scan, dispensasi |

Middleware Laravel: `auth` + `role:...` + `force.password` bila sandi sementara.

---

## 5. Persyaratan Fungsional (Ringkas)

Detail bernomor: [`SRS.md`](SRS.md).

### 5.1 Auth
- Login session; force change password; fingerprint sesi tunggal siswa; blokir scan 5 menit jika pelanggaran.

### 5.2 Absensi mandiri
- Scan QR; AES token ≤10s (atau kebijakan `config/absensi.php`); HADIR/TERLAMBAT dari `jam_masuk`/`jam_toleransi`; GPS hanya jika `gps_geofencing_aktif`; SSE + WA.

### 5.3 Display TV
- `/display-qr` publik; token `/api/token-qr`; live `/api/attendance/live-stream`.

### 5.4–5.8 Piket / Wali / BK / Kepsek / Admin
- Sama perilaku PRD sebelumnya (manual+offline, kalender+export+broadcast, EWS+SP+konseling, tren+leaderboard, CRUD+import+backup+lifecycle).

### 5.9 Otomasi Laravel
- `AbsensiAutoAlpha` command dijadwal di `routes/console.php`.  
- Proteksi secret header untuk HTTP trigger.  
- Lock proses (cache lock / DB) anti race.  
- Skip weekend / `HariLibur` / magang aktif.  
- WA delay acak via job `delay()`.

### 5.10 Dispensasi
- Tabel `DispensasiKeterlambatan`; siswa ajukan; piket/admin putuskan.

### 5.11 UX
- Konfirmasi destruktif via toast/modal React (bukan `window.confirm`).

---

## 6. Non-Fungsional

| ID | Persyaratan |
|----|-------------|
| NF-P1 | Scan API P95 < 500ms (tanpa latensi Fonnte) |
| NF-S1 | Session httpOnly, bcrypt `kataSandi`, RBAC di middleware+controller, audit admin |
| NF-R1 | Queue WA + retry; scheduler idempotent harian |
| NF-U1 | Mobile-first siswa; dual tema; PWA |
| NF-D1 | Deploy document root `public/`; `storage:link`; cron `schedule:run` |

---

## 7. Model Data

12 model Eloquent = 12 tabel di [`DATABASE.md`](DATABASE.md). Sumber migrasi: `database/migrations/*` (bukan Prisma untuk runtime Laravel).

---

## 8. Antarmuka Utama (Inertia)

| Path | Role | Fungsi |
|------|------|--------|
| `/login`, `/change-password` | Semua | Auth |
| `/student` | Siswa | Portal + scan |
| `/display-qr` | Publik | QR TV + live |
| `/dashboard` | Staf | Ringkasan |
| `/scan` | Piket | Absensi manual |
| `/reports` | Wali/Kepsek/Admin | Rekap |
| `/bk` | BK/Admin | EWS |
| `/admin/*` | Admin | Master data & settings |

API: [`API.md`](API.md).

---

## 9. Metrik Keberhasilan

- Absensi < 5 detik/siswa; akurasi ≥ 99%; WA delivery ≥ 95%.  
- **Migrasi:** `migrate --seed` sukses; smoke login semua role; scan+piket+auto-alpha+WA queue lulus checklist [`MIGRASI_LARAVEL.md`](MIGRASI_LARAVEL.md).

---

## 10. Non-Goals

- Integrasi SIAKAD pihak ketiga.  
- Native iOS/Android (hanya PWA).  
- Jadwal pelajaran / e-learning / chat WA / keuangan / multi-sekolah SaaS.  
- Mengubah nama tabel/kolom ke English snake_case tanpa keputusan eksplisit.

---

## 11. Dependensi Eksternal

MySQL/MariaDB · Fonnte · Browser Camera/GPS · PHP 8.2+ · Composer · Node (build Vite saja) · Cron OS.

---

## 12. Rujukan

[SRS.md](SRS.md) · [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) · [DATABASE.md](DATABASE.md) · [API.md](API.md) · [FITUR.md](FITUR.md) · [ARSITEKTUR.md](ARSITEKTUR.md) · [SOP.md](SOP.md) · [TASK.md](TASK.md)
