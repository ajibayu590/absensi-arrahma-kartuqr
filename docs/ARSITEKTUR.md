# Arsitektur & Spesifikasi Teknis (Unified Next.js)

Dokumen ini menjelaskan rancangan arsitektur sistem, spesifikasi frontend, spesifikasi backend, dan standar keamanan yang diterapkan pada Sistem Absensi Siswa SMK Ar Rahma.

---

## 1. Desain Arsitektur Sistem

Aplikasi ini menggunakan arsitektur **Unified Next.js (Single Codebase)** di mana frontend (React/Next.js client-side) dan backend (Next.js API routes server-side) berjalan di dalam satu server/port node.js yang sama. Hal ini mempermudah proses deployment di cPanel dan memaksimalkan performa transfer data.

```
┌──────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js Client)              │
│  - React, Tailwind CSS, Lucide Icons, html5-qrcode       │
│  - Portal Siswa (Scan + Getar HP)                        │
│  - Dashboard Staff (Wali Kelas, BK, Piket, Kepsek, Admin)│
└────────────────────────────▲─────────────────────────────┘
                             │ REST API (HTTPS) / SSE
┌────────────────────────────▼─────────────────────────────┐
│                   BACKEND (Next.js API Routes)           │
│  - JWT & RBAC Middleware, Haversine Geolocation          │
│  - SSE Broadcast Stream (SSE Registry di memori)         │
│  - Auto-Alpha Cron Job (setiap pagi pukul 07:15 WIB)      │
└──────────────────────┬────────────────────┬──────────────┘
                       │                    │
┌──────────────────────▼───────┐    ┌───────▼──────────────┐
│        Prisma ORM            │    │  WhatsApp Gateway    │
│  (Query Manager Database)    │    │  (Fonnte REST API)   │
└──────────────────────┬───────┘    └──────────────────────┘
                       │
┌──────────────────────▼───────┐
│        Database MySQL        │
│  (Skema Bahasa Indonesia)    │
└──────────────────────────────┘
```

---

## 2. Spesifikasi Frontend (UI/UX)

*   **Teknologi Utama**: Next.js App Router, React, Tailwind CSS, Zustand (state management), react-hook-form (form validation), Lucide React (ikon).
*   **Identitas Visual & Skema Warna (Berdasarkan https://smkami.sch.id/)**:
    *   **Warna Utama (Primary)**: Hijau Emerald / Hijau Daun (`#16a34a` / Tailwind `emerald-600`). Digunakan untuk tombol utama, aksen aktif, status kehadiran "Hadir", dan branding header.
    *   **Warna Latar Belakang**: Mode Terang (`#F8FAFC` / Tailwind `slate-50`) dan Mode Gelap Premium (`#090D16` / Dark Charcoal Deep).
    *   **Tipografi (Fonts)**: Menggunakan font **Plus Jakarta Sans** (dari Google Fonts: `Plus Jakarta Sans:wght@300;400;500;600;700;800`) untuk memberikan nuansa bersih, modern, dan sangat terbaca pada perangkat mobile.
*   **Standar Visual & Estetika**:
    *   **Dashboard Bento Grid**: Tata letak bento grid responsif dengan card yang bersih dan tipis untuk visualisasi statistik ringkas.
    *   **GitHub-style Calendar Grid**: Kalender rekap bulanan interaktif dengan visualisasi warna pastel (Hadir=Hijau, Terlambat=Kuning, Izin/Sakit=Biru, Alpha=Merah) dan slide-over side drawer untuk interaksi instan.
    *   **TV Display Premium**: Layar TV kantor/gerbang menggunakan dark-theme neon dengan visual circular progress ring (hitung mundur token 10s ke 0s) dan log absensi *real-time* yang melayang masuk.
*   **Mikro-Interaksi (Design Spells)**:
    *   **Haptic Feedback**: Getaran HP singkat (`navigator.vibrate([100])`) saat siswa sukses/gagal scan di perangkat seluler mereka.
    *   **Bouncy Toast**: Alert notifikasi pop-up yang memantul dan menampilkan inisial melingkar nama siswa pada monitor Guru Piket saat kehadiran tercatat.
    *   **Fluid Transitions**: Transisi halaman yang mengalir mulus antar-rute menu di sidebar untuk menguatkan nuansa Single Page Application (SPA).
*   **Mitigasi Offline & Kinerja Seluler**:
    *   **IndexedDB Local Cache**: Menggunakan cache database lokal browser untuk menyimpan entri manual Guru Piket ketika Wi-Fi gerbang sekolah terputus, dan melakukan sinkronisasi otomatis ketika terdeteksi kembali online.
    *   **Touch-First Controls**: Tombol kamera dan flash berukuran ergonomis minimal $48\times48\text{px}$ dengan skeleton loader selama inisialisasi API kamera browser.

---

## 3. Spesifikasi Backend & Otomatisasi

*   **Teknologi Utama**: Next.js API Routes (Node.js runtime), Prisma ORM Client, Axios.
*   **Mekanisme Server-Sent Events (SSE)**:
    *   Menggunakan ReadableStream default controller di backend untuk menjaga koneksi satu arah (*one-way live stream*) dari server ke banyak TV display secara real-time tanpa membebani overhead memori (tanpa socket.io).
*   **Otomatisasi Cron-Alpha (Pukul 07:15 WIB)**:
    *   Pemicu otomatisasi absensi harian untuk memeriksa seluruh siswa yang belum hadir setelah batas toleransi habis.
    *   Mengubah status absen menjadi `ALPHA`, mengirim pesan WhatsApp ke orang tua, dan menyusun summary laporan harian untuk dikirim ke WhatsApp masing-masing Wali Kelas.
    *   **Holiday & Weekend Filter**: Cron job secara otomatis melewati hari Sabtu, Minggu, hari libur nasional Indonesia, dan hari libur sekolah kustom di tabel `HariLibur`.
    *   **Magang Filter**: Cron job tidak memberi status Alpha untuk siswa yang masa magangnya di sekolah terdaftar aktif (`sedangMagang: true` pada tanggal tersebut).
*   **Mekanisme Jeda WhatsApp Gateway (Anti-Spam)**:
    *   Pengiriman WhatsApp massal menggunakan antrean asinkronus (*asynchronous queue*) dengan selisih delay acak (*randomized delay*) dari range pengaturan `wa_delay_min` dan `wa_delay_max` (misal antara 2.000 ms hingga 5.000 ms per pesan) untuk menghindari pemblokiran nomor oleh server Meta.
    *   **Offline Queue Fallback**: Pesan yang gagal dikirim karena masalah jaringan disimpan ke database dengan status `GAGAL_OFFLINE` untuk dikirim ulang via tombol "Kirim Ulang" manual Admin di dashboard.

---

## 4. Spesifikasi Keamanan & Enkripsi

*   **Keamanan Sesi Tunggal (Anti Login-Sharing)**:
    *   Sistem menyimpan string `sidikJariBrowser` unik pada tabel `Pengguna` saat siswa login. Jika akun mendeteksi login baru dari perangkat/browser lain dengan sidik jari berbeda, sesi lama otomatis dikeluarkan secara paksa (*force logout*).
    *   Jika sistem mendeteksi percobaan login ganda mencurigakan berulang, akses melakukan scan pada portal HP siswa tersebut diblokir sementara (`absenDiblokirHingga` di-set 5 menit ke depan).
*   **Enkripsi Token QR Code Dinamis**:
    *   Token QR Code di-generate oleh backend menggunakan AES-256-CBC dengan salt kunci rahasia dan dibubuhi timestamp server saat itu.
    *   Saat didekripsi di backend `/api/attendance/scan`, sistem memvalidasi perbedaan waktu antara jam dekripsi server dan timestamp pembuatan di token. Jika selisih waktu $> 10$ detik, absensi ditolak (token kedaluwarsa).
*   **Geofencing Haversine**:
    *   Backend menghitung jarak spasial garis lurus antara koordinat GPS siswa (diperoleh dari sensor GPS browser siswa saat scan) dan koordinat GPS sekolah menggunakan formula matematika Haversine:
        $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
    *   Jika jarak $d >$ radius toleransi sekolah (misal 50 meter), absensi ditolak demi keamanan.
*   **Autentikasi Pengguna**:
    *   Password hashing menggunakan algoritma Bcrypt (work factor 10).
    *   Sesi login diamankan menggunakan token JWT terenkripsi yang disimpan di cookies HTTP-only (mencegah pencurian token via serangan XSS).
    *   Aturan RBAC yang ketat untuk semua route API (misalnya: request pengunduhan data rekapitulasi sekolah ditolak jika role pemanggil bukan ADMIN atau KEPALA_SEKOLAH).

---

## 5. Rujukan Dokumen
*   Kembali ke [PRD Utama](PRD.md)
*   Lihat panduan instruksi di [AGENTS.md](../AGENTS.md)
