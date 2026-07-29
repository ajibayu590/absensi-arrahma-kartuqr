# Panduan Deploy Production Laravel — SMK Ar Rahma

Dokumen ini menjelaskan deployment aplikasi absensi **Laravel 12** (Eloquent + Inertia/Vite) ke hosting **cPanel (PHP)** atau **VPS (Nginx + PHP-FPM)**.

> Bukan lagi Node.js Selector / Passenger untuk Next.js.

---

## Persyaratan

1. PHP **8.2+** dengan ekstensi: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `gd`/`imagick` (untuk gambar), `pcntl` (opsional worker).
2. Composer 2.x  
3. MySQL / MariaDB  
4. Node.js **hanya di CI/build** untuk `npm run build` (hasil ke `public/build`)  
5. Cron OS + proses `queue:work` (Supervisor / systemd)

---

## 1. Database

1. Buat database + user MySQL.  
2. Isi `.env`:

```env
APP_NAME="Absensi SMK Ar Rahma"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://absensi.contoh.sch.id
APP_TIMEZONE=Asia/Jakarta

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=absensi_smk_ar_rahma
DB_USERNAME=...
DB_PASSWORD=...

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

ABSENSI_TOKEN_SECRET= ganti_rahasia_panjang
SCHEDULER_SECRET= ganti_rahasia_scheduler
CRON_SECRET= ganti_rahasia_cron

AUTO_ALPHA_HOUR=7
AUTO_ALPHA_MINUTE=15
```

3. `php artisan key:generate`  
4. `php artisan migrate --force` (+ seed jika environment baru)  
5. Atau import dump SQL existing yang sudah sesuai [DATABASE.md](DATABASE.md).

---

## 2. Build & Upload

Di mesin build / CI:

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Unggah kode ke server **kecuali** `.env` lokal. Pastikan yang ikut: `vendor/` (atau composer di server), `public/build/`.

Document root virtual host / subdomain → folder **`public/`**.

```bash
php artisan storage:link
chmod -R ug+rwx storage bootstrap/cache
```

---

## 3. cPanel (PHP Application)

1. Subdomain document root = `.../public`.  
2. Pilih PHP 8.2+ di MultiPHP Manager.  
3. SSH/Terminal: `composer install --no-dev`, set `.env`, `migrate`, `storage:link`.  
4. Cron Jobs:

```
* * * * * cd /home/USER/path/app && php artisan schedule:run >> /dev/null 2>&1
```

5. Queue: gunakan **Setup Node/Python bukan** — pakai cron alternatif tiap menit `queue:work --stop-when-empty` **atau** akses SSH + screen/supervisor jika tersedia.

> Hosting shared terbatas: uji antrian WA; jika tidak ada worker panjang, gunakan `queue:work --stop-when-empty` di cron tiap 1 menit sebagai mitigasi.

---

## 4. VPS (Disarankan)

Nginx `root` → `public/`; PHP-FPM 8.2.  
Supervisor program:

```
command=php /var/www/absensi/artisan queue:work --sleep=1 --tries=3 --max-time=3600
```

Cron:

```
* * * * * cd /var/www/absensi && php artisan schedule:run >> /dev/null 2>&1
```

HTTPS (Let's Encrypt). Set `SESSION_SECURE_COOKIE=true`.

---

## 5. Verifikasi Production

- [ ] `/login` 200  
- [ ] Login admin & siswa  
- [ ] `/display-qr` QR refresh  
- [ ] Scan menulis DB + SSE  
- [ ] `php artisan absensi:auto-alpha --force` (staging)  
- [ ] Job WA muncul di `jobs` / `LogWa`  
- [ ] Backup SQL admin downloadable  

Checklist lengkap: [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) Fase 7 + [SOP.md](SOP.md) §7.

---

## 6. Keamanan

* `APP_DEBUG=false`  
* Jangan commit `.env`  
* Batasi permission `storage/`  
* Secret scheduler tidak boleh kosong  

---

## Rujukan
[DEPLOY_LOKAL.md](DEPLOY_LOKAL.md) · [ARSITEKTUR.md](ARSITEKTUR.md) · [SOP.md](SOP.md)
