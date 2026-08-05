# Temuan Penggunaan `new Date()` dan Manipulasi Tanggal di API Routes dan Helpers

Pemeriksaan berkas pada `src/app/api/...` dan `src/lib/...` menemukan beberapa pola manipulasi tanggal dan penggunaan `new Date()`. Beberapa berkas menggunakan zona waktu Asia/Jakarta (WIB) dengan benar, sedangkan berkas lain memerlukan perhatian khusus agar konsisten.

## Berkas dan Rincian Penggunaan

### 1. `src/app/api/attendance/scan/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\attendance\scan\route.ts`)
- **Kode:**
  - `Line 152: const now = new Date();`
  - `Line 159: const formatter = new Intl.DateTimeFormat('en-CA', options);`
  - `Line 161: const cleanDate = new Date(wibDateString);`
  - `Line 265: const waktuMasuk = new Date();`
- **Analisis:** Menggunakan `Intl.DateTimeFormat` dengan zona waktu `Asia/Jakarta` untuk mendapatkan `wibDateString`. Namun, `new Date()` langsung dipanggil tanpa parameter saat menentukan `waktuMasuk` (menyimpan UTC/sistem server).

### 2. `src/lib/auto-alpha.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\lib\auto-alpha.ts`)
- **Kode:**
  - `Line 21: const now = new Date();`
  - `Line 22: const wibDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });`
  - `Line 29: const cleanToday = new Date(dateStr);`
  - `Line 32: const wibDayName = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta' });`
- **Analisis:** Menangani zona waktu Asia/Jakarta secara konsisten untuk penentuan tanggal hari ini dan nama hari.

### 3. `src/app/api/cron/wa-digest/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\cron\wa-digest\route.ts`)
- **Kode:**
  - `Line 28: const wibOffset = 7 * 60 * 60 * 1000;`
  - `Line 29: const wibDate = new Date(Date.now() + wibOffset);`
- **Analisis:** Menggunakan penambahan offset manual `7 jam` untuk memaksa zona waktu WIB. Pola offset manual ini berisiko jika server Next.js sudah berjalan di timezone WIB/Asia/Jakarta, karena akan menambahkan 7 jam dua kali.

### 4. `src/app/api/bk/ews/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\bk\ews\route.ts`)
- **Kode:**
  - `Line 31: const now = new Date();`
  - `Line 35: const startDate = new Date(Date.UTC(targetTahun, targetBulan, 1));`
  - `Line 36: const endDate = new Date(Date.UTC(targetTahun, targetBulan + 1, 0, 23, 59, 59, 999));`
- **Analisis:** Menggunakan `Date.UTC()` untuk menetapkan awal dan akhir bulan. Hal ini dapat menyebabkan ketidaksesuaian zona waktu saat query data absensi yang disimpan dalam zona waktu WIB.

### 5. `src/app/api/attendance/bulk-sync/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\attendance\bulk-sync\route.ts`)
- **Kode:**
  - `Line 57: const cleanDate = new Date(log.tanggal);`
  - `Line 88: const dbWaktuMasuk = log.waktuMasuk ? new Date(log.waktuMasuk) : null;`
  - `Line 111: new Date(dbWaktuMasuk.getTime() + 7 * 60 * 60 * 1000)`
- **Analisis:** Menggunakan manipulasi offset manual (+7 jam) secara hardcoded untuk penyesuaian tampilan waktu masuk.

### 6. `src/app/api/student/dispensation/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\student\dispensation\route.ts`)
- **Kode:**
  - `Line 39: const wibOffset = 7 * 60 * 60 * 1000;`
  - `Line 40: const cleanToday = new Date(new Date(Date.now() + wibOffset).toISOString().split("T")[0]);`
- **Analisis:** Menggunakan penambahan offset manual `7 jam` untuk penentuan tanggal WIB.

### 7. `src/app/api/student/dashboard/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\student\dashboard\route.ts`)
- **Kode:**
  - `Line 37: const hariIni = new Date();`
  - `Line 78: new Date(pengguna.absenDiblokirHingga) > new Date()`
  - `Line 108: waktuMasuk: k.waktuMasuk ? new Date(k.waktuMasuk).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })`
- **Analisis:** Menggunakan format lokal dengan opsi `timeZone: "Asia/Jakarta"` untuk penampilan waktu masuk. Namun, perbandingan blokir absen menggunakan waktu lokal server/UTC (`new Date()`).

### 8. `src/app/api/admin/wa-status/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\admin\wa-status\route.ts`)
- **Kode:**
  - `Line 182: new Date().toLocaleTimeString("id-ID")`
- **Analisis:** Menggunakan `toLocaleTimeString` tanpa parameter `timeZone: "Asia/Jakarta"`, sehingga bergantung pada zona waktu bawaan server.

### 9. `src/app/api/picket-schedules/today/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\picket-schedules\today\route.ts`)
- **Kode:**
  - `Line 30: const wibOffset = 7 * 60 * 60 * 1000;`
  - `Line 31: const wibDate = new Date(Date.now() + wibOffset);`
- **Analisis:** Menggunakan penambahan offset manual `7 jam`.

### 10. `src/app/api/attendance/manual/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\attendance\manual\route.ts`)
- **Kode:**
  - `Line 60: const cleanDate = new Date(tanggal);`
  - `Line 73: const waktuMasuk = new Date();`
  - `Line 112: const wibDate = new Date(Date.now() + wibOffset);`
- **Analisis:** Menggunakan kombinasi `new Date()` server langsung untuk waktu masuk, dan penambahan offset manual `7 jam` untuk visualisasi.

### 11. `src/app/api/reports/student-card/route.tsx` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\reports\student-card\route.tsx`)
- **Kode:**
  - `Line 223: new Date().toLocaleDateString("id-ID")`
  - `Line 377: const startDate = new Date(Date.UTC(targetTahun, targetBulan - 1, 1));`
- **Analisis:** Tidak memaksakan zona waktu `Asia/Jakarta` secara eksplisit saat format cetak kartu.

### 12. `src/app/api/admin/settings/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\admin\settings\route.ts`)
- **Kode:**
  - `Line 111: const wibDate = new Date(Date.now() + wibOffset);`
  - `Line 124: gte: new Date(cleanToday.getTime() - wibOffset)`
- **Analisis:** Menggunakan manipulasi offset manual `7 jam`.

### 13. `src/app/api/dashboard/broadcast/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\dashboard\broadcast\route.ts`)
- **Kode:**
  - `Line 36: const wibOffset = 7 * 60 * 60 * 1000;`
  - `Line 37: const wibDate = new Date(Date.now() + wibOffset);`
- **Analisis:** Menggunakan manipulasi offset manual `7 jam`.

### 14. `src/app/api/dashboard/summary/route.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\app\api\dashboard\summary\route.ts`)
- **Kode:**
  - `Line 72: const wibDateString = wibDateFormatter.format(now)`
  - `Line 199: const targetDateWIB = new Date(dWibString);`
  - `Line 296: sentAt: new Date(l.sentAt).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })`
- **Analisis:** Menggunakan formatter dengan opsi `timeZone: "Asia/Jakarta"` dengan benar pada beberapa bagian, namun ada juga manipulasi manual.

### 15. `src/lib/fingerprint.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\lib\fingerprint.ts`)
- **Kode:**
  - `Line 13: new Date().getTimezoneOffset()`
- **Analisis:** Digunakan untuk deteksi sidik jari peramban klien, tidak memengaruhi logika server.

### 16. `src/lib/auth-helper.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\lib\auth-helper.ts`)
- **Kode:**
  - `Line 80: Date.now() >= payload.exp * 1000`
- **Analisis:** Pembandingan timestamp JWT (skala detik), tidak bergantung zona waktu karena bersifat absolut.

### 17. `src/lib/whatsapp.ts` (Absolute Path: `C:\Users\ardia\Videos\test\abesnkebalik\absensi-arrahma-kartuqr\src\lib\whatsapp.ts`)
- **Kode:**
  - `Line 174: sentAt: new Date()`
- **Analisis:** Menyimpan waktu kirim WA menggunakan zona waktu bawaan sistem/database.
