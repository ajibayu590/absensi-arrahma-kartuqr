# AGENTS.md — AI Agent Guidelines (Universal)

> **This file is the entry point for ANY AI agent** (Claude, Gemini, Copilot, Cursor, Codex, GPT, or any other) working on this project.
> Read this file first, then follow the pointers below.

---

## Project Overview

**Sistem Absensi Siswa SMK Ar Rahma** — Web-based student attendance management system using QR Code scanning, GPS geofencing, real-time WhatsApp notifications, and RBAC dashboard.

**Tech Stack:** Next.js 16 (App Router, Webpack mode) + TypeScript 5 + Tailwind CSS v4 + Prisma ORM + MySQL/MariaDB + Fonnte WA Gateway.

---

## Documentation Map

All project documentation is in the **`docs/`** folder. Start with [`docs/INDEX.md`](docs/INDEX.md) for the full table of contents.

### Must-Read Documents (in order):

1. **[docs/INDEX.md](docs/INDEX.md)** — Full documentation index & navigation
2. **[docs/PRD.md](docs/PRD.md)** — Product Requirements Document (v3.7)
3. **[docs/DATABASE.md](docs/DATABASE.md)** — Database schema dictionary (Bahasa Indonesia naming)
4. **[docs/ARSITEKTUR.md](docs/ARSITEKTUR.md)** — Architecture, tech stack, security config
5. **[docs/SOP.md](docs/SOP.md)** — Implementation SOP, Prisma schema, SSE code

### Feature Specs (per role):
- [docs/SISWA.md](docs/SISWA.md) — Student portal & QR scan
- [docs/GURU_PIKET.md](docs/GURU_PIKET.md) — Duty teacher dashboard & offline cache
- [docs/WALI_KELAS.md](docs/WALI_KELAS.md) — Homeroom teacher reports & WA notifications
- [docs/GURU_BK.md](docs/GURU_BK.md) — BK counselor EWS & SP letters
- [docs/KEPALA_SEKOLAH.md](docs/KEPALA_SEKOLAH.md) — Principal executive dashboard
- [docs/ADMIN.md](docs/ADMIN.md) — Admin panel, CRUD, audit, backup

---

## Critical Rules

### 1. Database Naming
The MySQL database schema uses **Bahasa Indonesia** for ALL table names, column names, and enums:
- Tables: `Pengguna`, `Kelas`, `Guru`, `Siswa`, `Kehadiran`, `LogWa`, `Pengaturan`, `HariLibur`, `LogAuditAdmin`, `LogKonselingBk`, `JadwalPiket`
- Enums: `Peran`, `StatusKehadiran`, `StatusLogWa`

### 2. PRD Compliance
Every feature implementation **MUST** strictly follow the specifications in `docs/PRD.md` and the corresponding feature spec in `docs/`. Do NOT change feature behavior or non-goals without explicit user approval.

### 3. Progress Tracking
When making feature changes, updates, or major bug fixes, **update `docs/TASK.md`** to record the changes.

### 4. Mandatory Confirmation Before Execution
If an agent discovers a bug, vulnerability, or issue during any task (audit, review, development, etc.) and intends to **fix or execute** a solution:
- **MUST confirm with the user first** before making any code changes.
- Present the findings, proposed fix, and affected files clearly.
- Wait for explicit user approval before proceeding with the execution.
- Do NOT auto-fix or auto-execute without user consent.

### 5. Execution Logging in TASK.md
**ALL executions** (implementations, bug fixes, audits, refactors, etc.) and their outcomes **MUST be recorded** in `docs/TASK.md`:
- Record each task under the correct **Phase** and **Sub-Phase**.
- If the fix doesn't belong to an existing phase, create a new entry in the **Bug Log** table at the bottom.
- Include: date, component/feature affected, problem description, solution applied, and status.
- Update the status after execution (e.g., Selesai, Dalam Proses, Dibatalkan).
- Mandatory: Always append new entries to the `🐛 LOG PERBAIKAN BUG & PERUBAHAN LAINNYA` table at the bottom of `docs/TASK.md`.
- Mandatory: **Setelah perbaikan bug atau penambahan fitur baru, AI agent WAJIB menjalankan `/graphify --update` untuk memastikan grafik pengetahuan tetap sinkron dengan perubahan kode terkini.**

### 6. Next.js Warning
This project uses **Next.js 16** which has breaking changes from earlier versions. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.

---

## Run Commands

```bash
npm install              # Install dependencies
npm run dev              # Development server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npx prisma validate      # Validate Prisma schema
npx prisma migrate dev   # Run database migration
npx prisma db seed       # Seed default data
npx prisma studio        # Open Prisma Studio
```
