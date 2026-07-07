# Deep Research — Sistem Absensi SMK Ar Rahma (Unified Next.js)

Dokumen ini menyajikan hasil riset pasar, analisis kompetitor, Jobs To Be Done (JTBD), analisis SWOT, manajemen risiko, serta wawasan teknis utama untuk pengembangan sistem absensi di SMK Ar Rahma.

---

## 1. Problem Validation (Validasi Masalah)

Di lingkungan SMK Ar Rahma, pencatatan kehadiran manual masih menghadapi kendala efisiensi dan transparansi:
1.  **Manipulasi Kehadiran**: Siswa dapat melakukan manipulasi data kehadiran (titip tanda tangan) atau membolos setelah absen pagi tanpa diketahui guru.
2.  **Kekhawatiran Orang Tua**: Orang tua sering kali tidak mengetahui apakah anak mereka benar-benar sampai di sekolah atau tidak, terutama jika anak membolos di tengah jalan.
3.  **Beban Kerja Guru Piket & Staf TU**: Merekap ribuan data kehadiran siswa setiap bulannya secara manual memakan waktu berhari-hari sebelum diserahkan kepada wali kelas dan kepala sekolah.
4.  **Keterbatasan Anggaran**: Solusi absensi biometrik seperti mesin sidik jari (*fingerprint*) memerlukan biaya perangkat keras yang mahal dan sering kali menimbulkan antrean panjang di gerbang sekolah karena keterbatasan jumlah alat.

---

## 2. Jobs To Be Done (JTBD)

Untuk memastikan sistem absensi memberikan nilai nyata, berikut adalah pemetaan JTBD berdasarkan 6 peran pengguna:

*   **Admin Sekolah (Tata Usaha)**:
    *   *Situasi:* "Ketika tahun ajaran baru dimulai atau terjadi perpindahan kelas..."
    *   *Tujuan:* "...saya ingin mengimpor data ratusan siswa secara massal menggunakan file Excel dan mengelompokkannya secara instan..."
    *   *Hasil:* "...sehingga data master sekolah siap digunakan tanpa perlu diinput manual satu per satu."
*   **Guru Piket (Gerbang Sekolah)**:
    *   *Situasi:* "Ketika pagi hari menjelang jam masuk sekolah (06:30 - 07:00)..."
    *   *Tujuan:* "...saya ingin memindai QR Code kartu pelajar siswa dengan kamera HP saya dalam waktu kurang dari 1 detik..."
    *   *Hasil:* "...sehingga tidak terjadi penumpukan atau antrean siswa di depan gerbang sekolah."
*   **Wali Kelas**:
    *   *Situasi:* "Ketika jam pelajaran pertama dimulai..."
    *   *Tujuan:* "...saya ingin melihat daftar kehadiran siswa di kelas saya secara real-time dari HP/Laptop..."
    *   *Hasil:* "...sehingga saya tahu siapa yang tidak hadir (sakit/izin/alpha) tanpa harus memanggil absensi satu per satu."
*   **Guru BK (Bimbingan Konseling)**:
    *   *Situasi:* "Ketika seorang siswa sering tidak hadir tanpa keterangan (*Alpha*)..."
    *   *Tujuan:* "...saya ingin melihat riwayat detail kehadiran siswa tersebut selama satu bulan terakhir..."
    *   *Hasil:* "...sehingga saya memiliki data yang valid saat memanggil siswa atau orang tuanya untuk konseling."
*   **Kepala Sekolah**:
    *   *Situasi:* "Ketika rapat evaluasi bulanan atau akhir semester..."
    *   *Tujuan:* "...saya ingin melihat statistik tren kehadiran sekolah dan mengunduh laporan rekapitulasi dalam format Excel..."
    *   *Hasil:* "...sehingga saya dapat mengambil kebijakan strategis sekolah secara cepat berdasarkan data yang akurat."
*   **Siswa**:
    *   *Situasi:* "Ketika saya tiba di gerbang sekolah..."
    *   *Tujuan:* "...saya ingin memindai kartu pelajar saya atau menunjukkan QR Code digital di HP saya..."
    *   *Hasil:* "...sehingga kehadiran saya langsung tercatat dengan mudah dan orang tua saya mengetahuinya."

---

## 3. Analisis Pasar & Kompetitor (Market & Competitor Analysis)

### 3.1 Estimasi Ukuran Pasar Sekolah (Qualitative TAM/SAM/SOM)
*   **TAM (Total Addressable Market)**: Seluruh institusi pendidikan menengah (SMK, SMA, MA) di Indonesia yang membutuhkan digitalisasi operasional sekolah.
*   **SAM (Serviceable Addressable Market)**: SMK/SMA swasta di wilayah tingkat kabupaten/provinsi yang memiliki keterbatasan anggaran untuk infrastruktur fisik mahal (seperti mesin RFID/Wajah), tetapi menginginkan transparansi berbasis mobile.
*   **SOM (Serviceable Obtainable Market)**: SMK Ar Rahma dan sekolah-sekolah dalam yayasan/afiliasi yang sama sebagai titik awal implementasi sistem MVP terintegrasi WhatsApp.

### 3.2 Analisis Kompetitor
Sistem absensi berbasis QR Code memiliki beberapa kompetitor, baik langsung maupun tidak langsung:

| Kompetitor | Jenis | Kelebihan | Kelemahan |
|------------|-------|-----------|-----------|
| **Mesin Fingerprint/RFID** | Substitusi | Sangat sulit dimanipulasi, bekerja secara offline. | Biaya instalasi mahal, antrean panjang di gerbang, tidak terintegrasi WhatsApp langsung secara murah. |
| **Google Forms & Google Sheets** | Kompetitor Tidak Langsung | Gratis, mudah disiapkan oleh guru secara mandiri. | Mudah dimanipulasi (link bisa disebarkan), tidak memiliki QR Scanner, rekapitulasi manual. |
| **SaaS Absensi Berbayar (seperti JasaAbsensi / Edmodo)** | Kompetitor Langsung | Fitur lengkap (akademik, nilai, keuangan). | Biaya berlangganan bulanan mahal per siswa, konfigurasi rumit, fitur terlalu kompleks untuk kebutuhan dasar. |
| **Custom App SMK Ar Rahma (Next.js + Fonnte)** | **Solusi Kita** | **Biaya server murah, integrasi WhatsApp Fonnte instan, responsif di HP guru, disesuaikan penuh dengan alur sekolah.** | **Memerlukan koneksi internet stabil saat pemindaian.** |

---

## 4. Analisis SWOT

*   **S (Strengths - Kekuatan)**:
    *   Pengerjaan satu codebase (Next.js) membuat performa API dan UI sangat cepat.
    *   Sistem notifikasi real-time WhatsApp menggunakan Fonnte API terbukti andal untuk pasar Indonesia.
    *   Responsif dan ringan, dapat digunakan di HP Android jadul milik guru piket.
*   **W (Weaknesses - Kelemahan)**:
    *   Ketergantungan tinggi pada koneksi internet. Jika sinyal di gerbang sekolah mati, absensi terhambat.
    *   Risiko nomor WhatsApp pengirim terblokir oleh Meta karena dianggap melakukan spam.
*   **O (Opportunities - Peluang)**:
    *   Dapat dikembangkan menjadi kartu pelajar pintar (*smart card*) dengan QR Code cetak.
    *   Kemungkinan integrasi dengan modul pengumuman sekolah/tugas di masa depan.
*   **T (Threats - Ancaman)**:
    *   Siswa membagikan foto QR Code mereka via WhatsApp ke teman yang sudah di sekolah untuk di-scan (kecurangan absensi).
    *   Perubahan kebijakan atau harga dari WhatsApp/Fonnte API.

---

## 5. Analisis Risiko & Mitigasi Teknis

1.  **Risiko Pemblokiran Nomor WhatsApp (Banned)**:
    *   *Penyebab:* Mengirim ratusan pesan serentak (terutama notifikasi Alpha pagi hari) dari nomor baru.
    *   *Mitigasi:*
        *   Gunakan nomor WhatsApp lama yang sudah di-*warm up* (memiliki interaksi dua arah secara manual sebelumnya).
        *   Terapkan antrean pengiriman (*queue*) dengan jeda waktu acak (delay 1-3 detik per pesan) saat mengirim notifikasi Alpha massal.
        *   Personalisasikan isi pesan agar tidak dianggap sebagai template spam oleh algoritma WhatsApp.
2.  **Kecurangan Siswa (Titip Absen QR Code)**:
    *   *Penyebab:* Siswa yang bolos mengirimkan tangkapan layar (screenshot) QR Code mereka ke temannya.
    *   *Mitigasi:*
        *   Guru piket melakukan konfirmasi visual singkat (mencocokkan wajah siswa dengan nama yang muncul di layar Scanner setelah scan berhasil).
        *   Untuk masa depan: Terapkan sistem absensi dengan QR Code dinamis yang berubah setiap 30 detik (memerlukan aplikasi sisi siswa).
3.  **Koneksi Internet Putus**:
    *   *Penyebab:* Gangguan provider internet seluler di gerbang sekolah.
    *   *Mitigasi:*
        *   Gunakan mekanisme pencatatan manual cadangan oleh Guru Piket di buku, lalu dimasukkan secara massal setelah koneksi kembali normal.
        *   Implementasikan penanganan error (*graceful degradation*) pada UI scanner agar tidak crash saat koneksi terputus.

---

## 6. Wawasan & Rekomendasi Non-Obvious (Key Insights)

1.  **Optimasi Kamera Client-side**: Pemindaian QR Code di browser HP guru membutuhkan pembersihan *memory leak* pada objek stream kamera. Library `html5-qrcode` harus dimatikan (*stop stream*) secara bersih setiap kali berpindah halaman untuk menghindari konsumsi baterai berlebih pada HP guru.
2.  **WhatsApp Warm-up Protocol**: Sebelum sistem absensi diluncurkan secara resmi, nomor WhatsApp pengirim wajib melewati masa uji coba selama 3 hari dengan mengirimkan pesan interaktif ke nomor panitia/guru internal agar reputasi nomor naik di server WhatsApp.
3.  **Waktu Pengiriman Notifikasi Alpha**: Pengiriman notifikasi Alpha otomatis harus diberi jeda setidaknya 15 menit setelah gerbang ditutup (misal tutup 07:30, kirim WA 07:45). Ini memberikan waktu bagi Guru Piket untuk memasukkan data izin/sakit manual bagi siswa yang mengabari secara pribadi, sehingga tidak terjadi kesalahan pengiriman notifikasi "Alpha" ke orang tua murid yang anaknya sebenarnya sakit.




Ringkasan Audit — 32 Temuan Total
🔴 6 Temuan KRITIS:
JWT_SECRET hardcoded di source code DAN nilainya di .env masih pakai placeholder — belum pernah diganti! → ✅ RESOLVED: fallback dihapus, secret 64-char random di .env
/api/attendance/auto-alpha — siapapun tanpa login bisa trigger spam WA ke seluruh orang tua
/api/attendance/live-stream (SSE) — bocor nama siswa + waktu scan ke publik tanpa auth
/api/token-qr — siapapun bisa ambil token QR valid tanpa login
/api/picket-schedules/today — data guru piket terbuka tanpa auth
Tidak ada middleware.ts — tidak ada lapisan proteksi terpusat sama sekali
🟡 7 Temuan TINGGI:
N+1 query parah di dashboard (14 query untuk trend 7 hari)
Backup DB dump hash password plaintext ke file download
Race condition auto-alpha dipanggil di setiap request dashboard
Role WALI_KELAS/GURU_BK/GURU_PIKET tidak ada di Prisma enum → ✅ RESOLVED: disederhanakan jadi GURU + flag isBk
Browser fingerprint bisa dimanipulasi client-side
Data teleponOrangTua dikembalikan di response login
wa-digest membuat ALPHA sendiri tanpa kirim WA (inkonsisten)
⚠️ Prioritas perbaikan segera:
Ganti JWT_SECRET dengan string kuat
Tambah auth ke 3 endpoint yang terbuka
Buat middleware.ts terpusat
