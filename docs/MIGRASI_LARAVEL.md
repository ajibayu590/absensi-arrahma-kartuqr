# Checklist Migrasi Penuh Next.js → Laravel

**Versi:** 1.0 · **Tanggal:** 2026-07-29  
**Acuan produk:** [PRD.md](PRD.md) v3.11-L · [SRS.md](SRS.md) · [DATABASE.md](DATABASE.md)

Dokumen ini adalah **rencana kerja migrasi** agar Laravel menggantikan Next.js secara penuh dan operasional sekolah tetap normal.  
Dokumentasi ini mengikuti **spesifikasi proyek ini** (fitur & skema di `docs/`), bukan meniru struktur branch lain secara membabi buta.

---

## 0. Prinsip Migrasi

1. **Parity perilaku** > kesamaan kode.  
2. **Schema MySQL tidak berubah** (nama tabel/kolom/enum Bahasa Indonesia).  
3. **Path `/api/...` dipertahankan** sedapat mungkin agar port UI lebih aman.  
4. **Satu sumber runtime:** Laravel. Next.js hanya legacy/arsip.  
5. Setiap fase selesai → update [TASK.md](TASK.md).
6. **Baca [CATATAN_PARITAS.md](CATATAN_PARITAS.md) sebelum mulai coding** — dokumen tersebut berisi 20 gap konkret antara desain awal dan kode existing (broadcast WA, toleransi token QR, EWS BK, validasi nomor WA, dll) yang butuh keputusan sadar, bukan diasumsikan dari dokumen produk lama.

---

## 1. Fase 0 — Bootstrap Laravel

| # | Tugas | Done |
|---|--------|:----:|
| 0.1 | `composer create-project` Laravel 12 / set PHP 8.2+ | ☐ |
| 0.2 | Inertia + React + Vite + Tailwind + Breeze/Fortify adaptasi | ☐ |
| 0.3 | `config/absensi.php` + `.env.example` (DB, token, scheduler, queue) | ☐ |
| 0.4 | Auth provider → `Pengguna` + `kataSandi` | ☐ |
| 0.5 | Middleware `EnsureRole`, `ForceChangeTemporaryPassword` | ☐ |
| 0.6 | `HandleInertiaRequests` share user/flash | ☐ |

**Exit:** `php artisan serve` + halaman login Inertia tampil.

---

## 2. Fase 1 — Database Eloquent

| # | Tugas | Done |
|---|--------|:----:|
| 1.1 | Migration 12 tabel + enum sesuai DATABASE.md | ☐ |
| 1.2 | Model + relasi + casts enum | ☐ |
| 1.3 | Seeder Admin + Pengaturan wajib | ☐ |
| 1.4 | Import data existing (dump SQL) uji di staging | ☐ |

**Exit:** `migrate --seed` OK; relasi `Pengguna↔Siswa/Guru` terverifikasi.

---

## 3. Fase 2 — Auth & Portal Dasar

| # | Tugas | Done |
|---|--------|:----:|
| 2.1 | Login web + `POST /api/auth/login` session | ☐ |
| 2.2 | Logout, profile, change-password | ☐ |
| 2.3 | Fingerprint siswa + blokir 5 menit | ☐ |
| 2.4 | Redirect role (siswa/piket/dashboard) | ☐ |
| 2.5 | Layout App + Student + Guest | ☐ |

**Exit:** Semua role seed bisa login; sandi sementara memaksa ganti.

---

## 4. Fase 3 — Absensi Inti (Scan + TV + SSE)

| # | Tugas | Done |
|---|--------|:----:|
| 3.1 | `QrTokenService` AES-256 | ☐ |
| 3.2 | `GET /api/token-qr` + page `/display-qr` | ☐ |
| 3.3 | `GeofenceService` + flag `gps_geofencing_aktif` | ☐ |
| 3.4 | `POST /api/attendance/scan` + feedback UI | ☐ |
| 3.5 | `SseBroadcastService` + `live-stream` | ☐ |
| 3.6 | `WhatsAppService` + `KirimWaJob` (Fonnte **dan** OpenWA parity) | ☐ |
| 3.7 | Settings `wa_gateway_token` + `wa_gateway_url` + uji `/api/admin/wa-status` | ☐ |

**Exit:** Scan sukses menulis `Kehadiran`, muncul di TV, `LogWa` antre.

---

## 5. Fase 4 — Guru Piket Offline

| # | Tugas | Done |
|---|--------|:----:|
| 4.1 | Page `/scan` + manual POST/DELETE | ☐ |
| 4.2 | Dexie cache siswa + pending | ☐ |
| 4.3 | `bulk-sync` idempotent (hormati unique tanggal) | ☐ |
| 4.4 | Dispensasi GET/PUT piket + POST siswa | ☐ |

**Exit:** Offline → online sync tanpa corrupt unique key.

---

## 6. Fase 5 — Laporan, WA Broadcast, BK, Kepsek

| # | Tugas | Done |
|---|--------|:----:|
| 5.1 | `/reports` + `GET /api/reports` + Excel/PDF | ☐ |
| 5.2 | Broadcast WA + hubungi ortu | ☐ |
| 5.3 | `/bk` EWS + SP PDF + konseling | ☐ |
| 5.4 | Dashboard kepsek (tren, donat, leaderboard, monitor piket) | ☐ |
| 5.5 | Summary role-aware `/api/dashboard/summary` | ☐ |

**Exit:** Smoke tiap role dashboard tanpa 403/500.

---

## 7. Fase 6 — Admin & Lifecycle

| # | Tugas | Done |
|---|--------|:----:|
| 6.1 | CRUD kelas/siswa/guru/libur/jadwal piket/settings | ☐ |
| 6.2 | Import XLSX + sanitasi WA `62…` | ☐ |
| 6.3 | Backup SQL download (tanpa mysqldump shell) | ☐ |
| 6.4 | Lifecycle kenaikan/alumni | ☐ |
| 6.5 | Audit log + WA status/test + retry | ☐ |
| 6.6 | Alpha manual Admin + banner belum absen | ☐ |

**Exit:** Operasi TU harian bisa dilakukan tanpa Node.

---

## 8. Fase 7 — Scheduler, Deploy, Cutover

| # | Tugas | Done |
|---|--------|:----:|
| 7.1 | Command `absensi:auto-alpha` + schedule WIB | ☐ |
| 7.2 | Cron OS + `queue:work` supervisor | ☐ |
| 7.3 | PWA manifest/SW | ☐ |
| 7.4 | Deploy docroot `public/` (lihat DEPLOY.md) | ☐ |
| 7.5 | UAT sekolah (1 hari penuh) | ☐ |
| 7.6 | Cutover DNS; arsipkan Next.js | ☐ |

**Exit:** Satu hari operasional tanpa rollback ke Next.js.

---

## 9. Matriks Paritas Fitur (Produk Ini)

| Modul PRD | Endpoint / Page Laravel | Catatan |
|-----------|-------------------------|---------|
| F-AUTH | `/login`, `/api/auth/*` | Session, bukan JWT wajib |
| F-SISWA | `/student`, scan API | GPS kondisional |
| F-DISP | `/display-qr`, token-qr, live-stream | SSE |
| F-PIKET | `/scan`, manual, bulk-sync | Dexie |
| F-WALI | `/reports`, broadcast | Scope kelasWali |
| F-BK | `/bk`, ews, counseling | isBk |
| F-KEPSEK | dashboard widgets | read-mostly |
| F-ADMIN | `/admin/*`, `/api/admin/*` | import+backup |
| AUTO-ALPHA | artisan + HTTP secret | lock anti-race |
| DISPENSASI | student + picket APIs | unique per tanggal |

---

## 10. Definisi Selesai (DoD Migrasi Penuh)

Migrasi penuh dinyatakan **selesai** jika:

1. Tidak ada dependency runtime production ke Next.js/`server.js`.  
2. Semua item Fase 0–7 bertanda selesai di TASK.md.  
3. Checklist SOP §7 “Laravel jalan normal” 100% hijau di staging.  
4. Data production ter-restore/kompatibel schema DATABASE.md.  
5. Dokumentasi (`INDEX`, `AGENTS`, `API`, `SOP`) sudah Laravel-only.

---

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| SSE multi-PHP-FPM | Cache fan-out / shared store; dokumentasikan batasan |
| Queue tidak jalan | Supervisor wajib di DEPLOY; monitor `failed_jobs` |
| Beda timezone | `APP_TIMEZONE=Asia/Jakarta`; schedule timezone eksplisit |
| Password column custom | Tes login & reset sejak Fase 2 |
| Import XLSX beda parser | Samakan template kolom dengan PRD Fase 10 |

---

## Rujukan
[SOP.md](SOP.md) · [ARSITEKTUR.md](ARSITEKTUR.md) · [API.md](API.md) · [DEPLOY.md](DEPLOY.md) · [TASK.md](TASK.md)
