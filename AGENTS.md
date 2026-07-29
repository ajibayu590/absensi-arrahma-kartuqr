# AGENTS.md — AI Agent Guidelines (Universal)

> **This file is the entry point for ANY AI agent** working on this project.
> Read this file first, then follow the pointers below.

---

## Project Overview

**Sistem Absensi Siswa SMK Ar Rahma** — Web-based student attendance management system using QR Code scanning, GPS geofencing, real-time WhatsApp notifications, and RBAC dashboard.

**Tech Stack (target / migrasi penuh):**  
**Laravel 12** + **Inertia.js** + **React** + **Vite** + **Tailwind CSS** + **Eloquent ORM** + **MySQL/MariaDB** + **Fonnte WA Gateway** + **Laravel Queue** + **Laravel Scheduler**.

> Dokumentasi di `docs/` mendeskripsikan **target Laravel** agar implementasi migrasi penuh berjalan normal dan konsisten.  
> Schema MySQL **tetap Bahasa Indonesia** (sama dengan kamus di `docs/DATABASE.md`).  
> Kode Next.js lama (jika masih ada di tree) bersifat **legacy referensi saja** — fitur baru wajib Laravel.

---

## Documentation Map

Semua dokumentasi di folder **`docs/`**. Mulai dari [`docs/INDEX.md`](docs/INDEX.md).

### Must-Read (urut):

1. **[docs/INDEX.md](docs/INDEX.md)** — Indeks & navigasi  
2. **[docs/PRD.md](docs/PRD.md)** — Product Requirements (v3.11 Laravel)  
3. **[docs/SRS.md](docs/SRS.md)** — Software Requirements Specification  
4. **[docs/DATABASE.md](docs/DATABASE.md)** — Kamus data 12 tabel  
5. **[docs/ARSITEKTUR.md](docs/ARSITEKTUR.md)** — Arsitektur Laravel + Inertia  
6. **[docs/SOP.md](docs/SOP.md)** — SOP implementasi Laravel (folder, model, route, scheduler)  
7. **[docs/API.md](docs/API.md)** — Katalog API `/api/*`  
8. **[docs/WHATSAPP.md](docs/WHATSAPP.md)** — Fonnte & OpenWA (token, URL, kirim, queue)  
9. **[docs/FITUR.md](docs/FITUR.md)** — Katalog fitur × role  
10. **[docs/MIGRASI_LARAVEL.md](docs/MIGRASI_LARAVEL.md)** — Checklist migrasi penuh Next.js → Laravel  
11. **[docs/CATATAN_PARITAS.md](docs/CATATAN_PARITAS.md)** — **Wajib baca sebelum coding**: gap kode-vs-dokumentasi lama & keputusan yang harus diambil (broadcast WA, toleransi token, EWS, dll)

### Feature specs (per role):
- [docs/SISWA.md](docs/SISWA.md) · [docs/GURU_PIKET.md](docs/GURU_PIKET.md) · [docs/WALI_KELAS.md](docs/WALI_KELAS.md)  
- [docs/GURU_BK.md](docs/GURU_BK.md) · [docs/KEPALA_SEKOLAH.md](docs/KEPALA_SEKOLAH.md) · [docs/ADMIN.md](docs/ADMIN.md)

---

## Critical Rules

### 1. Database Naming
Semua nama tabel, kolom, enum MySQL dalam **Bahasa Indonesia**:
- Tables: `Pengguna`, `Kelas`, `Guru`, `Siswa`, `Kehadiran`, `LogWa`, `Pengaturan`, `HariLibur`, `LogAuditAdmin`, `LogKonselingBk`, `JadwalPiket`, `DispensasiKeterlambatan`
- Enums: `Peran`, `StatusKehadiran`, `StatusLogWa`, `HariPiket`, `StatusDispensasi`
- Eloquent models map 1:1; kolom camelCase di DB — **jangan** rename ke snake_case tanpa persetujuan eksplisit (`$table` / `$fillable` / casts disetel eksplisit).

### 2. PRD Compliance
Implementasi **wajib** mengikuti `docs/PRD.md`, `docs/SRS.md`, dan spec role. Jangan ubah perilaku fitur / non-goals tanpa persetujuan user.

### 3. Progress Tracking
Setiap perubahan fitur / bug fix material → update `docs/TASK.md`.

### 4. Confirmation Before Fix Execution
Jika menemukan bug/vulnerability dan ingin **mengeksekusi perbaikan kode**: wajib konfirmasi user dulu (temuan + usulan + file terdampak).

### 5. Execution Logging in TASK.md
Semua eksekusi dicatat di tabel log bawah `docs/TASK.md`.

### 6. Laravel Conventions (Proyek Ini)
- Auth user model: `App\Models\Pengguna` — password column `kataSandi` via `getAuthPassword()`.
- Session-based auth (web + API cookie `SameSite`/`Secure` sesuai HTTPS).
- Middleware RBAC: alias `role:ADMIN,GURU,...` (`EnsureRole`).
- Force ganti sandi: middleware saat `isPasswordSementara = true`.
- QR AES-256: `App\Services\QrTokenService` — secret dari `ABSENSI_TOKEN_SECRET` (env).
- Auto-alpha: `php artisan schedule:run` / `schedule:work` + command `absensi:auto-alpha`; proteksi `SCHEDULER_SECRET` / `X-Scheduler-Secret`.
- WA: `App\Jobs\KirimWaJob` + queue `database`/`redis`; delay acak dari `Pengaturan`.
- SSE TV: endpoint stream Laravel + fan-out (cache/broadcast service) — path tetap `/api/attendance/live-stream`.
- Path API menjaga kompatibilitas legacy `/api/...` agar frontend Inertia/React mudah diport.

---

## Run Commands (Laravel)

```bash
composer install
cp .env.example .env && php artisan key:generate
# Set DB_* ke MySQL/MariaDB (production) — schema mengikuti docs/DATABASE.md
php artisan migrate --seed

npm install && npm run build   # Vite + Inertia React
# atau: npm run dev

php artisan serve              # http://localhost:8000
php artisan queue:work         # worker WhatsApp
php artisan schedule:work      # auto-alpha + cron digest
php artisan absensi:auto-alpha --force
php artisan test               # jika suite tersedia
```
