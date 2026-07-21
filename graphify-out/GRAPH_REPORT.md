# Graph Report - .  (2026-07-22)

## Corpus Check
- 113 files · ~96,286 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 363 nodes · 514 edges · 39 communities (26 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Admin API & Kelola Data
- Paket Dependensi Proyek
- Konfigurasi TypeScript
- Konfigurasi ESLint & Styling
- Notifikasi & Auto-Alpha Scheduler
- API Absensi Mandiri & SSE
- Sesi Kehadiran & Middleware
- Skrip Utama & Konfigurasi package.json
- Wrapper Server & Config
- Halaman Rekap Laporan & Excel
- Spesifikasi Berkas manifest.json PWA
- Cetak Jadwal Piket & PDF
- Portal Mandiri & Feedback Siswa
- Caching offline & IndexedDB
- Rekapitulasi PDF
- Cetak Kartu Siswa
- Halaman Bimbingan Konseling & SP
- Logika Fingerprint & Login Klien
- Dashboard Guru BK & Early Warning
- Dashboard Pengaturan Sistem
- Halaman Kelola Data Siswa
- Layout Utama Aplikasi
- Pencadangan Database SQL
- Halaman Kelola Data Kelas
- Halaman Utama Dasbor
- Seeding Database Awal
- Halaman Kelola Hari Libur
- Sidebar Layout Dasbor
- Halaman Kelola Data Guru
- Layar Display QR Lobi TV
- Konfigurasi Linter (ESLint)
- Konfigurasi Kompilasi Next.js
- Konfigurasi PostCSS Tailwind
- Aset Offline PWA

## God Nodes (most connected - your core abstractions)
1. `getUserFromRequest()` - 75 edges
2. `compilerOptions` - 16 edges
3. `kirimWaDenganAntrean()` - 12 edges
4. `TokenPayload` - 8 edges
5. `runAutoAlpha()` - 8 edges
6. `include` - 7 edges
7. `xlsx` - 6 edges
8. `broadcastAttendance()` - 6 edges
9. `kirimWaLangsung()` - 6 edges
10. `scripts` - 5 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --references--> `xlsx`  [EXTRACTED]
  src/app/api/admin/classes/import/route.ts → package.json
- `POST()` --references--> `xlsx`  [EXTRACTED]
  src/app/api/admin/students/import/route.ts → package.json
- `POST()` --references--> `xlsx`  [EXTRACTED]
  src/app/api/admin/users/import/route.ts → package.json
- `ReportsPage()` --references--> `xlsx`  [EXTRACTED]
  src/app/(dashboard)/reports/page.tsx → package.json
- `main()` --references--> `@prisma/client`  [EXTRACTED]
  prisma/db-check.ts → package.json

## Import Cycles
- None detected.

## Communities (39 total, 13 thin omitted)

### Community 0 - "Admin API & Kelola Data"
Cohesion: 0.06
Nodes (41): GET(), POST(), DELETE(), GET(), POST(), PUT(), DELETE(), GET() (+33 more)

### Community 1 - "Paket Dependensi Proyek"
Cohesion: 0.06
Nodes (31): axios, bcrypt, date-fns, dexie, html5-qrcode, jsonwebtoken, lucide-react, next (+23 more)

### Community 2 - "Konfigurasi TypeScript"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 3 - "Konfigurasi ESLint & Styling"
Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss (+19 more)

### Community 4 - "Notifikasi & Auto-Alpha Scheduler"
Cohesion: 0.17
Nodes (11): POST(), POST(), OfflineLog, POST(), GET(), POST(), GET(), GET() (+3 more)

### Community 5 - "API Absensi Mandiri & SSE"
Cohesion: 0.20
Nodes (10): DELETE(), POST(), hitungJarakHaversine(), POST(), GET(), broadcastAttendance(), getSseClients(), decryptToken() (+2 more)

### Community 6 - "Sesi Kehadiran & Middleware"
Cohesion: 0.18
Nodes (4): TokenPayload, verifyTokenEdge(), config, middleware()

### Community 7 - "Skrip Utama & Konfigurasi package.json"
Cohesion: 0.18
Nodes (10): name, prisma, seed, private, scripts, build, dev, lint (+2 more)

### Community 8 - "Wrapper Server & Config"
Cohesion: 0.20
Nodes (10): app, AUTO_ALPHA_HOUR, AUTO_ALPHA_INTERVAL_MS, AUTO_ALPHA_MINUTE, { createServer }, handle, next, { parse } (+2 more)

### Community 9 - "Halaman Rekap Laporan & Excel"
Cohesion: 0.20
Nodes (9): xlsx, HariLibur, Kehadiran, Kelas, RekapPdfButton, ReportData, ReportsPage(), Siswa (+1 more)

### Community 10 - "Spesifikasi Berkas manifest.json PWA"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, scope, short_name, start_url (+1 more)

### Community 11 - "Cetak Jadwal Piket & PDF"
Cohesion: 0.22
Nodes (7): HARI_LIST, PicketSchedule, PicketSchedulesPage(), TeacherDropdownItem, JadwalPiketPdfData, JadwalPiketPdfDocumentProps, styles

### Community 12 - "Portal Mandiri & Feedback Siswa"
Cohesion: 0.31
Nodes (8): AttendanceLog, AttendanceStat, compressImage(), StudentPage(), StudentProfile, initAudioContext(), playErrorFeedback(), playSuccessFeedback()

### Community 13 - "Caching offline & IndexedDB"
Cohesion: 0.31
Nodes (5): RecentLog, AbsensiOfflineDatabase, db, KehadiranTertunda, LocalSiswa

### Community 14 - "Rekapitulasi PDF"
Cohesion: 0.25
Nodes (4): pdfStyles, RekapAbsensiPdfDocumentProps, SiswaPdfData, RekapPdfButtonProps

### Community 15 - "Cetak Kartu Siswa"
Cohesion: 0.33
Nodes (6): react, react, GET(), StudentCardDocument(), StudentCardProps, styles

### Community 16 - "Halaman Bimbingan Konseling & SP"
Cohesion: 0.29
Nodes (3): SpPdfButtonProps, FlaggedStudent, spPdfStyles

### Community 18 - "Dashboard Guru BK & Early Warning"
Cohesion: 0.40
Nodes (3): FlaggedStudent, LogKonseling, SpPdfButton

### Community 19 - "Dashboard Pengaturan Sistem"
Cohesion: 0.40
Nodes (3): Kelas, SettingItem, WaStatus

### Community 21 - "Layout Utama Aplikasi"
Cohesion: 0.40
Nodes (3): metadata, plusJakartaSans, Window

### Community 22 - "Pencadangan Database SQL"
Cohesion: 0.83
Nodes (3): escapeSql(), formatVal(), GET()

## Knowledge Gaps
- **129 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUserFromRequest()` connect `Admin API & Kelola Data` to `Notifikasi & Auto-Alpha Scheduler`, `API Absensi Mandiri & SSE`, `Pencadangan Database SQL`, `Cetak Kartu Siswa`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Paket Dependensi Proyek` to `Halaman Rekap Laporan & Excel`, `Cetak Kartu Siswa`, `Skrip Utama & Konfigurasi package.json`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `xlsx` connect `Halaman Rekap Laporan & Excel` to `Admin API & Kelola Data`, `Paket Dependensi Proyek`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin API & Kelola Data` be split into smaller, more focused modules?**
  _Cohesion score 0.06448087431693988 - nodes in this community are weakly interconnected._
- **Should `Paket Dependensi Proyek` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Konfigurasi TypeScript` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._