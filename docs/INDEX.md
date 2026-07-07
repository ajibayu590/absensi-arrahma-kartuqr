# Dokumentasi — Sistem Absensi Siswa SMK Ar Rahma

**Versi PRD:** 3.7 | **Versi SOP:** 2.3 | **Tanggal:** 2026-06-05

Folder ini berisi seluruh dokumentasi proyek Sistem Absensi Siswa SMK Ar Rahma.
File ini (`INDEX.md`) adalah **daftar isi utama** dan titik navigasi untuk semua dokumen.

---

## Dokumen Inti

| Dokumen | Deskripsi |
|---------|-----------|
| [PRD.md](PRD.md) | Product Requirements Document v3.7 — Pernyataan masalah, kriteria sukses, aturan absensi, non-goals |
| [SOP.md](SOP.md) | Standard Operating Procedure v2.3 — Skema Prisma, SSE broadcast, struktur folder |
| [ARSITEKTUR.md](ARSITEKTUR.md) | Arsitektur sistem, tech stack, visual identity, keamanan |
| [DATABASE.md](DATABASE.md) | Kamus data lengkap 10 tabel MySQL (Bahasa Indonesia), FK constraints, seeding |
| [ALUR_KERJA.md](ALUR_KERJA.md) | 5 Diagram sekuens Mermaid (scan QR, cron alpha, fingerprint, offline, backup) |

## Spesifikasi Fitur (Per Role)

| Role | Dokumen | Deskripsi |
|------|---------|-----------|
| Siswa | [SISWA.md](SISWA.md) | Portal HP, QR scanner, geofencing GPS, browser fingerprint, audio/haptic feedback |
| Guru Piket | [GURU_PIKET.md](GURU_PIKET.md) | Dashboard manual scan, IndexedDB offline cache, auto-sync |
| Wali Kelas | [WALI_KELAS.md](WALI_KELAS.md) | Kalender grid GitHub-style, ekspor Excel/PDF, WA broadcast |
| Guru BK | [GURU_BK.md](GURU_BK.md) | Early Warning System, Surat Panggilan PDF, log konseling rahasia |
| Kepala Sekolah | [KEPALA_SEKOLAH.md](KEPALA_SEKOLAH.md) | Dashboard eksekutif, grafik tren, leaderboard disiplin |
| Admin | [ADMIN.md](ADMIN.md) | CRUD master data, audit trail, backup SQL, lifecycle management |

## Operasional & Pendukung

| Dokumen | Deskripsi |
|---------|-----------|
| [DEPLOY.md](DEPLOY.md) | Panduan deploy production di cPanel (Node.js Selector + Phusion Passenger) |
| [TASK.md](TASK.md) | Checklist tugas per fase (8 fase + tambahan), log perbaikan bug |
| [TECHNICAL.md](TECHNICAL.md) | Catatan teknikal: bug fix, fitur baru, kredensial, optimalisasi QR |
| [RESEARCH.md](RESEARCH.md) | Riset pasar, JTBD, analisis kompetitor, SWOT, audit keamanan |
| [QUESTIONS.md](QUESTIONS.md) | Pertanyaan klarifikasi & asumsi operasional awal proyek |

---

## Struktur Proyek (Singkat)

```
absensi_smk_ar_rahma/
├── AGENTS.md          ← Entry point universal untuk AI agent
├── README.md          ← Overview & getting started
├── docs/              ← SEMUA dokumentasi (folder ini)
│   └── INDEX.md       ← Daftar isi ini
├── prisma/            ← Schema Prisma & seed data
├── src/               ← Source code Next.js
│   ├── app/           ← App Router (pages, API routes)
│   ├── components/    ← Komponen UI reusable
│   └── lib/           ← Utility (prisma, auth, WA, SSE, dll)
└── public/            ← Static assets (PWA, icon, offline.html)
```

## Cara Membaca untuk AI Agent

1. **Mulai dari `AGENTS.md`** di root project — berisi konteks singkat & pointer ke folder ini
2. **Baca `INDEX.md`** ini untuk memahami peta dokumentasi
3. **Baca `PRD.md`** untuk memahami kebutuhan produk secara menyeluruh
4. **Baca `DATABASE.md`** untuk memahami skema data (semua tabel dalam Bahasa Indonesia)
5. **Baca `ARSITEKTUR.md`** untuk memahami tech stack & keamanan
6. **Baca fitur spesifik** sesuai role yang sedang dikerjakan
