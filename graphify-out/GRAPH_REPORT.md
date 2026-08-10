# Graph Report - .  (2026-08-11)

## Corpus Check
- 123 files · ~99,006 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 386 nodes · 545 edges · 42 communities (27 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35

## God Nodes (most connected - your core abstractions)
1. `getUserFromRequest()` - 77 edges
2. `compilerOptions` - 16 edges
3. `kirimWaDenganAntrean()` - 12 edges
4. `scripts` - 10 edges
5. `TokenPayload` - 9 edges
6. `runAutoAlpha()` - 8 edges
7. `encryptToken()` - 8 edges
8. `include` - 7 edges
9. `xlsx` - 6 edges
10. `kirimWaLangsung()` - 6 edges

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

## Communities (42 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (48): escapeSql(), formatVal(), GET(), GET(), POST(), DELETE(), GET(), POST() (+40 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (33): 22, axios, bcrypt, date-fns, dexie, html5-qrcode, jsonwebtoken, lucide-react (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (12): qrcode, qrcode, POST(), GET(), GET(), TokenPayload, verifyTokenEdge(), decryptToken() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (14): GET(), POST(), OfflineLog, POST(), DELETE(), POST(), hitungJarakHaversine(), POST() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (15): name, prisma, seed, private, scripts, build, cpanel, cpanel:setup (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (10): app, AUTO_ALPHA_HOUR, AUTO_ALPHA_INTERVAL_MS, AUTO_ALPHA_MINUTE, { createServer }, handle, next, { parse } (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, scope, short_name, start_url (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (9): xlsx, HariLibur, Kehadiran, Kelas, RekapPdfButton, ReportData, ReportsPage(), Siswa (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (7): HARI_LIST, PicketSchedule, PicketSchedulesPage(), TeacherDropdownItem, JadwalPiketPdfData, JadwalPiketPdfDocumentProps, styles

### Community 11 - "Community 11"
Cohesion: 0.31
Nodes (5): RecentLog, AbsensiOfflineDatabase, db, KehadiranTertunda, LocalSiswa

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (4): pdfStyles, RekapAbsensiPdfDocumentProps, SiswaPdfData, RekapPdfButtonProps

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (6): react, react, GET(), StudentCardDocument(), StudentCardProps, styles

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (3): SpPdfButtonProps, FlaggedStudent, spPdfStyles

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): app, { createServer }, { execSync }, handle, next, { parse }

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (5): AttendanceLog, AttendanceStat, compressImage(), StudentPage(), StudentProfile

### Community 18 - "Community 18"
Cohesion: 0.40
Nodes (3): FlaggedStudent, LogKonseling, SpPdfButton

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (3): Kelas, SettingItem, WaStatus

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (3): metadata, plusJakartaSans, Window

## Knowledge Gaps
- **142 isolated node(s):** `deploy-cpanel.sh script`, `eslintConfig`, `{ execSync }`, `nextConfig`, `name` (+137 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 1` to `Community 9`, `Community 4`, `Community 13`, `Community 6`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `getUserFromRequest()` connect `Community 0` to `Community 13`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `xlsx` connect `Community 9` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `deploy-cpanel.sh script`, `eslintConfig`, `{ execSync }` to the rest of the system?**
  _142 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06198198198198198 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._