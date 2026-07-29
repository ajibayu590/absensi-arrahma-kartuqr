# SOP — Implementasi Laravel 12 (Migrasi Penuh)

**Versi:** 3.0-L  
**Tanggal:** 2026-07-29  
**Referensi:** [PRD.md](PRD.md) · [DATABASE.md](DATABASE.md) · [ARSITEKTUR.md](ARSITEKTUR.md) · [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md)

SOP ini adalah panduan implementasi agar Laravel **berjalan normal**: bootstrap, auth, API parity, scheduler, queue, dan halaman Inertia sesuai produk.

---

## BAGIAN 1: STRUKTUR FOLDER

```
absensi_smk_ar_rahma/
├── app/
│   ├── Enums/
│   │   ├── Peran.php
│   │   ├── StatusKehadiran.php
│   │   ├── StatusLogWa.php
│   │   ├── HariPiket.php
│   │   └── StatusDispensasi.php
│   ├── Models/
│   │   ├── Pengguna.php          ← Authenticatable
│   │   ├── Guru.php
│   │   ├── Kelas.php
│   │   ├── Siswa.php
│   │   ├── Kehadiran.php
│   │   ├── LogWa.php
│   │   ├── Pengaturan.php
│   │   ├── HariLibur.php
│   │   ├── LogAuditAdmin.php
│   │   ├── LogKonselingBk.php
│   │   ├── JadwalPiket.php
│   │   └── DispensasiKeterlambatan.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/             ← Login, ChangePassword (Inertia)
│   │   │   └── Api/              ← REST JSON parity /api/*
│   │   ├── Middleware/
│   │   │   ├── EnsureRole.php
│   │   │   ├── ForceChangeTemporaryPassword.php
│   │   │   └── HandleInertiaRequests.php
│   │   └── Requests/
│   ├── Services/
│   │   ├── QrTokenService.php
│   │   ├── GeofenceService.php
│   │   ├── WhatsAppService.php
│   │   ├── SseBroadcastService.php
│   │   └── AutoAlphaService.php
│   ├── Jobs/KirimWaJob.php
│   └── Console/Commands/AbsensiAutoAlphaCommand.php
├── routes/
│   ├── web.php                   ← Inertia pages + auth
│   ├── api.php                   ← /api/*
│   └── console.php               ← schedule
├── resources/js/
│   ├── Pages/                    ← Dashboard, Scan, Student, Admin, Bk, Reports, DisplayQr
│   ├── Layouts/                  ← AppLayout, StudentLayout, GuestLayout
│   └── lib/                      ← api.js, fingerprint.js, offline-db.js
├── database/migrations/
├── database/seeders/DatabaseSeeder.php
├── config/absensi.php
├── public/                       ← index.php, build/, manifest, SW
└── docs/
```

**Aturan model Eloquent:**
* `protected $table` sesuai nama tabel Indonesia bila perlu.  
* `$primaryKey = 'id'`; timestamps: map `created_at`/`updated_at` **atau** kolom `dibuatPada`/`diubahPada` via `const CREATED_AT` / `UPDATED_AT`.  
* Jangan mass-assign `kataSandi` tanpa hash (`Hash::make`).

---

## BAGIAN 2: AUTH & RBAC

1. Set `config/auth.php` provider `users` → model `Pengguna`.  
2. `Pengguna::getAuthPassword()` return `$this->kataSandi`.  
3. Login menerima **email atau NISN** + `kataSandi` + opsional `sidikJariBrowser`.  
4. Redirect:
   * `isPasswordSementara` → `/change-password`
   * `SISWA` → `/student`
   * Guru piket hari ini (tanpa wali/bk khusus) boleh `/scan`
   * Lainnya → `/dashboard`
5. Middleware `role:ADMIN` menolak 403 jika peran tidak cocok.  
6. Guru BK dicek `guru.isBk`; wali dicek relasi `kelasWali`; piket dicek `jadwalPiket` hari ini (atau Admin bypass).

---

## BAGIAN 3: MIGRATION & SEED

1. Buat migration yang mereplikasi [`DATABASE.md`](DATABASE.md) (12 tabel + enum).  
2. Seed minimal:
   * Admin `admin@arrahma.sch.id`
   * Key `Pengaturan`: GPS, `gps_geofencing_aktif`, jam masuk/toleransi, WA delay, token placeholder
   * Opsional: kelas/siswa/guru demo  
3. Perintah: `php artisan migrate --seed` harus sukses di MySQL kosong.

---

## BAGIAN 4: API (`routes/api.php`)

Path **wajib** (parity produk). Detail request/response: [API.md](API.md).

| Method | Path | Middleware |
|--------|------|------------|
| POST | `/api/auth/login` | guest |
| POST | `/api/auth/logout` | auth |
| GET | `/api/auth/profile` | auth |
| POST | `/api/auth/change-password` | auth |
| POST | `/api/attendance/scan` | auth + siswa |
| POST/DELETE | `/api/attendance/manual` | auth + piket/admin |
| POST | `/api/attendance/bulk-sync` | auth + piket/admin |
| GET | `/api/attendance/piket-students` | auth + piket/admin |
| GET | `/api/attendance/live-stream` | publik SSE |
| POST | `/api/attendance/auto-alpha` | secret atau admin |
| GET | `/api/token-qr` | publik (TV) / auth sesuai kebijakan |
| GET | `/api/settings/geofencing` | auth |
| GET | `/api/student/dashboard` | siswa |
| GET/POST | `/api/student/dispensation` | siswa |
| GET/PUT | `/api/picket/dispensations` | piket/admin |
| GET | `/api/picket-schedules/today` | auth |
| GET | `/api/dashboard/summary` | staf |
| POST | `/api/dashboard/broadcast` | wali/admin |
| GET | `/api/reports` | wali/kepsek/admin |
| GET | `/api/bk/ews` | bk/admin |
| POST | `/api/bk/counseling` | bk/admin |
| GET | `/api/cron/wa-digest` | secret/admin |
| * | `/api/admin/*` | admin |

Controller diletakkan di `App\Http\Controllers\Api\...`.

---

## BAGIAN 5: HALAMAN INERTIA (`routes/web.php`)

| Path | Page React | Role |
|------|------------|------|
| `/login` | Auth/Login | Guest |
| `/change-password` | Auth/ChangePassword | Auth |
| `/dashboard` | Dashboard/Index | Staf |
| `/scan` | Scan/Index | Piket |
| `/student` | Student/Portal | Siswa |
| `/display-qr` | DisplayQr/Index | Publik |
| `/reports` | Reports/Index | Wali/Kepsek/Admin |
| `/bk` | Bk/Index | BK |
| `/admin/classes` | Admin/Classes | Admin |
| `/admin/students` | Admin/Students | Admin |
| `/admin/teachers` | Admin/Teachers | Admin |
| `/admin/holidays` | Admin/Holidays | Admin |
| `/admin/picket-schedules` | Admin/PicketSchedules | Admin |
| `/admin/settings` | Admin/Settings | Admin |

Setiap page memanggil `/api/...` via `fetch`/`axios` dengan credentials cookie.

---

## BAGIAN 6: SCHEDULER & QUEUE

`routes/console.php` (contoh):

```php
Schedule::command('absensi:auto-alpha')
    ->dailyAt(sprintf('%02d:%02d', config('absensi.auto_alpha_hour'), config('absensi.auto_alpha_minute')))
    ->timezone('Asia/Jakarta');
```

Production crontab:
```
* * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1
```

Supervisor/systemd untuk `php artisan queue:work --sleep=1 --tries=3`.

---

## BAGIAN 7: KRITERIA “LARAVEL JALAN NORMAL”

Centang sebelum dianggap migrasi penuh sukses:

- [ ] `composer install` + `migrate --seed` tanpa error  
- [ ] Login Admin/Siswa/Guru berhasil; force password jalan  
- [ ] `/display-qr` tampil QR berganti; SSE menerima event setelah scan  
- [ ] Scan siswa (geofence on/off) sesuai `Pengaturan`  
- [ ] Piket manual + offline Dexie + bulk-sync  
- [ ] `queue:work` mengirim/mencatat `LogWa`  
- [ ] `absensi:auto-alpha --force` menandai ALPHA dengan filter benar  
- [ ] Admin CRUD + import XLSX + backup `.sql`  
- [ ] Build Vite `npm run build` + halaman Inertia 200  
- [ ] Deploy `public/` sebagai docroot; storage writable  

---

## BAGIAN 8: LARANGAN

* Jangan menulis fitur baru di tree Next.js legacy.  
* Jangan mengubah nama kolom DB ke snake_case English tanpa approval.  
* Jangan mengandalkan `window.confirm` untuk aksi destruktif.  
* Jangan mengekspos auto-alpha/digest tanpa secret di production.
* Jangan porting typo config `api/cron-alpha` dari middleware Next.js lama — route asli adalah `/api/attendance/auto-alpha` dan `/api/cron/wa-digest`; gunakan nama route yang benar di route grouping Laravel.
* Jangan berasumsi PDF selalu bisa di-render server-side ala React: sebagian komponen produk lama (`JadwalPiketPdf`, `RekapPdfButton`, `SpPdfButton`) di-render **client-side** di browser, sedangkan `student-card` di-render **server-side**. Petakan strategi render (JS client-side vs PHP DomPDF/mPDF server-side) per dokumen sebelum implementasi — lihat [CATATAN_PARITAS.md](CATATAN_PARITAS.md) #10.
* Jangan mengasumsikan detail perilaku lama (toleransi token, EWS, broadcast, validasi WA) tanpa membaca [CATATAN_PARITAS.md](CATATAN_PARITAS.md) terlebih dahulu.

---

## Rujukan
[API.md](API.md) · [FITUR.md](FITUR.md) · [DEPLOY.md](DEPLOY.md) · [TASK.md](TASK.md)
