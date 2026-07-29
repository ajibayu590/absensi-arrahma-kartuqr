# Katalog Fitur — Target Laravel

**Versi:** 1.1-L · **Tanggal:** 2026-07-29  
**Acuan:** PRD v3.11-L · SRS 1.1 · SOP 3.0-L

Indeks fitur produk **sama** dengan spesifikasi proyek ini; kolom implementasi menunjuk artefak Laravel.

---

## 1. Matriks Fitur × Role

| Modul | Siswa | Piket | Wali | BK | Kepsek | Admin |
|-------|:-----:|:-----:|:----:|:--:|:------:|:-----:|
| Login / ganti sandi | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Fingerprint sesi tunggal | ✓ | — | — | — | — | — |
| Portal + scan QR | ✓ | — | — | — | — | Konfig GPS |
| Dispensasi | Ajukan | Approve | — | — | — | Approve |
| TV QR + SSE | Publik | — | — | — | — | — |
| Absensi manual + offline | — | ✓ | Edit laporan* | — | — | ✓ |
| Rekap / Excel / PDF | — | — | ✓ | — | ✓ | ✓ |
| Broadcast WA | — | — | ✓ | — | — | ✓ |
| EWS / SP / konseling | — | — | Baca** | ✓ | Status | ✓ |
| Dashboard eksekutif | — | — | — | — | ✓ | ✓ |
| CRUD + import + backup | — | — | — | — | — | ✓ |
| Auto-alpha / digest | — | — | Terima | — | — | Trigger |

\*Edit status lewat `/reports`, bukan gerbang Dexie.  
\*\*Sesuai kebijakan BK (read-only).

---

## 2. Mapping Modul → Laravel

| ID | Nama | Page / Route | Service / Job |
|----|------|--------------|---------------|
| F-AUTH-* | Auth | `/login`, `/change-password`, `/api/auth/*` | Session `Pengguna` |
| F-SISWA-* | Portal & scan | `/student`, `/api/attendance/scan` | QrToken, Geofence, feedback JS |
| F-DISP-* | TV | `/display-qr`, `/api/token-qr`, `live-stream` | SseBroadcast |
| F-PIKET-* | Gerbang | `/scan`, manual, bulk-sync | Dexie `resources/js/lib` |
| F-WALI-* | Rekap kelas | `/reports`, broadcast | WhatsAppService + Job |
| F-BK-* | EWS/SP | `/bk` | Bk controllers + PDF |
| F-KEPSEK-* | Eksekutif | `/dashboard` widgets | Summary API |
| F-ADMIN-* | TU | `/admin/*`, `/api/admin/*` | Import, Backup, Lifecycle |
| F-AUTO-* | Otomasi | `absensi:auto-alpha`, schedule | AutoAlphaService, KirimWaJob |
| F-DISPENSASI-* | Dispensasi | student + picket APIs | Model Dispensasi |
| F-PWA-* | PWA | `public/manifest.json`, SW | — |

Detail perilaku tetap di dokumen role: SISWA, GURU_PIKET, WALI_KELAS, GURU_BK, KEPALA_SEKOLAH, ADMIN.

---

## 3. Halaman Inertia

| Path | Page | Role |
|------|------|------|
| `/login` | Auth/Login | Guest |
| `/change-password` | Auth/ChangePassword | Auth |
| `/student` | Student/Portal | Siswa |
| `/display-qr` | DisplayQr/Index | Publik |
| `/dashboard` | Dashboard/Index | Staf |
| `/scan` | Scan/Index | Piket |
| `/reports` | Reports/Index | Wali/Kepsek/Admin |
| `/bk` | Bk/Index | BK |
| `/admin/classes` … `/admin/settings` | Admin/* | Admin |

---

## 4. Library Frontend (`resources/js/lib`)

| Modul | Fungsi |
|-------|--------|
| `api.js` | fetch JSON + credentials + CSRF |
| `fingerprint.js` | sidik jari browser siswa |
| `offline-db.js` | Dexie: LocalSiswa, KehadiranTertunda |
| `feedback.js` | bip + vibrate |

---

## 5. Dependensi Utama

**PHP (Composer):** laravel/framework 12, inertiajs/inertia-laravel, (breeze), maatwebsite/excel atau PhpSpreadsheet, barryvdh/laravel-dompdf atau setara PDF.  
**JS (npm):** react, @inertiajs/react, vite, tailwindcss, html5-qrcode, dexie, react-hot-toast, xlsx, lucide-react.

---

## 6. Rujukan
[API.md](API.md) · [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) · [SOP.md](SOP.md) · spec role
