# Panduan Pengembangan & Deploy Lokal — Laravel

Setup lokal **Sistem Absensi SMK Ar Rahma** pada stack **Laravel 12 + Inertia React**.

---

## Aplikasi yang Disiapkan

1. **PHP 8.2+** + ekstensi Laravel standar (`pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`).  
2. **Composer 2** — [getcomposer.org](https://getcomposer.org/)  
3. **Node.js 18+ LTS** — hanya untuk Vite (`npm run dev` / `build`)  
4. **MySQL / MariaDB** — Laragon / XAMPP / Docker  
5. **Git** + **VS Code**  
6. (Opsional) Redis jika ingin `QUEUE_CONNECTION=redis`

---

## Prosedur Lokal

### 1. Database
Buat DB `absensi_smk_ar_rahma` di MySQL.

### 2. Install

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env`:

```env
APP_TIMEZONE=Asia/Jakarta
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=absensi_smk_ar_rahma
DB_USERNAME=root
DB_PASSWORD=

QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database

ABSENSI_TOKEN_SECRET=dev_token_secret_ganti
SCHEDULER_SECRET=dev_scheduler_secret
AUTO_ALPHA_HOUR=7
AUTO_ALPHA_MINUTE=15
```

```bash
php artisan migrate --seed
php artisan storage:link
npm install
```

### 3. Jalankan (3 terminal)

```bash
php artisan serve
# http://localhost:8000

npm run dev

php artisan queue:work
# opsional scheduler lokal:
php artisan schedule:work
```

### 4. Smoke test
1. Login admin (lihat seeder / TECHNICAL.md).  
2. Buka `/display-qr`.  
3. Login siswa → scan (geofencing bisa dimatikan di Pengaturan untuk uji lokal).  
4. `php artisan absensi:auto-alpha --force`.

---

## Troubleshooting

| Gejala | Perbaikan |
|--------|-----------|
| 500 setelah clone | `composer install`, `key:generate`, permission `storage/` |
| CSRF / 419 | Pastikan `APP_URL` cocok; pakai credentials pada fetch API |
| WA tidak terkirim | `queue:work` belum jalan; cek `LogWa` / `failed_jobs` |
| QR invalid | Samakan `ABSENSI_TOKEN_SECRET` TV & API |
| Migrate gagal enum | Pastikan MySQL version mendukung; ikuti DATABASE.md |

---

## Rujukan
[SOP.md](SOP.md) · [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) · [DEPLOY.md](DEPLOY.md) · [AGENTS.md](../AGENTS.md)
