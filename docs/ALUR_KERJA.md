# Detail Alur & Alur Kerja Sistem (PRD-WORKFLOW)

Dokumen ini berisi spesifikasi diagram sekuens (*sequence diagram*) untuk lima alur utama sistem absensi SMK Ar Rahma guna memperjelas logika integrasi antarmuka dan basis data.

---

## 1. Alur Absensi Mandiri & Validasi QR Code (Scan Absen)

Siswa memindai QR Code TV kantor dari browser HP mereka. Validasi mencakup GPS Geofencing (Haversine) dan token TV dinamis (berubah tiap 10 detik).

```mermaid
sequenceDiagram
    autonumber
    actor Siswa
    participant HP as Portal Siswa (HP)
    participant TV as Layar TV Kantor (/display-qr)
    participant Server as Server Next.js (API)
    participant DB as Database MySQL (Prisma)
    participant WA as WhatsApp API (Fonnte)
    actor Ortu as Orang Tua Siswa

    Note over TV: Menampilkan QR Code terenkripsi (AES-256)<br/>berisi timestamp & countdown 10 detik
    Siswa->>HP: Buka Menu Scan (HP)
    HP->>HP: Ambil Sensor Koordinat GPS HP (High Accuracy)
    HP->>HP: Pindai QR Code di layar TV
    HP->>Server: HTTP POST /api/attendance/scan (NISN, GPS, Token)
    
    rect rgb(240, 240, 240)
        Note over Server: Mulai Validasi Backend
        Server->>DB: Ambil Koordinat Sekolah & Setelan Toleransi
        DB-->>Server: Data Lintang/Bujur Sekolah & Jam Toleransi
        Server->>Server: Hitung jarak Haversine (GPS HP vs GPS Sekolah)
        Server->>Server: Dekripsi Token & Cek Usia Token (<= 10 Detik)
    end

    alt Jarak <= Radius Sekolah AND Token <= 10 Detik
        Server->>DB: Simpan record Kehadiran (HADIR / TERLAMBAT)
        DB-->>Server: Record tersimpan sukses
        Server->>Server: Trigger SSE Broadcast nama siswa & waktu masuk
        Server->>TV: SSE Stream: Kirim info nama siswa ke display TV
        Note over TV: Menampilkan notifikasi popup real-time<br/>"Budi Utomo baru saja absen"
        
        alt Internet Normal (Online)
            Server->>WA: Kirim notifikasi kehadiran (dengan random delay)
            WA-->>Ortu: Pesan WA terkirim di HP Orang Tua
            Server->>DB: Log status LogWa = TERKIRIM
        else Internet Sekolah Putus (Offline)
            Server->>DB: Simpan LogWa dengan status GAGAL_OFFLINE
        end
        
        Server-->>HP: HTTP 200 OK (Audio Bip + HP Bergetar + Centang Hijau)
    else Di luar Radius ATAU Token Kedaluwarsa
        Server-->>HP: HTTP 400 Bad Request (Kode Error Jarak/Token & Instruksi Peta)
    end
```

---

## 2. Alur Otomasi Cron-Alpha Harian (07:15 WIB)

Sistem cron-job memicu penandaan status Alpha massal dan pengiriman laporan harian ke orang tua serta Wali Kelas setiap pagi.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Server Cron Job (07:15)
    participant Server as Server Next.js (API)
    participant DB as Database MySQL (Prisma)
    participant WA as WhatsApp API (Fonnte)
    actor Ortu as Orang Tua Siswa Alpha
    actor Wali as Wali Kelas

    Cron->>Server: HTTP POST /api/attendance/cron-alpha (Secret Key)
    Server->>DB: Kueri Tabel HariLibur (tanggal libur nasional & kustom)
    DB-->>Server: Daftar Hari Libur
    
    alt Hari Kerja (Bukan Libur/Weekend)
        Server->>DB: Cari siswa aktif (aktif=true) yang belum scan hari ini (kecuali siswaPKL/magang)
        DB-->>Server: Daftar Siswa Belum Absen
        Server->>DB: Simpan Kehadiran status = ALPHA untuk siswa tersebut
        
        loop Setiap Siswa Alpha
            Server->>Server: Susun template pesan notifikasi untuk orang tua
            alt Internet Normal (Online)
                Server->>WA: Kirim Notif WA Alpha (Jeda acak delay min-max)
                WA-->>Ortu: Terima pesan WA ketidakhadiran anak
                Server->>DB: Simpan LogWa status = TERKIRIM
            else Internet Offline
                Server->>DB: Simpan LogWa status = GAGAL_OFFLINE
            end
        end

        loop Setiap Wali Kelas
            Server->>DB: Ambil statistik summary kehadiran & daftar siswa Alpha di kelasnya
            DB-->>Server: Data Kehadiran Kelas
            alt Internet Normal (Online)
                Server->>WA: Kirim Laporan Summary Harian ke Wali Kelas
                WA-->>Wali: Terima ringkasan absensi kelas di WA
                Server->>DB: Simpan LogWa status = TERKIRIM
            else Internet Offline
                Server->>DB: Simpan LogWa status = GAGAL_OFFLINE
            end
        end
        Server-->>Cron: HTTP 200 OK (Sukses memproses Alpha & WA)
    else Hari Libur / Akhir Pekan
        Server-->>Cron: HTTP 200 OK (Dilewati - Hari Libur)
    end
```

---

## 3. Alur Sesi Tunggal & Sidik Jari Browser (Anti Login-Sharing)

Mencegah kecurangan siswa menitipkan absen dengan membagikan akun untuk di-login di HP teman yang berada di sekolah.

```mermaid
sequenceDiagram
    autonumber
    actor Siswa
    participant HP as HP Siswa (Browser)
    participant Server as Server Next.js (API)
    participant DB as Database MySQL (Prisma)

    Siswa->>HP: Masukkan NISN & Kata Sandi
    HP->>HP: Generate Sidik Jari Perangkat (sidikJariBrowser)
    HP->>Server: HTTP POST /api/auth/login (NISN, sandi, sidikJariBrowser)
    Server->>DB: Ambil data Pengguna berdasarkan NISN
    DB-->>Server: Data Pengguna (kataSandi, sidikJariBrowser, aktif, absenDiblokirHingga)
    
    rect rgb(240, 240, 240)
        Note over Server: Mulai Validasi Sesi Tunggal
        Server->>Server: Cocokkan hash password Bcrypt
    end
    
    alt Password Valid
        alt Akun Terdeteksi Blokir (absenDiblokirHingga > Waktu Sekarang)
            Server-->>HP: HTTP 403 Forbidden (Akun diblokir sementara karena login sharing)
        else Akun Tidak Diblokir
            alt sidikJariBrowser kosong ATAU sidikJariBrowser sama
                Server->>DB: Simpan sidikJariBrowser jika kosong
                Server-->>HP: HTTP 200 OK (Sesi Aktif - Simpan JWT Cookies HTTP-Only)
            else sidikJariBrowser berbeda (Login di HP Baru saat Sesi Lama Aktif)
                Server->>DB: Set cookie sesi lama hangus & simpan sidikJariBrowser baru
                Server->>DB: Set kolom absenDiblokirHingga = Waktu Sekarang + 5 Menit
                Server-->>HP: HTTP 200 OK (Sesi Baru aktif, login HP lama ditendang, scan diblokir 5 menit)
            end
        end
    else Sandi Salah
        Server-->>HP: HTTP 401 Unauthorized (NISN / Kata Sandi salah)
    end
```

---

## 4. Alur Ketahanan Offline Guru Piket (IndexedDB & Auto-Sync)

Menjamin proses pencatatan absensi manual di gerbang sekolah tetap berjalan lancar saat koneksi Wi-Fi/internet sekolah terputus tiba-tiba.

```mermaid
sequenceDiagram
    autonumber
    actor Guru as Guru Piket
    participant Web as Dashboard Piket (Browser)
    participant Local as Browser IndexedDB Cache
    participant Server as Server Next.js (API)
    participant DB as Database MySQL (Prisma)

    Note over Web: Menampilkan daftar siswa sekolah dari cache lokal
    Guru->>Web: Cari Siswa "Budi" & Klik Tombol [Hadir]
    Web->>Server: HTTP POST /api/attendance/manual (Koneksi Terputus!)
    Server--xWeb: Gangguan Jaringan (Timeout / Connection Failed)
    
    rect rgb(255, 235, 235)
        Note over Web: Masuk Mode Penyelamatan Offline
        Web->>Local: Simpan data absensi di tabel 'kehadiran_tertunda' (statusSync: PENDING)
        Local-->>Web: Konfirmasi penyimpanan sukses
        Web->>Web: Tampilkan Toast Oranye: "Tersimpan Offline: Menunggu internet online."
        Web->>Web: Masukkan baris siswa ke Tabel Log Harian Piket dengan tanda "Offline"
    end
    
    Note over Web: Mengawasi status koneksi internet... (window.online)
    Note over Web: Koneksi internet tersambung kembali (Online)!
    
    rect rgb(235, 255, 235)
        Note over Web: Mulai Proses Sinkronisasi Latar Belakang
        Web->>Local: Baca seluruh data di tabel 'kehadiran_tertunda' (statusSync = PENDING)
        Local-->>Web: Array Data Absensi Terbaca
        Web->>Server: HTTP POST /api/attendance/bulk-sync (Daftar Absensi Offline)
        Server->>DB: Simpan absensi masal & kirim antrean pesan WhatsApp
        DB-->>Server: Simpan database sukses
        Server-->>Web: HTTP 200 OK (Sinkronisasi Sukses)
        Web->>Local: Hapus data di tabel 'kehadiran_tertunda'
        Web->>Web: Ganti indikator label "Offline" di Tabel Log menjadi "Sinkron"
    end
```

---

## 5. Alur Pembuatan Cadangan SQL Database (One-Click cPanel Backup)

Admin mengekspor cadangan database MySQL. Menggunakan JSON kueri manual di memori server agar lolos dari aturan Shared Hosting cPanel yang memblokir `mysqldump` command line.

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Web as Dashboard Admin
    participant Server as Server Next.js (API)
    participant DB as Database MySQL (Prisma)

    Admin->>Web: Klik Tombol "Unduh Backup Database (.sql)"
    Web->>Server: HTTP GET /api/admin/backup-db
    Server->>Server: Validasi Hak Akses (Role === ADMIN)
    
    rect rgb(240, 240, 240)
        Note over Server: Mulai SQL Generator manual di Memori
        Server->>DB: Kueri semua tabel database (findMany) secara paralel/berurutan
        DB-->>Server: Data mentah tabel (Pengguna, Kelas, Siswa, Kehadiran, dll.)
        Server->>Server: Susun string teks SQL pembuka: SET FOREIGN_KEY_CHECKS = 0
        loop Untuk Setiap Tabel
            Server->>Server: Konversi baris data objek JSON menjadi baris teks SQL: "INSERT INTO..."
        end
        Server->>Server: Susun string teks SQL penutup: SET FOREIGN_KEY_CHECKS = 1
    end
    
    Server-->>Web: HTTP 200 OK (Stream Download File backup_tgl_jam.sql)
    Web-->>Admin: File .sql tersimpan aman di komputer Admin
```

---

## 6. Rujukan Dokumen
*   Kembali ke [PRD Utama](PRD.md)
*   Lihat [Detail Spesifikasi Database](DATABASE.md)
*   Lihat [SOP.md](SOP.md)
