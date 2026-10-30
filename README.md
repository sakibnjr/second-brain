# Personal Planner

An offline-first personal productivity application built for **Linux Mint Desktop** and **Android**, synchronizing seamlessly via **Supabase**.

---

## 🎯 Architecture & Monorepo Layout

```
second-brain/
├── personal_planner_prd_antigravity.md # Authoritative PRD specification
├── apps/
│   ├── desktop/                         # Tauri 2 + React + TypeScript + Vite + Tailwind CSS
│   │   ├── src/                         # Frontend UI (Dashboard, Tasks, Ideas, Learning, Settings)
│   │   └── src-tauri/                   # Rust backend (Tauri 2 config, SQLite plugin, notifications)
│   └── android/                         # Kotlin + Jetpack Compose Android app
│       └── app/src/main/                # Room entities, DAOs, screens, Material3 theme
├── packages/
│   ├── contracts/                       # Platform-agnostic TypeScript models & Zod schemas
│   └── ui-tokens/                       # Design tokens and shared color themes
└── docs/
    ├── dev_setup.md                     # Setup and run commands
    ├── data_contracts.md                # Shared schemas, UUID rules, tombstone deletion
    └── design_tokens.md                 # Typography, color tokens, and spacing scale
```

---

## 🚀 Quick Start

### 1. Build Shared Contracts
```bash
npm install
npm run contracts:build
```

### 2. Run Desktop App in Browser Preview
```bash
npm run desktop:dev
```
Open `http://localhost:1420`.

### 3. Build Desktop Application
```bash
npm run desktop:build
```

---

## 📋 Implementation Milestones

- [x] **Milestone 1:** Repository and design foundation
  - [x] Monorepo structure with workspace support
  - [x] Shared data contracts (`@planner/contracts` with Zod validation)
  - [x] Shared design tokens across Tailwind and Jetpack Compose
  - [x] Tauri 2 + React + TypeScript + Tailwind desktop application scaffold
  - [x] Kotlin + Jetpack Compose + Room Android application scaffold
  - [x] Development and architecture documentation
- [ ] **Milestone 2:** Local-first desktop MVP (SQLite, Tasks, Ideas, Learning Tracker)
- [ ] **Milestone 3:** Local-first Android MVP
- [ ] **Milestone 4:** Supabase foundation (Auth, RLS, PostgreSQL migrations)
- [ ] **Milestone 5:** Offline-to-online sync engine & mutation queue
- [ ] **Milestone 6:** Reminders & notifications
- [ ] **Milestone 7:** Polish, dark/light theme toggle, release readiness
