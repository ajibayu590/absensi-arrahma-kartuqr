# 💻 Panduan Pengembangan & Deploy Lokal — SMK Ar Rahma

Dokumen ini menjelaskan daftar perangkat lunak yang harus dipersiapkan serta prosedur lengkap untuk menjalankan aplikasi **Sistem Absensi Siswa SMK Ar Rahma** di lingkungan komputer lokal (Windows/macOS/Linux).

---

## 🛠️ APLIKASI YANG HARUS DISIAPKAN

Sebelum memulai, pastikan perangkat lunak berikut telah terinstal di komputer Anda:

1. **Node.js (Versi 18.x atau lebih baru)**
   * Digunakan untuk menjalankan runtime Javascript aplikasi Next.js.
   * Unduh di: [nodejs.org](https://nodejs.org/) (Disarankan versi LTS).
2. **Git**
   * Digunakan untuk mengelola repositori kode.
   * Unduh di: [git-scm.com](https://git-scm.com/).
3. **Database Server (MySQL / MariaDB)**
   * Pilih salah satu paket aplikasi server lokal berikut untuk kemudahan setup:
     * **XAMPP** (Multiplatform): Mengandung Apache + MariaDB + PHP. Unduh di: [apachefriends.org](https://www.apachefriends.org/).
     * **Laragon** (Windows - Sangat direkomendasikan): Ringan dan cepat. Unduh di: [laragon.org](https://laragon.org/).
     * **Docker** (Opsional): Jika Anda terbiasa dengan kontainerisasi.
4. **Editor Kode (VS Code)**
   * Untuk membuka dan mengedit berkas proyek.
   * Unduh di: [code.visualstudio.com](https://code.visualstudio.com/).
5. **Database Client (Opsional)**
   * Untuk mempermudah melihat isi tabel database secara visual:
     * **phpMyAdmin** (Bawaan XAMPP/Laragon di browser).
     * **DBeaver** atau **HeidiSQL** (Desktop).

---

## 🚀 PROSEDUR DEPLOYMENT LOKAL

### Langkah 1: Persiapan Database
1. Pastikan server **MySQL** Anda di XAMPP atau Laragon sudah dalam status **Running/Start**.
2. Masuk ke phpMyAdmin (`http://localhost/phpmyadmin`) atau database client Anda.
3. Buat database baru bernama: `absensi_smk_ar_rahma`.

### Langkah 2: Konfigurasi File Environment (`.env`)
Buat berkas bernama `.env` di root folder proyek (`/mnt/save/project/absensi/absensi_smk_ar_rahma/.env`) dan isi dengan konfigurasi berikut:

```env
# Koneksi ke MySQL lokal (Sesuaikan username, password, port, dan nama database)
DATABASE_URL="mysql://root:password_mysql_anda@localhost:3306/absensi_smk_ar_rahma"

# Kunci rahasia JWT untuk token sesi (buat string acak dan panjang)
JWT_SECRET="b6zf6P87few-81MRk1uz-zi6fFujFU0_D8qqQoDNyeJB1OjkATV7A3GsF6aKOVjI"
JWT_EXPIRES_IN="7d"

# Kunci enkripsi AES token QR TV (Harus tepat 32 karakter)
AES_SECRET_KEY="12345678901234567890123456789012"

# Token integrasi Fonnte WA Gateway (Dapatkan dari dashboard Fonnte)
FONNTE_TOKEN="isi_token_fonnte_anda"

# Konfigurasi Auto-Alpha Scheduler
AUTO_ALPHA_HOUR=7
AUTO_ALPHA_MINUTE=10
AUTO_ALPHA_INTERVAL_MS=30000
SCHEDULER_SECRET="absensi_smk_ar_rahma_scheduler_secret_key_2026"
```

### Langkah 3: Instalasi Dependensi Proyek
Buka terminal/command prompt di folder proyek ini dan jalankan perintah berikut untuk mengunduh packages:
```bash
npm install
```

### Langkah 4: Sinkronisasi Skema Database & Seeding
Jalankan perintah ini untuk membuat tabel database dan mengisi data bawaan (Akun admin awal, pengaturan awal, hari libur default):
```bash
# Membuat tabel di database berdasarkan skema Prisma
npx prisma db push

# Memasukkan data awal (seed data) ke dalam database
npx prisma db seed
```

### Langkah 5: Menjalankan Aplikasi

Anda dapat menjalankan aplikasi dalam dua mode:

#### A. Mode Pengembangan (Development Mode)
Cocok untuk melakukan modifikasi kode karena perubahan file akan langsung dimuat secara otomatis (*Hot Reload*).
```bash
npm run dev
```
Buka peramban (browser) dan akses alamat: `http://localhost:3000`.

#### B. Mode Produksi (Production Mode dengan Scheduler)
Disarankan jika Anda ingin mensimulasikan lingkungan rilis serta mengaktifkan background cron scheduler harian untuk penandaan status absen Alpha secara otomatis.
```bash
# Melakukan kompilasi build produksi Next.js
npm run build

# Menjalankan server kustom dengan cron scheduler aktif
node server.js
```
Buka peramban (browser) dan akses alamat: `http://localhost:3000`.

---

## 🔑 KREDENSI LOGIN AKUN DEFAULT (SEED DATA)

Setelah menjalankan `npx prisma db seed`, Anda dapat login menggunakan akun administrator awal berikut:
* **Email**: `admin@arrahma.sch.id`
* **Kata Sandi**: `admin123`

---

## 🖥️ MENJALANKAN SERVER SECARA BACKGROUND DI WINDOWS

Agar scheduler `auto-alpha` berjalan otomatis tanpa harus membuka terminal Command Prompt (CMD) terus-menerus di Windows, gunakan salah satu metode berikut:

### Opsi A: Menggunakan PM2 (Rekomendasi & Paling Praktis)
PM2 adalah manajer proses Node.js yang akan otomatis menjaga aplikasi tetap aktif di latar belakang (background) dan melakukan restart jika terjadi crash.

1. Buka CMD/PowerShell sebagai **Administrator**.
2. Instal PM2 secara global di sistem Windows Anda:
   ```bash
   npm install -g pm2
   ```
3. Masuk ke folder proyek, lalu daftarkan dan jalankan `server.js`:
   ```bash
   pm2 start server.js --name "absensi-arrahma"
   ```
4. **Perintah PM2 Pendukung:**
   * Melihat status aplikasi: `pm2 status`
   * Melihat log/output scheduler: `pm2 logs`
   * Menghentikan server: `pm2 stop absensi-arrahma`
   * Menyalakan ulang server: `pm2 restart absensi-arrahma`
5. **Auto-Start saat Windows Boot:**
   Agar PM2 otomatis berjalan ketika Windows menyala tanpa perlu login user:
   ```bash
   # Install helper startup Windows
   npm install -g pm2-windows-startup
   
   # Registrasikan sebagai Windows Service
   pm2-startup install
   
   # Simpan konfigurasi proses aktif saat ini
   pm2 save
   ```

### Opsi B: Menggunakan NSSM (Non-Sucking Service Manager)
Jika Anda ingin aplikasi Next.js ini benar-benar berjalan sebagai **Windows Service** resmi di sistem (`services.msc`).

1. Unduh **NSSM** di [nssm.cc](https://nssm.cc/) dan ekstrak.
2. Buka CMD sebagai **Administrator**, lalu jalankan:
   ```cmd
   nssm install AbsensiArRahma
   ```
3. Pada GUI NSSM yang muncul, isi konfigurasi berikut:
   * **Path**: Pilih file `node.exe` Anda (contoh: `C:\Program Files\nodejs\node.exe`).
   * **Startup directory**: Pilih folder root proyek absensi (`C:\path\ke\absensi_smk_ar_rahma`).
   * **Arguments**: Isi `server.js`.
4. Klik **Install service**.
5. Buka `services.msc` di Windows, cari layanan `AbsensiArRahma`, ubah Startup Type menjadi **Automatic**, lalu klik **Start**.

---

## 🔒 KONFIGURASI HTTPS & DOMAIN LOKAL DENGAN MIKROTIK

Geofencing GPS dan pemindaian Kamera memerlukan protokol **HTTPS** agar browser perangkat (terutama iOS/Chrome mobile) mengizinkan akses kamera & GPS. Berikut cara konfigurasi domain lokal (misal: `absensi.local`) berprotokol HTTPS menggunakan router MikroTik dan Windows Server.

### 1. Konfigurasi DNS Static & Firewall di MikroTik
Agar domain `absensi.local` diarahkan ke Windows lokal server Anda:
1. Dapatkan IP Statis Windows lokal server Anda (contoh: `192.168.1.100`).
2. Masuk ke **WinBox** MikroTik.
3. Buka menu **IP** -> **DNS** -> Klik tombol **Static**.
4. Klik tombol **+** (Add) dan isi:
   * **Name**: `absensi.local`
   * **Address**: `192.168.1.100` (IP Windows lokal server Anda)
5. Klik **Apply** -> **OK**.
6. Hubungkan perangkat client (HP/Tablet) ke Wi-Fi sekolah yang dikelola MikroTik tersebut. Domain `absensi.local` kini mengarah ke Windows server.

#### A. Paksa Klien Menggunakan DNS MikroTik (Force DNS Redirect via NAT)
Siswa seringkali mengubah setelan DNS HP mereka secara manual ke DNS publik (seperti `8.8.8.8` or `1.1.1.1`). Jika ini terjadi, domain lokal `absensi.local` tidak akan bisa diakses karena dilempar ke server DNS internet publik.
Guna mengatasinya, buat aturan NAT di MikroTik untuk membelokkan semua permintaan DNS (port 53) ke DNS internal MikroTik secara paksa:

1. Buka **WinBox** MikroTik.
2. Buka menu **IP** -> **Firewall** -> Pilih tab **NAT**.
3. Klik tombol **+** (Add) untuk protokol **UDP**:
   * **Tab General**:
     * **Chain**: `dstnat`
     * **Protocol**: `17 (udp)`
     * **Dst. Port**: `53`
   * **Tab Action**:
     * **Action**: `redirect`
     * **To Ports**: `53`
4. Klik **Apply** -> **OK**.
5. Klik tombol **+** (Add) lagi untuk protokol **TCP**:
   * **Tab General**:
     * **Chain**: `dstnat`
     * **Protocol**: `6 (tcp)`
     * **Dst. Port**: `53`
   * **Tab Action**:
     * **Action**: `redirect`
     * **To Ports**: `53`
6. Klik **Apply** -> **OK**. 

*Kini, semua permintaan nama domain oleh perangkat client Wi-Fi lokal dipaksa menggunakan data DNS dari MikroTik.*

#### B. Konfigurasi Firewall Filter (Buka Akses Port Server)
Pastikan lalu lintas data ke lokal server tidak diblokir oleh keamanan firewall filter MikroTik.

1. Buka menu **IP** -> **Firewall** -> Pilih tab **Filter Rules**.
2. Klik tombol **+** (Add) untuk membuat rule baru:
   * **Tab General**:
     * **Chain**: `forward`
     * **Dst. Address**: `192.168.1.100` (IP Windows lokal server Anda)
     * **Protocol**: `6 (tcp)`
     * **Dst. Port**: `80,443`
   * **Tab Action**:
     * **Action**: `accept`
3. Klik **Apply** -> **OK**. Tarik/geser rule ini ke posisi teratas (di atas rule drop/reject umum).

---

### 2. Membuat Sertifikat SSL Lokal Terpercaya (mkcert)
Guna menghindari error "Connection not private/SSL Warning" di peramban, buat sertifikat SSL lokal menggunakan **mkcert**.

1. Buka CMD / PowerShell sebagai **Administrator** di Windows Server.
2. Pasang `mkcert` (menggunakan paket manajer Chocolatey atau unduh manual dari GitHub):
   ```powershell
   # Jika menggunakan Chocolatey
   choco install mkcert
   ```
3. Pasang Otoritas Sertifikat (CA) mkcert ke sistem Windows agar dipercaya sistem & browser lokal:
   ```powershell
   mkcert -install
   ```
4. Generate sertifikat SSL untuk domain lokal dan IP lokal server Anda:
   ```powershell
   # Ganti 192.168.1.100 dengan IP Windows server Anda
   mkcert absensi.local localhost 127.0.0.1 192.168.1.100
   ```
   Perintah ini akan menghasilkan dua berkas di folder berjalan:
   * **Sertifikat**: `absensi.local+3.pem`
   * **Kunci Privat**: `absensi.local+3-key.pem`

---

### 3. Konfigurasi Reverse Proxy HTTPS di Windows

Untuk melayani port HTTPS (443) dan meneruskannya ke port Next.js (3000), gunakan salah satu opsi server web di Windows berikut:

#### Opsi A: Menggunakan Nginx untuk Windows (Direkomendasikan)
1. Unduh Nginx untuk Windows di [nginx.org](https://nginx.org/) dan ekstrak (misal ke `C:\nginx`).
2. Pindahkan dua berkas `.pem` hasil generate `mkcert` ke folder `C:\nginx\conf\ssl\`.
3. Buka dan edit berkas konfigurasi `C:\nginx\conf\nginx.conf`:
   ```nginx
   worker_processes  1;

   events {
       worker_connections  1024;
   }

   http {
       include       mime.types;
       default_type  application/octet-stream;
       sendfile        on;
       keepalive_timeout  65;

       # Alihkan HTTP (80) ke HTTPS (443)
       server {
           listen       80;
           server_name  absensi.local;
           return 301 https://$host$request_uri;
       }

       # Konfigurasi HTTPS (443)
       server {
           listen       443 ssl;
           server_name  absensi.local;

           ssl_certificate      ssl/absensi.local+3.pem;
           ssl_certificate_key  ssl/absensi.local+3-key.pem;

           ssl_session_cache    shared:SSL:1m;
           ssl_session_timeout  5m;
           ssl_ciphers  HIGH:!aNULL:!MD5;
           ssl_prefer_server_ciphers  on;

           # Meneruskan request ke server Next.js (port 3000)
           location / {
               proxy_pass http://127.0.0.1:3000;
               proxy_http_version 1.1;
               proxy_set_header Upgrade $http_upgrade;
               proxy_set_header Connection 'upgrade';
               proxy_set_header Host $host;
               proxy_cache_bypass $http_upgrade;
               proxy_set_header X-Real-IP $remote_addr;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
               proxy_set_header X-Forwarded-Proto $scheme;
           }
       }
   }
   ```
4. Jalankan Nginx dari CMD:
   ```cmd
   cd C:\nginx
   start nginx
   ```
5. Akses portal dari HP client melalui browser dengan mengetik: `https://absensi.local`.

#### Opsi B: Menggunakan Caddy Server (Paling Cepat & Otomatis)
Caddy secara otomatis mengelola sertifikat SSL lokal dan sangat mudah dikonfigurasi.
1. Unduh Caddy untuk Windows di [caddyserver.com](https://caddyserver.com/).
2. Buat file bernama `Caddyfile` di folder tempat caddy berada:
   ```caddy
   absensi.local {
       tls "path/ke/absensi.local+3.pem" "path/ke/absensi.local+3-key.pem"
       reverse_proxy localhost:3000
   }
   ```
3. Jalankan Caddy dari CMD:
   ```cmd
   caddy run
   ```


