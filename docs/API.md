# Katalog API — Laravel (`routes/api.php`)

**Versi:** 1.1-L · **Tanggal:** 2026-07-29  
**Auth default:** Session cookie Laravel (`auth`) kecuali path publik / header secret.  
**Prefix:** `/api`

Path dipertahankan kompatibel dengan produk absensi proyek ini agar migrasi UI mulus.

---

## 1. Ringkasan Controller

| Grup | Namespace tipikal | Fungsi |
|------|-------------------|--------|
| Auth | `Api\AuthController` | Login/logout/profile/password |
| Attendance | `Api\Attendance*Controller` | Scan, manual, SSE, sync, alpha |
| Token | `Api\TokenQrController` | QR AES |
| Student | `Api\Student*Controller` | Dashboard & dispensasi |
| Dashboard | `Api\Dashboard*Controller` | Summary & broadcast |
| Admin | `Api\Admin\*` | Master data, import, backup |
| BK | `Api\Bk*Controller` | EWS & konseling |
| Picket | `Api\Picket*Controller` | Dispensasi & jadwal |
| Reports | `Api\ReportsController` | Rekap |
| Cron | `Api\CronWaDigestController` | Digest WA |

Services yang dipanggil controller: `QrTokenService`, `GeofenceService`, `WhatsAppService`, `SseBroadcastService`, `AutoAlphaService`.

---

## 2. Autentikasi

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/auth/login` | Publik | Body: `usernameOrEmail` / email / NISN, `kataSandi`, `sidikJariBrowser?` → session |
| POST | `/api/auth/logout` | Auth | Invalidate session |
| POST | `/api/auth/change-password` | Auth | Set sandi baru; `isPasswordSementara=false` |
| GET | `/api/auth/profile` | Auth | Profil + peran + flag guru (`isBk`, kelas wali, piket) |

---

## 3. Absensi & Display

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/attendance/scan` | Siswa | Validasi token AES + geofence opsional; simpan `Kehadiran`; SSE; dispatch WA job |
| POST | `/api/attendance/manual` | Piket/Admin/(Wali scoped) | Input status manual. **Tidak validasi enum `status`** (string apa pun diteruskan ke DB) dan **menimpa (overwrite)** record `Kehadiran` yang sudah ada apa pun sumbernya (termasuk hasil scan mandiri siswa) — siapa pun yang input terakhir "menang". Menghapus `LogWa` `TERTUNDA` lama terkait. |
| DELETE | `/api/attendance/manual` | Piket/Admin | Batalkan record. ⚠️ **Backend tidak membatasi umur record** — bisa menghapus `Kehadiran` mana pun kapan pun; batas "30 detik" di UI Guru Piket hanyalah **validasi client-side** (tombol disembunyikan), bukan aturan server. |
| POST | `/api/attendance/bulk-sync` | Piket/Admin | Batch dari Dexie; hormati unique `(idSiswa,tanggal)`. ⚠️ **Tidak mengisi `tahunAjaran`** pada record yang dibuat (berbeda dari `scan`/`manual`) — record hasil sync offline jatuh ke default schema `"2024/2025"`, berpotensi salah rekap tahun ajaran berikutnya. |
| GET | `/api/attendance/piket-students` | Piket/Admin | Payload cache offline |
| GET | `/api/attendance/live-stream` | Publik | SSE `text/event-stream` |
| POST | `/api/attendance/auto-alpha` | `X-Scheduler-Secret` (header custom, tanpa prefix) **ATAU** sesi `ADMIN` + body `{ force: true }` | Dua jalur otorisasi independen (cukup salah satu) → `AutoAlphaService` |
| GET | `/api/token-qr` | **Butuh sesi login** dengan `peran === SISWA \|\| ADMIN` (bukan publik!) — endpoint ini **tidak** ada di daftar path publik middleware, jadi TV `/display-qr` harus login dengan akun tertentu (mis. akun Admin/display) agar cookie sesi terpasang di browser TV | Payload terenkripsi untuk QR |

---

## 4. Siswa

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/student/dashboard` | Siswa | Statistik + riwayat |
| POST | `/api/student/dispensation` | Siswa | Ajukan (alasan, foto?) |
| GET | `/api/student/dispensation` | Siswa | Status pengajuan |

---

## 5. Dashboard & Laporan

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/dashboard/summary` | Staf | Ringkasan role-aware (juga memicu `runAutoAlpha(false)` sebagai "JIT safety net" — lihat [CATATAN_PARITAS.md](CATATAN_PARITAS.md)) |
| POST | `/api/dashboard/broadcast` | **Hanya `ADMIN`/`KEPALA_SEKOLAH`** (bukan Wali Kelas — lihat catatan gap di [WALI_KELAS.md](WALI_KELAS.md) §2.5) | Body `{ pesan, kategori: "SEMUA"\|"TERLAMBAT"\|"ALPHA" }`; selalu **global** (tidak ada filter kelas meski field `targetClassId` ada di kode, nilainya selalu `null`) |
| GET | `/api/reports` | Wali/Kepsek/Admin | Data rekap kalender/export (juga memicu `runAutoAlpha(false)` JIT) |
| GET | `/api/reports/student-card` | Siswa (diri sendiri)/Wali (kelasnya)/BK/Admin/Kepsek | **Rapor kehadiran bulanan PDF** per siswa (bukan kartu ID) — params `siswaId`, `bulan`, `tahun` |

---

## 6. Admin

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| CRUD | `/api/admin/classes` | Admin | Kelas |
| GET | `/api/admin/classes/{id}/students` | Admin | Siswa per kelas |
| POST | `/api/admin/classes/import` | Admin | XLSX kelas |
| CRUD | `/api/admin/students` | Admin | Siswa; `PUT` juga mendukung mode reset sandi (`resetPassword: true` → password = NISN, `isPasswordSementara=true`) |
| POST | `/api/admin/students/import` | Admin | XLSX siswa + buat `Pengguna` |
| PUT | `/api/admin/students/bulk-internship` | Admin | Bulk magang |
| CRUD | `/api/admin/users` | Admin | Guru/staf |
| POST | `/api/admin/users/import` | Admin | XLSX guru |
| CRUD | `/api/admin/holidays` | Admin | Hari libur |
| GET/POST/DELETE | `/api/admin/picket-schedules` | Admin | Jadwal piket |
| GET/PUT | `/api/admin/settings` | Admin | Baca/simpan key-value `Pengaturan` (body `PUT`: array `{ kunci, nilai }[]`) |
| DELETE | `/api/admin/settings` | Admin | **Bukan hapus pengaturan** — ini fitur "reset data hari ini": menghapus seluruh record `Kehadiran` **dan** `LogWa` untuk tanggal hari ini. Destruktif & tidak reversibel; wajib modal konfirmasi toast. |
| POST | `/api/admin/lifecycle` | Admin | Naik kelas / alumni |
| GET | `/api/admin/backup-db` | Admin | Unduh `.sql` |
| GET/POST | `/api/admin/wa-status` | Admin | Status gateway Fonnte/OpenWA + uji kirim |

Sanitasi nomor: helper `bersihkanNomorHp()` → format `62…`.

> Spesifikasi token, OpenWA `/api/sessions`, Fonnte `/send`, antrean: **[WHATSAPP.md](WHATSAPP.md)**.

---

## 7. BK, Piket, Settings, Cron

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/bk/ews` | BK/Admin | Flagged students |
| POST | `/api/bk/counseling` | BK/Admin | Simpan log konseling |
| GET/PUT | `/api/picket/dispensations` | Piket/Admin | Antrian & keputusan |
| GET | `/api/picket-schedules/today` | Auth | Piket hari ini |
| GET | `/api/settings/geofencing` | Auth | Flag + parameter GPS untuk UI |
| GET | `/api/cron/wa-digest` | `Authorization: Bearer {CRON_SECRET}` (format **beda** dari auto-alpha) / Admin | Digest ke wali kelas; juga **membuat record `ALPHA`** untuk siswa belum absen tanpa kirim WA individual ke ortu (lihat [WHATSAPP.md](WHATSAPP.md) §4.3 & [CATATAN_PARITAS.md](CATATAN_PARITAS.md)) |

---

## 8. Kode Status

| HTTP | Arti |
|------|------|
| 200/201 | Sukses |
| 400 | Validasi / token / GPS / XLSX |
| 401 | Belum login / secret salah |
| 403 | Role tidak berwenang |
| 404 | Tidak ditemukan |
| 409 | Konflik unique absensi/dispensasi |
| 422 | Laravel validation |
| 500 | Server |

Contoh kode bisnis: `TOKEN_KADALUWARSA`, `JARAK_TERLALU_JAUH`, akun diblokir fingerprint.

---

## 9. Proteksi Sensitif

| Endpoint | Proteksi |
|----------|----------|
| `/api/attendance/auto-alpha` | Header `X-Scheduler-Secret: {SCHEDULER_SECRET}` **atau** sesi Admin session. ⚠️ Kode produk existing punya **fallback hardcoded** untuk `SCHEDULER_SECRET` bila env kosong — Laravel **wajib** fail-fast (tolak start) jika secret ini tidak diisi, jangan pakai default. |
| `/api/cron/wa-digest` | Header `Authorization: Bearer {CRON_SECRET}` (format berbeda dari auto-alpha) / Admin |
| `/api/admin/backup-db` | Admin only |
| Import XLSX | Admin + validasi kolom + audit (catatan: validasi nomor WA saat ini **longgar**, lihat [ADMIN.md](ADMIN.md) §2.1) |
| Semua endpoint RBAC relasi (Wali/BK/Piket) | Dihitung ulang per-request dari `Guru.kelasWali` / `Guru.isBk` / `JadwalPiket` — **bukan** dari klaim role statis di token. Lihat [ARSITEKTUR.md](ARSITEKTUR.md) §4.1. |

---

## 10. Rujukan
[SRS.md](SRS.md) · [SOP.md](SOP.md) · [MIGRASI_LARAVEL.md](MIGRASI_LARAVEL.md) · [ARSITEKTUR.md](ARSITEKTUR.md)
