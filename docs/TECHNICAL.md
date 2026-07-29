# Catatan Teknikal — Target Laravel

Dokumen ini menyimpan catatan teknikal **untuk migrasi & operasi Laravel**.  
Catatan historis spesifik file Next.js (`src/app/...`) dianggap **arsip pra-migrasi** dan tidak menjadi acuan implementasi baru.

---

## 1. Keputusan Platform

| Item | Keputusan |
|------|-----------|
| Runtime | Laravel 12 / PHP 8.2+ |
| UI | Inertia + React + Vite + Tailwind |
| Auth | Session `Pengguna.kataSandi` |
| ORM | Eloquent; kolom Bahasa Indonesia |
| WA | `KirimWaJob` + queue |
| Auto-alpha | `php artisan absensi:auto-alpha` + scheduler WIB |
| QR | `QrTokenService` AES-256, secret `ABSENSI_TOKEN_SECRET` |

Lihat: [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) · [ARSITEKTUR.md](ARSITEKTUR.md) · [SOP.md](SOP.md).

---

## 2. Env wajib (ringkas)

`APP_KEY`, `APP_TIMEZONE=Asia/Jakarta`, `DB_*`, `ABSENSI_TOKEN_SECRET`, `SCHEDULER_SECRET`, `QUEUE_CONNECTION`, `AUTO_ALPHA_HOUR`, `AUTO_ALPHA_MINUTE`.

---

## 3. Kredensial default (produk)

Saat seeder Laravel diimplementasikan, samakan konvensi produk:

* Admin email domain sekolah + sandi sementara wajib diganti.  
* Siswa: email `{NISN}@arrahma.sch.id`, sandi awal NISN, `isPasswordSementara=true`.  
* Nomor WA orang tua disanitasi ke `62…`.

---

## 4. Kunci Pengaturan (`Pengaturan`)

Wajib konsisten di UI Admin & service:

* `gps_sekolah_latitude`, `gps_sekolah_longitude`, `gps_sekolah_radius`  
* `gps_geofencing_aktif`  
* `jam_masuk`, `jam_toleransi`  
* `wa_gateway_token`, `wa_delay_min`, `wa_delay_max`

---

## 5. Arsip bug Next.js (historis)

Perbaikan kamera `html5-qrcode`, cookie HTTPS, dan mismatch kunci GPS yang pernah terjadi di tree Next.js **tetap relevan secara produk** saat port ke Inertia React:

* Scanner: hindari unmount keras kontainer `#reader` (toggle `hidden`).  
* Cookie/session: `SECURE` di HTTPS.  
* Samakan kunci `Pengaturan` antara Settings UI dan `GeofenceService` / scan.

Detail file lama tidak digandakan di sini agar tidak mengarahkan agent ke path Next.js.

---

## 6. Rujukan
[TASK.md](TASK.md) · [DEPLOY_LOKAL.md](DEPLOY_LOKAL.md) · [API.md](API.md)
