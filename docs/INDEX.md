# Dokumentasi — Sistem Absensi Siswa SMK Ar Rahma (Laravel)

**Versi PRD:** 3.11 | **Versi SRS:** 1.1 | **Stack target:** Laravel 12 + Inertia React | **Tanggal:** 2026-07-29

Folder ini adalah **sumber kebenaran dokumentasi** untuk migrasi penuh ke Laravel agar aplikasi berjalan normal (auth, absensi, WA, scheduler, deploy).

> **Schema MySQL tidak berubah** (Bahasa Indonesia, 12 tabel). Yang berubah adalah runtime aplikasi: dari Next.js → **Laravel monolith + Inertia React**.

---

## Dokumen Inti (Wajib Baca)

| Dokumen | Deskripsi |
|---------|-----------|
| [PRD.md](PRD.md) | Product Requirements v3.11 — fitur, non-goals, metrik |
| [SRS.md](SRS.md) | Software Requirements — FR/NFR, aturan bisnis, acceptance |
| [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) | Checklist migrasi penuh & kriteria “Laravel jalan normal” |
| [CATATAN_PARITAS.md](CATATAN_PARITAS.md) | **Wajib baca** — gap kode-vs-dokumentasi lama & keputusan yang harus diambil sebelum coding |
| [ARSITEKTUR.md](ARSITEKTUR.md) | Arsitektur Laravel + Inertia, keamanan, queue, scheduler |
| [SOP.md](SOP.md) | SOP implementasi: folder, model, middleware, command |
| [DATABASE.md](DATABASE.md) | Kamus data 12 tabel + catatan Eloquent |
| [API.md](API.md) | Katalog endpoint `/api/*` (Laravel controllers) |
| [WHATSAPP.md](WHATSAPP.md) | Fonnte & OpenWA: token, URL, kirim, antrean, uji koneksi |
| [FITUR.md](FITUR.md) | Katalog fitur × role |
| [SYSTEM_MAP.md](SYSTEM_MAP.md) | Peta modul Laravel (services, jobs, pages) |
| [ALUR_KERJA.md](ALUR_KERJA.md) | Sequence diagram (scan, alpha, offline, backup) |

## Spesifikasi Fitur (Per Role)

| Role | Dokumen |
|------|---------|
| Siswa | [SISWA.md](SISWA.md) |
| Guru Piket | [GURU_PIKET.md](GURU_PIKET.md) |
| Wali Kelas | [WALI_KELAS.md](WALI_KELAS.md) |
| Guru BK | [GURU_BK.md](GURU_BK.md) |
| Kepala Sekolah | [KEPALA_SEKOLAH.md](KEPALA_SEKOLAH.md) |
| Admin | [ADMIN.md](ADMIN.md) |

## Operasional

| Dokumen | Deskripsi |
|---------|-----------|
| [DEPLOY_LOKAL.md](DEPLOY_LOKAL.md) | Setup lokal PHP 8.2+ / Composer / Node / MySQL |
| [DEPLOY.md](DEPLOY.md) | Deploy production (cPanel PHP / VPS Nginx+PHP-FPM) |
| [TASK.md](TASK.md) | Checklist & log perubahan |
| [TECHNICAL.md](TECHNICAL.md) | Catatan teknikal migrasi |
| [RESEARCH.md](RESEARCH.md) | Riset & SWOT |
| [QUESTIONS.md](QUESTIONS.md) | Klarifikasi awal |

---

## Struktur Proyek Target (Laravel)

```
absensi_smk_ar_rahma/
├── AGENTS.md
├── README.md
├── app/
│   ├── Enums/                 ← Peran, StatusKehadiran, …
│   ├── Models/                ← Pengguna, Siswa, Kehadiran, …
│   ├── Http/Controllers/      ← Web (Inertia) + Api/
│   ├── Http/Middleware/       ← EnsureRole, ForceChangeTemporaryPassword
│   ├── Services/              ← QrToken, Geofence, WhatsApp, Sse, AutoAlpha
│   ├── Jobs/                  ← KirimWaJob
│   └── Console/Commands/      ← AbsensiAutoAlpha
├── routes/web.php · api.php · console.php
├── resources/js/              ← Inertia Pages (React) + Layouts + lib
├── database/migrations/ · seeders/
├── config/absensi.php
├── public/                    ← document root + Vite build + PWA
└── docs/                      ← dokumentasi (folder ini)
```

## Cara Baca untuk AI / Developer Migrasi

1. `AGENTS.md` → stack & aturan  
2. `INDEX.md` (ini)  
3. `PRD.md` + `SRS.md` → apa yang harus ada  
4. `MIGRASI_LARAVEL.md` → urutan kerja migrasi  
5. `DATABASE.md` → migration Eloquent  
6. `ARSITEKTUR.md` + `SOP.md` + `API.md` → cara implementasi  
7. Spec role sesuai modul yang dikerjakan  
8. Update `TASK.md` setiap fase selesai  
