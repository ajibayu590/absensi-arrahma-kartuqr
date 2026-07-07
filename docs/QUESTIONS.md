# Clarifying Questions & Assumptions — Sistem Absensi SMK Ar Rahma

Berikut adalah rangkuman jawaban dari user serta asumsi dasar (autonomous-mode assumptions) untuk melanjutkan ke tahap Riset dan PRD.

## 1. Peran Pengguna (Roles) - *[Jawaban User]*
Sistem memiliki 6 peran pengguna:
1.  **Admin**: Pengelola utama data master (Siswa, Guru, Kelas, Jadwal).
2.  **Guru Piket**: Bertugas memindai QR Code siswa di gerbang sekolah dan mencatat kehadiran manual jika diperlukan.
3.  **Wali Kelas**: Melihat rekap kehadiran harian/bulanan khusus untuk siswa di kelasnya.
4.  **Guru BK (Bimbingan Konseling)**: Mengawasi siswa dengan tingkat kehadiran rendah atau sering terlambat untuk tindak lanjut.
5.  **Kepala Sekolah**: Melihat dashboard statistik kehadiran sekolah secara keseluruhan dan mengunduh laporan bulanan.
6.  **Siswa**: Memiliki portal/halaman pribadi untuk melihat riwayat kehadiran mereka sendiri dan menampilkan QR Code kartu pelajar digital mereka.

---

## 2. Asumsi Operasional (Autonomous-Mode Assumptions)

Untuk pertanyaan yang belum dijawab, kami menetapkan asumsi awal berikut agar pengembangan versi awal (Next.js + SQL) bisa berjalan cepat:

*   **Q2 (Siswa tidak bawa kartu/terlambat)**: Guru Piket dapat mengetikkan nama/NISN siswa di kolom pencarian pada halaman Scanner untuk mencatat kehadiran secara manual.
*   **Q3 (Database SQL)**: Menggunakan **MySQL** (karena umum digunakan di hosting cPanel) dengan **Prisma ORM** untuk query yang cepat dan aman.
*   **Q4 (WhatsApp Notifikasi)**: Menggunakan provider **Fonnte API**. Sistem akan mengirim log ke console/database terlebih dahulu jika API Token belum dikonfigurasi di file `.env`.
*   **Q5 (Input Data Master)**: Input data menggunakan form CRUD admin sederhana dan fitur **Import Excel (CSV)** untuk siswa secara massal.
*   **Q6 (Batas Waktu Masuk)**:
    *   **Masuk Normal**: Sebelum pukul 07:00 WIB.
    *   **Terlambat (Late)**: Pukul 07:00 - 07:30 WIB (Siswa masih bisa absen tapi status tercatat sebagai *Terlambat*).
    *   **Batas Scan/Alpha**: Setelah pukul 07:30 WIB, tombol scan ditutup, dan siswa yang belum hadir otomatis ditandai sebagai **Alpha**.
*   **Q7 (Optimasi Sinyal)**: Scanner QR Code dijalankan sepenuhnya di sisi client (browser guru) menggunakan JavaScript untuk menghemat bandwidth internet sekolah.
