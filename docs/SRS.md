# Software Requirements Specification (SRS) — Laravel Target

**Dokumen:** SRS-ABS-001-L  
**Versi:** 1.1  
**Tanggal:** 2026-07-29  
**PRD:** [PRD.md](PRD.md) v3.11-L  
**Platform target:** Laravel 12 + Inertia React + Eloquent + MySQL

---

## 1. Pendahuluan

### 1.1 Tujuan
Menspesifikasikan persyaratan perangkat lunak formal untuk sistem absensi **pada stack Laravel**, termasuk kriteria acceptance migrasi penuh.

### 1.2 Ruang Lingkup
Web app absensi QR + GPS opsional + WA + RBAC. Runtime production: **PHP/Laravel**. Frontend: Inertia React. DB: MySQL skema Bahasa Indonesia.

### 1.3 Definisi
| Istilah | Arti |
|---------|------|
| QR Token | Payload AES-256 ber-timestamp |
| Geofencing | Haversine vs koordinat sekolah |
| SSE | Server-Sent Events ke TV |
| Auto-Alpha | Command/jadwal menandai `ALPHA` |
| Dispensasi | Pengajuan terlambat siswa |
| Session Auth | Cookie session Laravel (bukan JWT wajib) |

### 1.4 Referensi
PRD, DATABASE, API, SOP, MIGRASI_LARAVEL, ARSITEKTUR.

---

## 2. Deskripsi Umum

### 2.1 Perspektif
Monolith Laravel: Inertia pages + JSON API + Queue + Scheduler.

### 2.2 Fungsi Produk
Auth · Scan QR · TV SSE · Piket offline · Laporan/WA · BK EWS · Kepsek · Admin · Auto-alpha · Dispensasi · PWA.

### 2.3 Karakteristik Pengguna
Siswa (HP) · Piket (tablet gerbang) · Wali · BK · Kepsek · Admin TU.

### 2.4 Batasan
* Docroot `public/`; hindari shell `mysqldump`.  
* Nama DB Bahasa Indonesia.  
* SSE harus didesain aman untuk PHP-FPM multi-process.  
* Node hanya untuk **build** Vite, bukan runtime API.

### 2.5 Asumsi
Waktu server `Asia/Jakarta`; token Fonnte tersedia; TV & HP mendukung browser modern.

---

## 3. Persyaratan Fungsional

Persyaratan produk (FR-AUTH, FR-SCAN, …) **sama perilaku** dengan SRS sebelumnya; perbedaan platform:

| Area | Laravel mapping |
|------|-----------------|
| FR-AUTH | Session `Pengguna`, middleware `auth`/`role`/`force.password` |
| FR-SCAN | `AttendanceScanController` + `QrTokenService` + `GeofenceService` |
| FR-DISP | Inertia `DisplayQr` + SSE controller |
| FR-PIKET | Scan page + Dexie + `bulk-sync` |
| FR-WALI | Reports + broadcast job |
| FR-BK | EWS + PDF SP + counseling |
| FR-KEPSEK | Summary widgets |
| FR-ADMIN | Admin controllers + import + backup |
| FR-AUTO | `absensi:auto-alpha` + `KirimWaJob` + secrets |
| FR-DISPENSASI | Model `DispensasiKeterlambatan` |
| FR-PWA | `public/` manifest + SW |

### FR-MIG-01 … FR-MIG-05 (khusus migrasi)
| ID | Persyaratan | Acceptance |
|----|-------------|------------|
| FR-MIG-01 | Sistem harus boot via Artisan/PHP-FPM tanpa Next.js | `php artisan route:list` sukses |
| FR-MIG-02 | Migration Eloquent = DATABASE.md | `migrate --seed` di DB kosong |
| FR-MIG-03 | Path API kritis tersedia | Lihat API.md smoke |
| FR-MIG-04 | Scheduler & queue terkonfigurasi | auto-alpha + LogWa terisi |
| FR-MIG-05 | Cutover tanpa ubah nama tabel | Dump existing restoreable |

---

## 4. Non-Fungsional

### Performa
NFR-PERF-01…05 sama (scan <500ms, dashboard <3s, export <10s, import <30s).

### Keamanan
* NFR-SEC-L1: Session httpOnly + CSRF untuk form Inertia.  
* NFR-SEC-L2: API state-changing dari SPA memakai CSRF cookie Sanctum/sama pola Laravel.  
* NFR-SEC-L3: RBAC middleware + cek di controller.  
* NFR-SEC-L4: Secrets di `.env`; jangan commit.  
* NFR-SEC-L5: Audit admin.

### Reliabilitas
Queue retry; schedule timezone Jakarta; lock auto-alpha; unique absensi.

### Deploy
NFR-DEP-01: `public/` docroot.  
NFR-DEP-02: Cron `schedule:run` tiap menit.  
NFR-DEP-03: `queue:work` selalu hidup di production.

---

## 5. Aturan Bisnis Absensi

1. Satu status / siswa / tanggal.  
2. HADIR sebelum `jam_masuk`; TERLAMBAT hingga `jam_toleransi`.  
3. SAKIT/IZIN manual staf.  
4. ALPHA via auto-alpha (skip weekend/libur/magang).  
5. Token QR berumur pendek.  
6. Geofence hanya jika flag aktif.  
7. WA nomor dinormalisasi `62…`.

---

## 6. Traceability

| PRD | SRS | Laravel artifact |
|-----|-----|------------------|
| F-SISWA | FR-SCAN | Student Portal + ScanController |
| F-DISP | FR-DISP | DisplayQr + TokenQr + LiveStream |
| F-PIKET | FR-PIKET | Scan page + BulkSync |
| F-WALI | FR-WALI | Reports + Broadcast |
| F-BK | FR-BK | Bk controllers |
| F-ADMIN | FR-ADMIN | Admin/* |
| AUTO-ALPHA | FR-AUTO | AutoAlphaService + Command |
| Migrasi | FR-MIG-* | MIGRASI_LARAVEL.md |

---

## 7. Verifikasi

| Metode | Cakupan |
|--------|---------|
| Feature test PHPUnit/Pest | Auth, scan, geofence, auto-alpha |
| Manual UAT role | Smoke tiap dashboard |
| `npm run build` | Aset Inertia |
| Staging cron+queue | 1 hari operasional |

---

## 8. Riwayat

| Versi | Tanggal | Keterangan |
|-------|---------|------------|
| 1.0 | 2026-07-29 | Baseline Next.js-oriented |
| 1.1 | 2026-07-29 | Retarget Laravel + FR-MIG |
