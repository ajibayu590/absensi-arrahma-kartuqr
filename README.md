# Sistem Absensi Siswa SMK Ar Rahma

[![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com/)
[![Inertia](https://img.shields.io/badge/Inertia-React-9553E9?style=for-the-badge)](https://inertiajs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Eloquent](https://img.shields.io/badge/Eloquent_ORM-MySQL-2D3748?style=for-the-badge)](https://laravel.com/docs/eloquent)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Fonnte WA](https://img.shields.io/badge/WA_Gateway-Fonnte-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://fonnte.com/)

Sistem absensi siswa berbasis **QR Code + geofencing GPS**, notifikasi WhatsApp, dan dashboard RBAC multi-role.

**Stack target (migrasi penuh):** Laravel 12 · Inertia.js · React · Vite · Tailwind CSS · Eloquent · MySQL/MariaDB · Fonnte · Queue & Scheduler.

> Dokumentasi di [`docs/`](docs/INDEX.md) sudah ditulis untuk **Laravel** agar implementasi migrasi penuh berjalan normal. Schema database (Bahasa Indonesia) **tidak berubah**.

---

## Fitur utama

1. **Portal Siswa** — scan QR, GPS kondisional, fingerprint sesi tunggal, feedback audio/haptic, dispensasi.  
2. **TV Display** — token AES dinamis, SSE live absensi.  
3. **Guru Piket** — absensi satu-klik + IndexedDB offline + bulk-sync.  
4. **Wali Kelas** — kalender grid, Excel/PDF, broadcast WA.  
5. **Guru BK** — EWS, SP PDF, log konseling.  
6. **Kepala Sekolah** — tren, leaderboard, monitor piket.  
7. **Admin** — CRUD, import XLSX, audit, backup SQL, lifecycle, auto-alpha.

---

## Quick start (Laravel)

```bash
composer install
cp .env.example .env && php artisan key:generate
# set DB_* MySQL
php artisan migrate --seed
npm install && npm run build

php artisan serve          # http://localhost:8000
php artisan queue:work     # WA
php artisan schedule:work  # auto-alpha
```

Detail: [`docs/DEPLOY_LOKAL.md`](docs/DEPLOY_LOKAL.md) · checklist migrasi: [`docs/MIGRASI_LARAVEL.md`](docs/MIGRASI_LARAVEL.md).

---

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [`AGENTS.md`](AGENTS.md) | Aturan AI agent + perintah Laravel |
| [`docs/INDEX.md`](docs/INDEX.md) | Daftar isi |
| [`docs/PRD.md`](docs/PRD.md) | Product Requirements v3.11-L |
| [`docs/SRS.md`](docs/SRS.md) | Software Requirements |
| [`docs/MIGRASI_LARAVEL.md`](docs/MIGRASI_LARAVEL.md) | Checklist migrasi penuh |
| [`docs/SOP.md`](docs/SOP.md) | Struktur folder, auth, API, scheduler |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Kamus 12 tabel |
| [`docs/API.md`](docs/API.md) | Katalog `/api/*` |
| [`docs/WHATSAPP.md`](docs/WHATSAPP.md) | Fonnte & OpenWA: token, URL, kirim |
| [`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md) | Arsitektur Laravel + Inertia |

---

## Deploy production

Document root = `public/`. Wajib cron `schedule:run` + worker `queue:work`.  
Panduan: [`docs/DEPLOY.md`](docs/DEPLOY.md).
