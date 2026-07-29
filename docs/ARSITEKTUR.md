# Arsitektur & Spesifikasi Teknis (Laravel 12 + Inertia React)

**Versi:** 3.0-L · **Tanggal:** 2026-07-29  
**Tujuan:** Arsitektur target migrasi penuh agar sistem absensi berjalan normal di Laravel.

---

## 1. Desain Arsitektur

Monolith **Laravel 12**: backend Eloquent + HTTP controllers; frontend **Inertia.js + React (Vite)**. Satu domain, session auth, API JSON `/api/*` untuk scan/SSE/offline sync (kompatibel path legacy).

```
┌──────────────────────────────────────────────────────────┐
│           FRONTEND (Inertia React + Vite + Tailwind)     │
│  Portal Siswa · Dashboard Staf · TV /display-qr          │
│  html5-qrcode · Dexie (piket offline) · react-hot-toast  │
└────────────────────────────▲─────────────────────────────┘
                             │ Inertia visits + fetch /api + SSE
┌────────────────────────────▼─────────────────────────────┐
│                    BACKEND (Laravel 12)                  │
│  Session Auth · EnsureRole · ForceChangePassword         │
│  Services: QrToken · Geofence · WhatsApp · Sse · AutoAlpha│
│  Jobs: KirimWaJob · Scheduler: absensi:auto-alpha        │
└──────────────────────┬────────────────────┬──────────────┘
                       │                    │
┌──────────────────────▼───────┐    ┌───────▼──────────────┐
│     Eloquent ORM (MySQL)     │    │  Fonnte WA Gateway   │
│  Model = tabel Bahasa ID     │    │  REST + queue delay    │
└──────────────────────────────┘    └──────────────────────┘
```

---

## 2. Frontend (UI/UX)

* **Stack:** Inertia React, Vite, Tailwind CSS, Lucide, html5-qrcode, Dexie, react-hot-toast.  
* **Brand:** Primary emerald-600 (`#16a34a`), Plus Jakarta Sans, light/dark.  
* **Pola UI (tetap dari PRD produk):**
  * Dashboard bento grid  
  * Kalender kehadiran GitHub-style + slide-over  
  * TV dark-theme + countdown token ~10s + live log  
  * Haptic/audio feedback scan siswa  
  * Toast bouncy di gerbang piket  
* **Offline piket:** IndexedDB Dexie (database `AbsensiOfflineDatabase`, versi 1; tabel `siswa` indeks `id, nisn, nama, namaKelas`, tabel `kehadiran_tertunda` indeks `++id, idSiswa, tanggal, statusSync`) → `POST /api/attendance/bulk-sync` saat online. Nama database & skema indeks ini **wajib direplikasi identik** bila IndexedDB tetap dipakai di frontend Laravel/Inertia.  
* **PWA — status nyata (bukan offline-app-shell penuh):**
  * `manifest.json`: icon 192/512 (`purpose: any` + `maskable`), `theme_color #059669`, **tanpa** `orientation` (sengaja dihapus agar rotasi tablet diizinkan), tanpa `shortcuts`/`screenshots`.
  * `service-worker.js` precache hanya `/`, `/icon-192.png`, `/icon-512.png` — **event `fetch` membypass cache sepenuhnya** (`respondWith(fetch(event.request))` tanpa fallback cache/offline). Artinya **SW bukan mekanisme offline utama**; ketahanan offline sesungguhnya datang dari Dexie/IndexedDB di halaman Guru Piket, bukan dari Service Worker.
  * `public/offline.html` ada sebagai fallback statis tapi **tidak pernah dipanggil** oleh service worker manapun — saat ini file mati/tidak terpakai.
  * Handler `push` + `notificationclick` terdaftar di SW (siap terima Web Push), tapi **tidak ada kode subscribe** (`pushManager.subscribe`, VAPID key, endpoint backend penyimpan subscription) di manapun. Fitur push notification **belum aktif/inert** — jangan diasumsikan sudah berfungsi saat migrasi.

---

## 3. Backend Laravel

### 3.1 Auth & RBAC
* Model: `App\Models\Pengguna` (`config/auth.php` → providers).  
* Password: kolom `kataSandi` + `getAuthPassword()`.  
* Login: web Inertia + `POST /api/auth/login` (JSON) — session cookie.  
* Siswa: simpan/cek `sidikJariBrowser`; mismatch → invalidate session lain + `absenDiblokirHingga = now()+5m`.  
* Middleware: `auth`, `role:ADMIN|GURU|...`, `force.password`.

### 3.2 Services (wajib ada)
| Service | Tanggung jawab |
|---------|----------------|
| `QrTokenService` | AES-256-CBC encrypt/decrypt token QR; secret env `ABSENSI_TOKEN_SECRET` |
| `GeofenceService` | Haversine + baca `Pengaturan` radius/flag aktif |
| `WhatsAppService` | Kirim via **Fonnte** atau **OpenWA** (NestJS/CLI); baca `wa_gateway_token` + `wa_gateway_url`; tulis `LogWa`; dispatch `KirimWaJob` |
| `SseBroadcastService` | Fan-out event absensi ke klien TV (cache list / stream) |
| `AutoAlphaService` | Tandai ALPHA + filter libur/magang + trigger WA/digest |

### 3.3 Queue & Scheduler
* Queue driver: `database` (default sederhana) atau `redis`.  
* Job `KirimWaJob`: delay acak `wa_delay_min`–`wa_delay_max` (detik).  
* `routes/console.php`: jadwalkan `absensi:auto-alpha` jam WIB dari env/`config/absensi.php`.  
* HTTP fallback: `POST /api/attendance/auto-alpha` + header `X-Scheduler-Secret`.  
* Cache lock / atomic flag mencegah double-run.

**⚠️ Kode existing punya 3 jalur trigger paralel** (bukan 1) — jangan porting ketiganya mentah-mentah tanpa konsolidasi:
1. `server.js` `setInterval` polling, trigger sekali jika waktu WIB masuk jendela toleransi 20 menit dari `AUTO_ALPHA_HOUR`/`AUTO_ALPHA_MINUTE` (env).
2. Halaman `/display-qr` (client-side) memicu sendiri berbasis `jam_toleransi` yang tersimpan di `Pengaturan` (DB) — sumber waktu **berbeda** dari #1.
3. "JIT safety net": `runAutoAlpha(false)` dipanggil ulang setiap kali `GET /api/reports` atau `GET /api/dashboard/summary` diakses siapa pun.

Lock `isProcessing` di kode lama hanya variabel in-memory single-process — **tidak aman** untuk PHP-FPM multi-worker. Untuk Laravel, gunakan **satu** sumber jadwal (disarankan: `routes/console.php` saja) + lock berbasis `Cache::lock()` atau kolom DB, dan hapus jalur trigger duplikat #2/#3 kecuali diputuskan tetap dipertahankan. Detail keputusan: [CATATAN_PARITAS.md](CATATAN_PARITAS.md) #9.

### 3.4 SSE
* `GET /api/attendance/live-stream` publik (TV).  
* Setelah scan/manual sukses → `SseBroadcastService::broadcast([...])`.  
* Implementasi disarankan cache-backed polling stream agar cocok multi-worker PHP-FPM (hindari hanya memory registry proses tunggal tanpa dokumentasi batasan).

---

## 4. Keamanan

* Session `httpOnly` cookie; HTTPS di production (`SESSION_SECURE_COOKIE=true`).  
* Bcrypt untuk `kataSandi`.  
* Validasi Form Request / `$request->validate()` termasuk import XLSX.  
* RBAC di middleware **dan** policy/cek di controller.  
* Secret scheduler & cron terpisah di `.env`.  
* `LogAuditAdmin` untuk aksi kritis Admin.  
* Token QR berumur pendek; geofencing opsional via flag DB.

**Haversine (sama produk):**  
\[
d = 2r \arcsin\sqrt{\sin^2(\Delta\phi/2)+\cos\phi_1\cos\phi_2\sin^2(\Delta\lambda/2)}
\]  
Tolak jika \(d >\) `gps_sekolah_radius` saat geofencing aktif.

### 4.1 Catatan Implementasi Nyata (Penting untuk Parity Laravel)

* **Kunci AES QR = turunan `JWT_SECRET`.** Implementasi produk **tidak** memakai secret AES terpisah: `SECRET_KEY = SHA256(JWT_SECRET)` (32 byte), dipakai langsung sebagai key `aes-256-cbc`. Artinya secret sesi login dan secret enkripsi QR **adalah satu nilai yang sama**. Sebelum coding Laravel, putuskan salah satu:
  1. Ikuti perilaku lama (derive AES key dari secret sesi/`APP_KEY`), atau  
  2. Pisahkan jadi `ABSENSI_TOKEN_SECRET` khusus (lebih aman, tapi mengubah kontrak — token lama otomatis invalid saat cutover).
* **Toleransi umur token QR aktual: +60 detik / −2 detik** (`selisihWaktu > 60000 || selisihWaktu < -2000`), **bukan 10 detik**. Gunakan nilai ini sebagai baseline parity kecuali ada keputusan produk baru.
* **Cookie sesi di produk existing selalu `secure: true`** (dipaksa, tanpa cek `NODE_ENV`) — konsekuensinya browser modern **menolak** menyimpan cookie ini di akses HTTP biasa (non-HTTPS) saat development lokal. Laravel harus eksplisit: `SESSION_SECURE_COOKIE=true` di production, dan longgarkan di lokal (`http://localhost`) agar tidak menyulitkan tim dev.
* **RBAC dihitung ulang per-request dari relasi database**, bukan dari klaim statis di token: status Wali Kelas (`Guru.kelasWali`), Guru BK (`Guru.isBk`), dan Guru Piket hari ini (`JadwalPiket` hari berjalan) selalu di-query ulang di setiap endpoint terkait. Efeknya: perubahan penugasan berlaku instan tanpa perlu re-login/re-issue token. Desain policy Laravel (Gate/Policy) **harus** meniru pola live-query ini, bukan meng-cache role di token/JWT.
* **String role legacy yang tidak pernah valid**: beberapa kode lama membandingkan `payload.peran` dengan `"WALI_KELAS"`, `"GURU_PIKET"`, `"GURU_BK"` — nilai ini **tidak ada** di enum `Peran` (hanya `ADMIN`, `KEPALA_SEKOLAH`, `GURU`, `SISWA`), sehingga kondisi tersebut selalu `false` dan otorisasi sesungguhnya 100% berasal dari relasi (`kelasWali`/`isBk`/`JadwalPiket`). Jangan porting string-check semacam ini ke Laravel — gunakan hanya pola relasi.
* **Auto-alpha punya dua jalur otorisasi independen** pada satu endpoint: (a) header `X-Scheduler-Secret` cocok dengan `SCHEDULER_SECRET`, **atau** (b) body `{ force: true }` + sesi `ADMIN`. Keduanya cukup salah satu (OR), tidak perlu kombinasi.
* **`SCHEDULER_SECRET` punya fallback hardcoded** di kode jika env kosong (`"absensi_smk_ar_rahma_scheduler_secret_key_2026"`). Ini **bukan fail-safe** — endpoint tetap bisa dipanggil dengan nilai default yang bisa ditebak jika Admin lupa mengisi env. Laravel **wajib** menolak start / melempar error config jika `SCHEDULER_SECRET` kosong, bukan memakai default.
* **Format header berbeda antar secret**: `auto-alpha` memakai header custom `X-Scheduler-Secret: {secret}` (tanpa prefix), sedangkan `cron/wa-digest` memakai `Authorization: Bearer {CRON_SECRET}`. Samakan konvensi atau dokumentasikan keduanya secara eksplisit di middleware Laravel.

---

## 5. Konfigurasi Env Inti

| Key | Fungsi |
|-----|--------|
| `APP_KEY` | Enkripsi Laravel |
| `DB_*` | MySQL |
| `JWT_SECRET` (atau `APP_KEY` jika disatukan) | Secret sesi **dan** basis derive kunci AES QR — app harus **gagal start** (fail-fast) jika kosong, sama seperti perilaku produk existing (`throw` saat modul dimuat) |
| `ABSENSI_TOKEN_SECRET` *(opsional — hanya jika diputuskan dipisah dari secret sesi, lihat §4.1)* | Kunci AES QR independen |
| `SCHEDULER_SECRET` | Proteksi auto-alpha HTTP — **wajib diisi**, jangan beri default hardcoded di kode |
| `CRON_SECRET` | Proteksi digest WA HTTP via header `Authorization: Bearer {secret}` |
| `QUEUE_CONNECTION` | `database` / `redis` |
| `FONNTE_TOKEN` | Fallback token WA jika `Pengaturan.wa_gateway_token` kosong |
| `WA_GATEWAY_URL` | Fallback URL (`https://api.fonnte.com` atau base OpenWA) |
| `AUTO_ALPHA_HOUR` / `MINUTE` | Jadwal WIB trigger auto-alpha (scheduler) |
| `AUTO_ALPHA_INTERVAL_MS` | Interval polling `setInterval` scheduler (bukan jadwal trigger) — default produk lama `30000` ms; di Laravel biasanya tidak diperlukan karena `schedule:run` sudah per-menit via cron |
| `SESSION_SECURE_COOKIE` | `true` di production HTTPS; `false`/unset untuk dev HTTP lokal |

Lihat juga `config/absensi.php`. Detail WA: **[WHATSAPP.md](WHATSAPP.md)**. Detail catatan implementasi nyata & keputusan yang perlu diambil: **[CATATAN_PARITAS.md](CATATAN_PARITAS.md)**.

---

## 6. Deploy Runtime

* Document root: `public/`.  
* `php artisan config:cache && route:cache && view:cache` (production).  
* Proses long-running: **queue worker** + **cron** `* * * * * php artisan schedule:run`.  
* `storage:link` untuk foto bukti dispensasi / aset.

Detail: [DEPLOY_LOKAL.md](DEPLOY_LOKAL.md) · [DEPLOY.md](DEPLOY.md).

---

## 7. Rujukan
[PRD.md](PRD.md) · [SOP.md](SOP.md) · [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) · [AGENTS.md](../AGENTS.md)
