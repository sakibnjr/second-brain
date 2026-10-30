# Development Environment & Setup Guide

This document describes how to set up and run the Personal Planner development environment on Linux Mint and Android.

---

## 1. Prerequisites

### Desktop (Linux Mint)
- **Node.js:** v20+ (managed via `nvm`)
- **Rust Toolchain:** `rustup`, `cargo`, `rustc` (stable)
- **System Libraries for Tauri 2:**
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
  ```

### Android
- **JDK:** OpenJDK 17
- **Android SDK:** API 35 (Android 15) / Minimum API 26 (Android 8.0)
- **Build System:** Gradle with Kotlin 2.0 and Jetpack Compose compiler

---

## 2. Desktop Development Workflow

### Install Dependencies
```bash
npm install
```

### Build Shared Contracts
```bash
npm run contracts:build
```

### Run Frontend in Vite Dev Server
```bash
npm run desktop:dev
```
Access at `http://localhost:1420`.

### Run Tauri Desktop Application
```bash
npm --workspace=apps/desktop run tauri dev
```

---

## 3. Android Development Workflow

1. Open `apps/android` in Android Studio or compile via Gradle wrapper:
   ```bash
   cd apps/android
   ./gradlew assembleDebug
   ```
2. Install onto a connected device or emulator:
   ```bash
   ./gradlew installDebug
   ```

---

## 4. Supabase Setup (Milestone 4 Preview)

The Supabase project is integrated with Antigravity via MCP:
- Project Reference: `ipfczdqmbjaiwfrdxupl`
- Cloud migrations will be managed in `supabase/migrations`.
