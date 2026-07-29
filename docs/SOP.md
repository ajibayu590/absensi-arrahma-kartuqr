# SOP — Implementasi Sistem Absensi Siswa SMK Ar Rahma (Unified Next.js)

**Versi:** 2.4 (Schema Sync — 12 model, 5 enum, isBk flag)  
**Tanggal:** 2026-06-18  
**Status:** Draft  
**Referensi PRD:** PRD.md  

---

## BAGIAN 1: STRUKTUR FOLDER PROJECT (SINGLE CODEBASE)

Proyek akan diorganisasi di dalam folder `absensi_smk_ar_rahma/` dengan struktur Next.js standar berikut:

```
absensi_smk_ar_rahma/
├── prisma/
│   ├── schema.prisma       ← Schema Database MySQL (Bahasa Indonesia)
│   └── seed.ts             ← Seed data awal (Admin, Siswa, & Pengaturan default)
├── src/
│   ├── app/                ← Next.js App Router
│   │   ├── (auth)/         ← Halaman Login (Siswa & Staff)
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/    ← Halaman Terproteksi (RBAC)
│   │   │   ├── layout.tsx  ← Sidebar & Navbar
│   │   │   ├── page.tsx    ← Dashboard Statistik, Ringkasan Kehadiran, & WA Monitor
│   │   │   ├── scan/page.tsx   ← Absen Manual (Guru Piket)
│   │   │   ├── students/page.tsx ← Kelola Data Siswa, Import, & Kenaikan Kelas
│   │   │   ├── classes/page.tsx  ← Kelola Kelas & Tahun Ajaran
│   │   │   ├── settings/page.tsx ← Pengaturan Dinamis (Admin Only)
│   │   │   └── reports/page.tsx  ← Rekap Kehadiran & Export Excel (Terproteksi)
│   │   ├── student/        ← Portal Siswa (HP)
│   │   │   └── page.tsx    ← Scan QR Mandiri (Kamera + GPS + Audio Beep + Ganti Kamera & Flash)
│   │   ├── display-qr/page.tsx   ← Tampilan TV Kantor (QR Code Dinamis 10s + Hitung Mundur)
│   │   └── api/            ← Backend API Routes
│   │       ├── auth/       ← Route Auth (Session)
│   │       ├── token-qr/   ← Get Dynamic QR Token
│   │       ├── wa-retry/   ← Kirim Ulang Pesan Pending/Gagal (Offline Queue)
│   │       ├── attendance/ ← Proses Scan Absensi (Validasi Token, GPS & Jam)
│   │       │   ├── live-stream/route.ts ← Real-time SSE Stream (Broadcast ke banyak TV)
│   │       │   └── cron-alpha/route.ts  ← Pemicu Auto-Alpha & Laporan WA (07:15 WIB, skip akhir pekan/hari libur)
│   │       ├── settings/   ← Route Get/Update Setting DB
│   │       ├── students/   ← CRUD Siswa & Import
│   │       ├── classes/    ← Route CRUD Kelas
│   │       ├── admin/      ← Integrasi Fitur Admin Tambahan
│   │       │   ├── audit-logs/route.ts  ← Mengambil/Menyimpan Log Aktivitas
│   │       │   ├── wa-test/route.ts     ← Pengujian WhatsApp Connector
│   │       │   ├── backup-db/route.ts   ← Ekspor Backup Database MySQL (JSON raw parser)
│   │       │   └── sync-holidays/route.ts ← Sinkronisasi API Libur Nasional
│   │       └── wali-kelas/  ← Integrasi Fitur Wali Kelas
│   │           └── wa-broadcast/route.ts ← Custom WhatsApp Broadcast Massal
│   ├── components/         ← Reusable UI (Scanner, Table, Modal)
│   ├── lib/
│   │   ├── prisma.ts       ← Global Prisma Client
│   │   ├── settings.ts     ← Helper Pengambilan Config dari Database
│   │   ├── token-helper.ts ← Utils Enkripsi/Dekripsi Token QR Dinamis
│   │   └── whatsapp.ts     ← Utility Kirim WA (Fonnte / Open WA + Auto-Formatter)
│   └── store/              ← Zustand untuk global state
├── .env                    ← Env vars (DATABASE_URL, JWT_SECRET)
├── package.json
├── PRD.md
└── SOP.md
```

---

## BAGIAN 2: DATABASE SCHEMA (PRISMA SQL BAHASA INDONESIA)

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Peran {
  ADMIN
  KEPALA_SEKOLAH
  GURU
  SISWA
}

enum StatusKehadiran {
  HADIR
  TERLAMBAT
  SAKIT
  IZIN
  ALPHA
}

enum StatusLogWa {
  TERKIRIM
  GAGAL
  GAGAL_OFFLINE
  TERTUNDA
}

model Pengguna {
  id                  Int             @id @default(autoincrement())
  nama                String
  email               String          @unique
  kataSandi           String
  peran               Peran           @default(SISWA)
  isPasswordSementara Boolean         @default(true)
  aktif               Boolean         @default(true)
  sidikJariBrowser    String?         @db.Text
  absenDiblokirHingga DateTime?
  dibuatPada          DateTime        @default(now())
  diubahPada          DateTime        @updatedAt

  siswa               Siswa?
  guru                Guru?
  logAuditAdmin       LogAuditAdmin[]
  kehadiranDicatat    Kehadiran[]     @relation("PencatatKehadiran")
  logKonselingBk      LogKonselingBk[] @relation("GuruBkKonseling")
  dispensasiDisetujui DispensasiKeterlambatan[] @relation("PencatatDispensasi")
}

model Kelas {
  id           Int       @id @default(autoincrement())
  nama         String    @unique
  tahunAjaran  String
  siswa        Siswa[]
  idGuru       Int?      @unique
  guru         Guru?     @relation("WaliKelas", fields: [idGuru], references: [id], onDelete: SetNull, onUpdate: Cascade)
  dibuatPada   DateTime  @default(now())
  diubahPada   DateTime  @updatedAt
}

model Guru {
  id          Int       @id @default(autoincrement())
  nip         String?   @unique
  telepon     String?   // Nomor WA untuk laporan otomatis Wali Kelas
  idPengguna  Int       @unique
  pengguna    Pengguna  @relation(fields: [idPengguna], references: [id], onDelete: Cascade, onUpdate: Cascade)
  isBk        Boolean   @default(false)
  kelasWali   Kelas?    @relation("WaliKelas")
  jadwalPiket JadwalPiket[]
  dibuatPada  DateTime  @default(now())
  diubahPada  DateTime  @updatedAt
}

model Siswa {
  id                   Int              @id @default(autoincrement())
  nisn                 String           @unique
  nama                 String
  idKelas              Int
  teleponOrangTua      String
  sedangMagang         Boolean          @default(false)
  tanggalMulaiMagang   DateTime?
  tanggalSelesaiMagang DateTime?
  idPengguna           Int              @unique
  pengguna             Pengguna         @relation(fields: [idPengguna], references: [id], onDelete: Cascade, onUpdate: Cascade)
  kelas                Kelas            @relation(fields: [idKelas], references: [id], onDelete: Restrict, onUpdate: Cascade)
  kehadiran            Kehadiran[]
  logWa                LogWa[]
  logKonselingBk       LogKonselingBk[]
  dispensasiKeterlambatan DispensasiKeterlambatan[]
  dibuatPada           DateTime         @default(now())
  diubahPada           DateTime         @updatedAt
}

model Kehadiran {
  id          Int             @id @default(autoincrement())
  idSiswa     Int
  tanggal     DateTime        @db.Date
  tahunAjaran String          @default("2024/2025") // Kolom baru untuk optimasi rekap
  status      StatusKehadiran @default(HADIR)
  waktuMasuk  DateTime?
  latitude    Float?
  longitude   Float?
  dicatatOleh Int?
  catatan     String?
  siswa       Siswa           @relation(fields: [idSiswa], references: [id], onDelete: Cascade, onUpdate: Cascade)
  pencatat    Pengguna?       @relation("PencatatKehadiran", fields: [dicatatOleh], references: [id], onDelete: SetNull, onUpdate: Cascade)
  dibuatPada  DateTime        @default(now())
  diubahPada  DateTime        @updatedAt

  @@unique([idSiswa, tanggal])
  @@index([tanggal, status])
  @@index([tahunAjaran])
}

model LogWa {
  id        Int         @id @default(autoincrement())
  idSiswa   Int
  telepon   String
  pesan     String      @db.Text
  status    StatusLogWa @default(TERTUNDA)
  error     String?     @db.Text
  sentAt    DateTime    @default(now())
  siswa     Siswa       @relation(fields: [idSiswa], references: [id], onDelete: Cascade, onUpdate: Cascade)
}

model Pengaturan {
  id         Int      @id @default(autoincrement())
  kunci      String   @unique
  nilai      String   @db.Text
  dibuatPada DateTime @default(now())
  diubahPada DateTime @updatedAt
}

model HariLibur {
  id         Int      @id @default(autoincrement())
  tanggal    DateTime @db.Date @unique
  nama       String
  isKustom   Boolean  @default(false)
  dibuatPada DateTime @default(now())
  diubahPada DateTime @updatedAt
}

model LogAuditAdmin {
  id         Int      @id @default(autoincrement())
  idPengguna Int
  pengguna   Pengguna @relation(fields: [idPengguna], references: [id], onDelete: Restrict, onUpdate: Cascade)
  tindakan   String   // e.g. "UPDATE_SETTINGS", "RESET_PASSWORD", "SYNC_HOLIDAYS", "IMPORT_STUDENTS"
  target     String   // e.g. "GPS_SCHOOL", "TEACHER_12", "HOLIDAYS"
  detail     String   @db.Text // Menyimpan data JSON sebelum dan sesudah perubahan
  createdAt  DateTime @default(now())
}

model LogKonselingBk {
  id         Int      @id @default(autoincrement())
  idSiswa    Int
  siswa      Siswa    @relation(fields: [idSiswa], references: [id], onDelete: Cascade, onUpdate: Cascade)
  idBk       Int      // User ID dari BK yang mencatat
  guruBk     Pengguna @relation("GuruBkKonseling", fields: [idBk], references: [id], onDelete: Restrict, onUpdate: Cascade)
  detail     String   @db.Text
  dibuatPada DateTime @default(now())
  diubahPada DateTime @updatedAt
}

enum HariPiket {
  SENIN
  SELASA
  RABU
  KAMIS
  JUMAT
  SABTU
}

model JadwalPiket {
  id         Int       @id @default(autoincrement())
  hari       HariPiket
  idGuru     Int
  guru       Guru      @relation(fields: [idGuru], references: [id], onDelete: Cascade, onUpdate: Cascade)
  dibuatPada DateTime  @default(now())
  diubahPada DateTime  @updatedAt

  @@unique([hari, idGuru])
}

enum StatusDispensasi {
  MENUNGGU
  DISETUJUI
  DITOLAK
}

model DispensasiKeterlambatan {
  id            Int              @id @default(autoincrement())
  idSiswa       Int
  siswa         Siswa            @relation(fields: [idSiswa], references: [id], onDelete: Cascade, onUpdate: Cascade)
  tanggal       DateTime         @db.Date
  alasan        String           @db.Text
  fotoBukti     String?          @db.VarChar(255)
  status        StatusDispensasi @default(MENUNGGU)
  disetujuiOleh Int?             // User ID yang menyetujui (Guru Piket/Admin)
  pencatat      Pengguna?        @relation("PencatatDispensasi", fields: [disetujuiOleh], references: [id], onDelete: SetNull, onUpdate: Cascade)
  dibuatPada    DateTime         @default(now())
  diubahPada    DateTime         @updatedAt

  @@unique([idSiswa, tanggal])
}
```

---

## BAGIAN 3: MULTI-DISPLAY SSE BROADCAST (REAL-TIME SERVER-SENT EVENTS)

Agar pengiriman notifikasi sukses absensi tersiar secara *live* ke beberapa TV sekaligus, kita membuat global registry untuk mengelola koneksi client SSE di backend API Route:

### 3.1 Live Stream Registry & Route Handler
Kita memanfaatkan variabel `global` di Node.js agar list client tetap tersimpan selama server Next.js berjalan:

```typescript
// src/app/api/attendance/live-stream/route.ts
import { NextResponse } from 'next/server';

// Definisikan registry client SSE secara global agar tidak hilang saat hot-reload
if (!global.sseClients) {
  global.sseClients = new Set<ReadableStreamDefaultController>();
}

export async function GET(req: Request) {
  let controllerRef: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      global.sseClients.add(controller);
      
      // Kirim pesan koneksi berhasil ke TV
      const connectMessage = `data: ${JSON.stringify({ type: 'CONNECTED', message: 'Koneksi Live Aktif' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMessage));
    },
    cancel() {
      if (controllerRef) {
        global.sseClients.delete(controllerRef);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

// Fungsi pembantu untuk memancarkan (broadcast) nama siswa baru ke semua TV yang aktif
export function broadcastAttendance(studentName: string, checkInTime: string) {
  const message = `data: ${JSON.stringify({ type: 'ATTENDANCE', name: studentName, time: checkInTime })}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  if (global.sseClients) {
    global.sseClients.forEach((client: ReadableStreamDefaultController) => {
      try {
        client.enqueue(encoded);
      } catch (error) {
        // Hapus client jika koneksi sudah terputus
        global.sseClients.delete(client);
      }
    });
  }
}
```

Setiap kali siswa berhasil memindai QR Code di `/api/attendance`, backend akan memanggil fungsi `broadcastAttendance(studentName, checkInTime)`. Seluruh layar TV yang aktif akan menerima data tersebut secara instan tanpa jeda!

---

## BAGIAN 4: IMPLEMENTASI HITUNG MUNDUR & LIVE STREAM DI TV DISPLAY

Tampilan TV Kantor `/display-qr` membuka koneksi `EventSource` ke API `/api/attendance/live-stream` untuk menerima data secara instan:

```typescript
// src/app/display-qr/page.tsx
'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

export default function DisplayQrPage() {
  const [token, setToken] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(10);
  const [successLogs, setSuccessLogs] = useState<Array<{ name: string; time: string }>>([]);

  const fetchNewToken = async () => {
    try {
      const res = await fetch('/api/token-qr');
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setCountdown(10);
      }
    } catch (error) {
      console.error('Gagal mengambil token QR:', error);
    }
  };

  // 1. Kelola Hitung Mundur Token QR
  useEffect(() => {
    fetchNewToken();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchNewToken();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Hubungkan ke Server-Sent Events (SSE) Live Stream
  useEffect(() => {
    const eventSource = new EventSource('/api/attendance/live-stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ATTENDANCE') {
          // Push data siswa baru yang sukses scan ke atas tumpukan list TV secara instan
          setSuccessLogs((prev) => [
            { name: data.name, time: data.time },
            ...prev.slice(0, 4) // Pertahankan hanya 5 log terbaru
          ]);
        }
      } catch (err) {
        console.error('Gagal parse pesan live stream:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Koneksi live stream terputus. Mencoba menghubungkan kembali...', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-2 text-center">SMK AR RAHMA ATTENDANCE SYSTEM</h1>
      <p className="text-gray-400 mb-8 text-center text-sm">Pindai QR Code di bawah dengan HP Anda untuk absen masuk.</p>

      <div className="flex flex-col md:flex-row items-center justify-center gap-16 w-full max-w-4xl">
        <div className="flex flex-col items-center bg-white p-6 rounded-3xl shadow-2xl border-4 border-emerald-500">
          {token ? (
            <QRCode value={token} size={256} viewBox={`0 0 256 256`} />
          ) : (
            <div className="w-[256px] h-[256px] flex items-center justify-center text-black font-semibold">
              Loading Token...
            </div>
          )}
          
          <div className="mt-6 flex items-center gap-3 text-black">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-emerald-500 font-bold text-lg animate-pulse">
              {countdown}
            </div>
            <span className="text-sm font-semibold text-gray-700">Kode diperbarui dalam {countdown} detik</span>
          </div>
        </div>

        {/* Panel Notifikasi Melayang Live Stream (Real-Time) */}
        <div className="flex flex-col w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-emerald-500 font-bold mb-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            LIVE BARU SAJA ABSEN
          </h2>
          <div className="flex flex-col gap-3 min-h-[200px]">
            {successLogs.length > 0 ? (
              successLogs.map((log, index) => (
                <div key={index} className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-xl border border-emerald-500/20 animate-bounce">
                  <span className="font-semibold truncate max-w-[180px]">{log.name}</span>
                  <span className="text-xs text-emerald-400 font-mono">{log.time} WIB</span>
                </div>
              ))
            ) : (
              <div className="text-zinc-500 text-sm text-center my-auto">Menunggu aktivitas absensi pagi ini...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```
