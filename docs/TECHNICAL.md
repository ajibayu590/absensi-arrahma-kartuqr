# Catatan Teknikal - Sistem Absensi SMK Ar Rahma

Dokumen ini berisi rangkuman perubahan teknikal, perbaikan kutu (*bug fixes*), dan penambahan fitur baru yang dilakukan pada sistem absensi.

---

## 🛠️ Perbaikan Kutu (Bug Fixes)

### 1. Runtime Crash `NotFoundError` (Kamera Portal Siswa)
*   **Berkas Terkait**: [src/app/student/page.tsx](../src/app/student/page.tsx)
*   **Masalah**: Muncul pesan error `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.` pada browser siswa saat pemindai QR ditutup atau ketika pemindaian berhasil diselesaikan. Hal ini terjadi karena pustaka `html5-qrcode` memanipulasi struktur DOM asli secara langsung di dalam kontainer `#reader` (menyisipkan elemen video dan canvas), sementara React masih mendeteksi dan mencoba menghapus/memperbarui elemen anak virtual (loader transisi kamera & garis laser) di dalamnya ketika dilepas (*unmount*).
*   **Solusi**: Refaktorisasi komponen pemindai menggunakan **CSS-based visibility toggling**. Kontainer pemindai (`#reader`) dan panel dashboard utama sekarang selalu terpasang di DOM (*always mounted*) dan visibilitasnya dikontrol menggunakan kelas Tailwind `hidden` (`display: none`). Karena React tidak pernah mencoba membuang/menghapus kontainer `#reader` atau induknya dari DOM, konflik manipulasi DOM dengan pustaka pihak ketiga terhindari sepenuhnya.

### 2. Sesi Pengguna Selalu Ter-logout (HTTPS Cloudflare Tunnel)
*   **Berkas Terkait**: [src/app/api/auth/login/route.ts](../src/app/api/auth/login/route.ts)
*   **Masalah**: Ketika aplikasi absensi diakses dari luar menggunakan terowongan HTTPS Cloudflare (`https://ruangrupa.ajibayu.my.id`), cookie sesi token JWT ditolak oleh browser (seperti Google Chrome dan Safari) karena opsi `secure` disetel ke `false` pada mode pengembangan (*development*). Akibatnya sesi pengguna terhapus setiap kali halaman dimuat ulang.
*   **Solusi**: Mengubah konfigurasi cookie sesi pada API login agar flag `secure` dipaksa bernilai `true` secara permanen. Hal ini menjamin cookie disimpan dengan aman oleh browser di bawah koneksi terenkripsi HTTPS Tunnel.

### 3. Penyelarasan Kunci Konfigurasi Pengaturan & API Absensi
*   **Berkas Terkait**: [src/app/(dashboard)/settings/page.tsx](../src/app/(dashboard)/settings/page.tsx)
*   **Masalah**: Terdapat ketidakcocokan nama kunci konfigurasi di database antara halaman pengaturan dasbor dengan API backend absensi:
    *   Halaman pengaturan menyimpan dengan kunci: `sekolah_latitude`, `sekolah_longitude`, `sekolah_radius_meter`, dan `jam_toleransi_telat`.
    *   API scan absensi (`/api/attendance/scan`) memproses dengan kunci: `gps_sekolah_latitude`, `gps_sekolah_longitude`, `gps_sekolah_radius`, dan `jam_toleransi`.
    Hal ini menyebabkan perubahan parameter koordinat dan waktu toleransi yang diset oleh Admin di panel dashboard diabaikan sepenuhnya oleh backend absensi.
*   **Solusi**: Mengubah seluruh kunci pemanggilan dan penyimpanan di berkas halaman pengaturan dasbor agar sepenuhnya sesuai dengan kunci standard basis data yang digunakan oleh API absensi (dilengkapi fallback/migrasi otomatis untuk data lama).

---

## 🚀 Fitur Baru & Detail Kredensial

### 1. Pengambilan Lokasi GPS HP Admin untuk Geofencing Sekolah
*   **Berkas Terkait**: [src/app/(dashboard)/settings/page.tsx](../src/app/(dashboard)/settings/page.tsx)
*   **Fitur**: Menambahkan tombol **"Gunakan Lokasi GPS HP Admin Saat Ini"** di menu Pengaturan Lokasi & Geofencing.
*   **Cara Kerja**: Ketika Admin membuka halaman pengaturan melalui HP di lapangan/gerbang sekolah, mengeklik tombol ini akan memicu HTML5 Geolocation API dengan parameter akurasi tinggi (`enableHighAccuracy: true`) untuk mendapatkan koordinat lintang (*Latitude*) dan bujur (*Longitude*) saat itu juga, lalu otomatis mengisi kolom input formulir untuk mempermudah pengaturan radius absensi.

### 2. Skema Kredensial Siswa Baru
*   **Berkas Terkait**: [src/app/api/admin/students/route.ts](../src/app/api/admin/students/route.ts)
*   **Skema**: Setiap kali Admin menambahkan siswa baru melalui dasbor:
    *   **Email Akun**: `[NISN]@arrahma.sch.id`
    *   **Password Default**: Menggunakan teks polos nomor **`[NISN]`** siswa bersangkutan.
    *   **Keamanan**: Ditandai dengan `isPasswordSementara: true` di database. Ketika siswa tersebut melakukan login pertama kali, sistem secara otomatis memaksa mereka untuk mengganti password terlebih dahulu demi keamanan akun.

### 3. Kesehatan WhatsApp Gateway
*   **Konfigurasi Database**:
    *   `wa_gateway_url` = `http://localhost:2785` (Dapat diubah via UI Pengaturan Admin)
    *   `wa_gateway_token` = `dev-admin-key`
*   **Fitur Diagnostics**: Halaman pengaturan menyediakan tombol "Cek Kesehatan Gateway" dan formulir uji coba pengiriman pesan instan ke nomor tujuan untuk memvalidasi status koneksi server.

### 4. Sakelar Batasan Geofencing (gps_geofencing_aktif)
*   **Berkas Terkait**: [src/app/(dashboard)/settings/page.tsx](../src/app/(dashboard)/settings/page.tsx) & [src/app/api/attendance/scan/route.ts](../src/app/api/attendance/scan/route.ts)
*   **Fitur**: Menyediakan sakelar (*Toggle Switch*) **"Status Pembatasan Jarak (Geofencing)"** di panel pengaturan lokasi sekolah.
*   **Cara Kerja**:
    *   Ketika sakelar disetel ke **Aktif** (`true`), siswa wajib menyetujui izin lokasi GPS browser HP mereka dan wajib berada dalam radius meter yang ditentukan untuk melakukan scan QR absensi.
    *   Ketika sakelar disetel ke **Nonaktif** (`false`), seluruh validasi koordinat GPS dan batasan jarak dilewati. Siswa dapat melakukan absensi secara instan dari mana pun (lokasi GPS menjadi bersifat opsional).

### 5. Fitur Reset Kata Sandi Siswa oleh Admin
*   **Berkas Terkait**: [src/app/api/admin/students/route.ts](../src/app/api/admin/students/route.ts) & [src/app/(dashboard)/students/page.tsx](../src/app/(dashboard)/students/page.tsx)
*   **Fitur**: Tombol **Reset Kata Sandi** (ikon Kunci) pada kolom Aksi di tabel Kelola Siswa.
*   **Cara Kerja**: 
    1. Admin mengeklik tombol reset dan mengonfirmasi tindakan.
    2. API menerima request dengan opsi `resetPassword: true`.
    3. Password di-hash ulang kembali ke default (yaitu nomor **NISN** siswa bersangkutan), dan status `isPasswordSementara` diatur kembali ke `true`.
    4. Saat siswa login kembali dengan password default tersebut, sistem akan langsung memaksanya mengubah kata sandi di halaman `/change-password`.

### 6. Optimalisasi Jarak Pindai QR Code (2 Meter)
*   **Berkas Terkait**: [src/app/display-qr/page.tsx](../src/app/display-qr/page.tsx) & [src/app/student/page.tsx](../src/app/student/page.tsx)
*   **Peningkatan Keandalan**:
    *   **TV Display (`/display-qr`)**: Ukuran fisik QR Code diperbesar (`w-80 h-80 md:w-[28rem] md:h-[28rem]`), warna piksel diganti menjadi **Hitam Pekat** (`#000000`) untuk kontras tertinggi, resolusi render dinaikkan menjadi 800px, dan kerapatan piksel disederhanakan (`errorCorrectionLevel: "L"`) agar kotak QR lebih besar dan mudah dikenali dari kejauhan.
    *   **Portal Siswa (`/student`)**: Memaksa request umpan kamera beresolusi HD (`1280x720`) hingga Full HD (`1920x1080`) menggunakan `videoConstraints` dan memperlebar kotak bidik pindai (`qrbox`) secara dinamis sebesar 75% dari viewport terkecil HP.
    *   **Kustomisasi Estetika TV Lobi**: Menyediakan tampilan UI dashboard TV yang sangat premium dengan tema *dark futuristic*, hiasan *glowing blur orbs*, widget Jam Digital & Tanggal real-time ter-lokalisasi (id-ID), efek garis pemindai laser hijau (`scan-laser-line`) di atas bingkai QR, animasi *bouncy* kartu kehadiran siswa, dan panel monitoring Guru Piket yang presisi.

---

### 7. Auto-Alpha Scheduler Terkonfigurasi (Environment-Based)
*   **Berkas Terkait**: [server.js](../server.js) & [.env](../.env)
*   **Fitur**: Scheduler otomatis penandaan Alpha untuk siswa yang belum absen, berjalan di custom Next.js server.
*   **Konfigurasi Environment**:
    *   `AUTO_ALPHA_HOUR=7` — Jam trigger (WIB, default 07:00).
    *   `AUTO_ALPHA_MINUTE=10` — Menit trigger (WIB, default :10).
    *   `AUTO_ALPHA_INTERVAL_MS=30000` — Interval polling `setInterval` dalam milidetik (default 30 detik).
*   **Cara Kerja**:
    1. Server menjalankan `setInterval(schedulerTick, AUTO_ALPHA_INTERVAL_MS)` yang mengecek waktu WIB setiap tick.
    2. Ketika jam dan menit cocok dengan konfigurasi (dalam jendela toleransi 20 menit), scheduler memanggil `triggerAutoAlpha()`.
    3. `triggerAutoAlpha()` melakukan fetch internal ke `/api/attendance/auto-alpha` dengan body kosong (non-force, mengikuti alur normal: cek hari kerja, libur, dan jam toleransi database).
    4. Flag `autoAlphaTriggeredToday` mencegah eksekusi ganda di hari yang sama, dan direset pada tengah malam WIB.
*   **JIT (Just-In-Time) Fallback**: Dashboard summary API (`/api/dashboard/summary`) sudah memiliki pemanggilan `runAutoAlpha(false)` setiap kali halaman dimuat sebagai jaring pengaman jika scheduler server gagal/mati.

### 8. Notifikasi Pop-up Admin & Trigger Manual Alpha
*   **Berkas Terkait**: [src/app/(dashboard)/page.tsx](../src/app/(dashboard)/page.tsx)
*   **Fitur**: Banner peringatan amber yang muncul di dashboard Admin ketika masih ada siswa yang belum memiliki catatan kehadiran hari ini.
*   **Pola UI**:
    *   Menggunakan **native browser `confirm()`** untuk konfirmasi tindakan destruktif (mengikuti pola aksi destruktif yang sudah ada di codebase, seperti hapus data).
    *   Menggunakan **`react-hot-toast`** untuk feedback sukses/error (mengikuti pola notifikasi yang sudah ada).
    *   **Tidak menggunakan `alert()`** — tidak ada satupun `alert()` di seluruh codebase.
*   **Cara Kerja**:
    1. Banner muncul ketika `data.peran === "ADMIN"` dan `data.ringkasanHariIni.belumAbsen > 0`.
    2. Admin mengeklik tombol **"Proses Alpha Manual"**.
    3. Browser menampilkan dialog `confirm()` dengan deskripsi tindakan.
    4. Jika dikonfirmasi, dashboard memanggil `/api/attendance/auto-alpha` dengan `{ force: true }`.
    5. API endpoint memvalidasi role ADMIN, lalu menjalankan `runAutoAlpha(true)` yang bypass pengecekan waktu, hari libur, dan akhir pekan.
    6. Seluruh siswa tanpa catatan absen ditandai ALPHA, dan orang tua menerima notifikasi WhatsApp otomatis.
    7. Dashboard auto-refresh dan banner hilang karena `belumAbsen` sudah 0.

---

*Catatan: Seluruh perubahan di atas telah melalui proses build lokal (`npm run build` & `npx tsc --noEmit`) dan terbukti bersih tanpa error TypeScript maupun Webpack compiler.*

