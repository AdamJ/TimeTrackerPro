# Tauri Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Electron desktop shell with Tauri v2, preserving every existing desktop feature (disk backups, native menu, quit-flush handshake, auto-update), then remove Electron entirely once verified.

**Architecture:** Tauri's Rust backend (`src-tauri/`) replaces Electron's main process. The renderer (`src/`) stays almost untouched: a new bridge module (`src/lib/tauriElectronApiShim.ts`) populates the same `window.electronAPI` shape that `electron/preload.ts` used to expose, so `useElectronBackup.ts` and `useElectronMenuActions.ts` require **zero changes**. Auto-update moves from Electron's main-process `electron-updater` to Tauri's official `tauri-plugin-updater`, driven from the frontend (dialogs via `tauri-plugin-dialog`, restart via `tauri-plugin-process`), with signed release artifacts (a real keypair, no more "intentionally unsigned").

**Tech Stack:** Tauri v2 (Rust), `@tauri-apps/api` + `tauri-plugin-updater`/`tauri-plugin-dialog`/`tauri-plugin-process`, `tauri-plugin-opener` (Rust-only, no JS package needed — see Task 5 amendment), existing Vite/React/TypeScript/Vitest stack, `tauri-apps/tauri-action` for CI.

## Global Constraints

- All new TypeScript: double quotes, 2-space indent, `@/` import alias — per `AGENTS.md`.
- All work happens on a new branch `feature/tauri-migration`, never on `main`.
- Every task ends with tests/build passing before commit — no exceptions.
- Existing `useElectronBackup.ts`, `useElectronMenuActions.ts`, `electronMenuActions.ts`, and every component that consumes them stay **unmodified** — the shim absorbs the difference.
- Electron (`electron/`, `vite.electron.config.ts`, Electron deps/scripts, `.github/workflows/electron-release.yml`) is only deleted in the final task, after the manual verification checklist passes.
- Updater uses a real signed keypair (`tauri-plugin-updater`'s required mode) — no unsigned fallback.

---

## File Structure

```
src-tauri/
  Cargo.toml                 # Rust crate manifest
  build.rs                   # tauri-build codegen
  tauri.conf.json            # window/CSP/bundle/updater config
  capabilities/
    default.json             # plugin permission grants
  icons/                     # generated via `pnpm tauri icon`
  src/
    main.rs                  # entry point, builder wiring
    backup.rs                # backup write/list/read commands + pure fs helpers + unit tests
    menu.rs                  # native menu construction + click routing
    quit_flush.rs             # close-requested flush handshake + before_quit_flush_done command

src/
  lib/
    tauriElectronApiShim.ts       # window.electronAPI shim backed by Tauri invoke/listen
    tauriElectronApiShim.test.ts  # vitest coverage for the shim
    tauriUpdater.ts               # silent startup check + manual check, backoff in localStorage
    tauriUpdater.test.ts          # vitest coverage for updater logic
  main.tsx                        # calls installTauriElectronApiShim() before render

.github/workflows/
  tauri-release.yml          # new: builds + signs + publishes Tauri bundles
  electron-release.yml       # deleted in the final task

package.json                 # new deps/scripts, "build" (electron-builder) key removed at the end
.gitignore                   # + src-tauri/target/, src-tauri/gen/
```

---

### Task 0: Create the feature branch

**Files:** none (git operation only)

- [ ] **Step 1: Confirm a clean working tree**

Run: `git status`
Expected: `nothing to commit, working tree clean` (stop and ask the user if not — do not stash/discard anything automatically)

- [ ] **Step 2: Create and switch to the branch**

```bash
git checkout -b feature/tauri-migration
```

- [ ] **Step 3: Verify**

Run: `git branch --show-current`
Expected: `feature/tauri-migration`

---

### Task 1: Scaffold the Rust crate

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs` (minimal skeleton, expanded in later tasks)
- Modify: `.gitignore`

**Interfaces:**
- Produces: a `timetraked` Rust binary crate at `src-tauri/` that later tasks add modules to.

- [ ] **Step 1: Write `src-tauri/Cargo.toml`**

```toml
[package]
name = "timetraked"
version = "1.10.1"
description = "A time tracking application built for freelancers, consultants, and professionals."
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-updater = "2"
tauri-plugin-dialog = "2"
tauri-plugin-opener = "2"
tauri-plugin-process = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
regex = "1"
chrono = "0.4"
tokio = { version = "1", features = ["fs", "sync", "time", "rt"] }

[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 2: Write `src-tauri/build.rs`**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 3: Write a minimal `src-tauri/src/main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

This won't compile yet — `tauri::generate_context!()` needs `tauri.conf.json` (Task 2) and icons (Task 2, Step 4). That's expected; don't try to build until Task 2 is done.

- [ ] **Step 4: Add Tauri build artifacts to `.gitignore`**

Add these lines under the existing "Electron build outputs" section:

```
# Tauri build outputs
src-tauri/target/
src-tauri/gen/
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/build.rs src-tauri/src/main.rs .gitignore
git commit -m "chore: scaffold Tauri Rust crate"
```

---

### Task 2: Configure `tauri.conf.json` and generate icons

**Files:**
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/icons/` (generated, not hand-written)

**Interfaces:**
- Consumes: `public/icon.png` (existing source icon, same one `electron-builder`'s `"build".icon` used).
- Produces: `src-tauri/tauri.conf.json`, read by `main.rs`'s `tauri::generate_context!()` in every later task.

- [ ] **Step 1: Write `src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Timetraked",
  "version": "../package.json",
  "identifier": "com.brimfieldlabs.timetraked",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:8080",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Timetraked",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.github.com"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/AdamJ/TimeTrackerPro/releases/latest/download/latest.json"
      ],
      "pubkey": "REPLACE_AFTER_TASK_10_KEYGEN"
    }
  }
}
```

Note the `connect-src` CSP list only covers Supabase and the GitHub updater manifest — if a deployment also uses the self-hosted SQL backend (`server/`, `VITE_SQL_API_URL`), its origin must be added here manually (Electron's config did this dynamically via a Vite `define`; Tauri's config is static JSON, so this is a documented manual step, not a bug). Add it to the manual verification checklist in Task 13 if self-hosting is in use.

- [ ] **Step 2: Generate app icons from the existing source icon**

```bash
pnpm dlx @tauri-apps/cli icon public/icon.png -o src-tauri/icons
```

- [ ] **Step 3: Verify the icons directory was populated**

Run: `ls src-tauri/icons`
Expected: includes `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`

- [ ] **Step 4: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/icons
git commit -m "chore: add Tauri app config and icons"
```

---

### Task 3: Add npm-side Tauri packages and scripts

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm tauri`, `pnpm tauri:dev`, `pnpm tauri:build` scripts; `@tauri-apps/api` and plugin JS packages available to `src/lib/tauriElectronApiShim.ts` (Task 9) and `src/lib/tauriUpdater.ts` (Task 8).

- [ ] **Step 1: Install the Tauri CLI as a dev dependency**

```bash
pnpm add -D @tauri-apps/cli
```

- [ ] **Step 2: Install the frontend Tauri API and plugin packages**

```bash
pnpm add @tauri-apps/api @tauri-apps/plugin-updater @tauri-apps/plugin-dialog @tauri-apps/plugin-process
```

- [ ] **Step 3: Add scripts to `package.json`** (next to the existing `electron:*` scripts)

```json
"tauri": "tauri",
"tauri:dev": "tauri dev",
"tauri:build": "tauri build"
```

- [ ] **Step 4: Verify the CLI resolves**

Run: `pnpm tauri --version`
Expected: prints a Tauri CLI version (e.g. `tauri-cli 2.x.x`), no error

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add Tauri CLI and frontend API packages"
```

---

### Task 4: Backup commands in Rust (write/list/read) with unit tests

**Files:**
- Create: `src-tauri/src/backup.rs`
- Modify: `src-tauri/src/main.rs`

**Interfaces:**
- Produces: `#[tauri::command]` functions `backup_write(app, json: String) -> WriteResult`, `backup_list(app) -> ListResult`, `backup_read(app, name: String) -> ReadResult`, and a managed `BackupState`. These exact command names and argument names (`json`, `name`) are what `src/lib/tauriElectronApiShim.ts` (Task 9) calls via `invoke(...)`.

This mirrors `electron/main.ts`'s `writeBackupFile`/`pruneOldBackups`/the three `ipcMain.handle` blocks, and its test file `electron/main.test.ts`'s three backup scenarios (write failure, write success, prune-every-5th-write).

- [ ] **Step 1: Write `src-tauri/src/backup.rs`**

```rust
use regex::Regex;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tokio::fs;
use tokio::sync::Mutex;

pub const MAX_BACKUPS: usize = 20;
pub const MAX_BACKUP_BYTES: usize = 10 * 1024 * 1024;
const PRUNE_EVERY_N_WRITES: u32 = 5;

pub struct BackupState {
    pub writes_since_prune: Mutex<u32>,
}

impl Default for BackupState {
    fn default() -> Self {
        Self { writes_since_prune: Mutex::new(0) }
    }
}

#[derive(Serialize)]
pub struct WriteResult {
    pub ok: bool,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct BackupInfo {
    pub name: String,
    pub timestamp: String,
    pub size_bytes: u64,
}

#[derive(Serialize)]
pub struct ListResult {
    pub ok: bool,
    pub backups: Option<Vec<BackupInfo>>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct ReadResult {
    pub ok: bool,
    pub content: Option<String>,
    pub error: Option<String>,
}

// Filenames are always generated by write_backup_file (backup_<iso-with-dashes>.json),
// so this pattern doubles as a path-traversal guard on list/read — it rejects
// anything containing "/" or "..".
pub fn is_valid_backup_filename(name: &str) -> bool {
    let re = Regex::new(r"^backup_[0-9TZ.\-]+\.json$").expect("valid regex");
    re.is_match(name)
}

fn timestamp_for_filename() -> String {
    chrono::Utc::now()
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
        .replace([':', '.'], "-")
}

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("backups"))
        .map_err(|e| e.to_string())
}

pub async fn prune_old_backups(dir: &Path) -> std::io::Result<()> {
    let mut entries = match fs::read_dir(dir).await {
        Ok(e) => e,
        Err(_) => return Ok(()),
    };
    let mut backup_files = Vec::new();
    while let Some(entry) = entries.next_entry().await? {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with("backup_") && name.ends_with(".json") {
            backup_files.push(name);
        }
    }
    backup_files.sort();
    let excess = backup_files.len().saturating_sub(MAX_BACKUPS);
    for name in &backup_files[..excess] {
        let _ = fs::remove_file(dir.join(name)).await;
    }
    Ok(())
}

pub async fn write_backup_file(
    dir: &Path,
    json: &str,
    writes_since_prune: &mut u32,
) -> std::io::Result<()> {
    fs::create_dir_all(dir).await?;
    let filename = format!("backup_{}.json", timestamp_for_filename());
    fs::write(dir.join(filename), json).await?;

    *writes_since_prune += 1;
    if *writes_since_prune >= PRUNE_EVERY_N_WRITES {
        *writes_since_prune = 0;
        prune_old_backups(dir).await?;
    }
    Ok(())
}

pub async fn list_backup_files(dir: &Path) -> std::io::Result<Vec<BackupInfo>> {
    let mut entries = match fs::read_dir(dir).await {
        Ok(e) => e,
        Err(_) => return Ok(Vec::new()),
    };
    let mut backups = Vec::new();
    while let Some(entry) = entries.next_entry().await? {
        let name = entry.file_name().to_string_lossy().to_string();
        if !is_valid_backup_filename(&name) {
            continue;
        }
        let metadata = entry.metadata().await?;
        let modified: chrono::DateTime<chrono::Utc> = metadata.modified()?.into();
        backups.push(BackupInfo {
            name,
            timestamp: modified.to_rfc3339(),
            size_bytes: metadata.len(),
        });
    }
    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(backups)
}

pub async fn read_backup_file(dir: &Path, name: &str) -> Result<String, String> {
    if !is_valid_backup_filename(name) {
        return Err("Invalid backup filename".to_string());
    }
    fs::read_to_string(dir.join(name)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn backup_write(
    app: AppHandle,
    state: tauri::State<'_, BackupState>,
    json: String,
) -> Result<WriteResult, ()> {
    if json.is_empty() || json.len() > MAX_BACKUP_BYTES {
        return Ok(WriteResult { ok: false, error: Some("Invalid backup payload".to_string()) });
    }
    let dir = match backups_dir(&app) {
        Ok(d) => d,
        Err(e) => return Ok(WriteResult { ok: false, error: Some(e) }),
    };
    let mut writes = state.writes_since_prune.lock().await;
    match write_backup_file(&dir, &json, &mut writes).await {
        Ok(()) => Ok(WriteResult { ok: true, error: None }),
        Err(e) => Ok(WriteResult { ok: false, error: Some(e.to_string()) }),
    }
}

#[tauri::command]
pub async fn backup_list(app: AppHandle) -> Result<ListResult, ()> {
    let dir = match backups_dir(&app) {
        Ok(d) => d,
        Err(e) => return Ok(ListResult { ok: false, backups: None, error: Some(e) }),
    };
    match list_backup_files(&dir).await {
        Ok(backups) => Ok(ListResult { ok: true, backups: Some(backups), error: None }),
        Err(e) => Ok(ListResult { ok: false, backups: None, error: Some(e.to_string()) }),
    }
}

#[tauri::command]
pub async fn backup_read(app: AppHandle, name: String) -> Result<ReadResult, ()> {
    let dir = match backups_dir(&app) {
        Ok(d) => d,
        Err(e) => return Ok(ReadResult { ok: false, content: None, error: Some(e) }),
    };
    match read_backup_file(&dir, &name).await {
        Ok(content) => Ok(ReadResult { ok: true, content: Some(content), error: None }),
        Err(e) => Ok(ReadResult { ok: false, content: None, error: Some(e) }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_generated_filename_pattern() {
        assert!(is_valid_backup_filename("backup_2026-07-23T10-15-00-000Z.json"));
    }

    #[test]
    fn rejects_path_traversal_attempts() {
        assert!(!is_valid_backup_filename("../../etc/passwd"));
        assert!(!is_valid_backup_filename("backup_../evil.json"));
        assert!(!is_valid_backup_filename("not-a-backup.json"));
    }

    #[tokio::test]
    async fn write_creates_a_file_readable_back() {
        let dir = tempfile::tempdir().unwrap();
        let mut writes = 0u32;
        write_backup_file(dir.path(), "{\"foo\":1}", &mut writes).await.unwrap();

        let files: Vec<_> = list_backup_files(dir.path()).await.unwrap();
        assert_eq!(files.len(), 1);
        let content = read_backup_file(dir.path(), &files[0].name).await.unwrap();
        assert_eq!(content, "{\"foo\":1}");
    }

    #[tokio::test]
    async fn prunes_only_on_every_fifth_write() {
        let dir = tempfile::tempdir().unwrap();
        let mut writes = 0u32;
        for _ in 0..4 {
            write_backup_file(dir.path(), "{}", &mut writes).await.unwrap();
        }
        assert_eq!(writes, 4);

        write_backup_file(dir.path(), "{}", &mut writes).await.unwrap();
        assert_eq!(writes, 0, "counter resets after the 5th write triggers a prune");
    }

    #[tokio::test]
    async fn read_rejects_invalid_filename_without_touching_disk() {
        let dir = tempfile::tempdir().unwrap();
        let result = read_backup_file(dir.path(), "../../etc/passwd").await;
        assert_eq!(result.unwrap_err(), "Invalid backup filename");
    }

    #[tokio::test]
    async fn list_ignores_non_backup_files() {
        let dir = tempfile::tempdir().unwrap();
        tokio::fs::write(dir.path().join("random.txt"), "hi").await.unwrap();
        let mut writes = 0u32;
        write_backup_file(dir.path(), "{}", &mut writes).await.unwrap();

        let files = list_backup_files(dir.path()).await.unwrap();
        assert_eq!(files.len(), 1);
    }
}
```

- [ ] **Step 2: Run the Rust test suite for this module**

Run: `cd src-tauri && cargo test backup:: && cd ..`
Expected: 5 tests pass (`accepts_generated_filename_pattern`, `rejects_path_traversal_attempts`, `write_creates_a_file_readable_back`, `prunes_only_on_every_fifth_write`, `read_rejects_invalid_filename_without_touching_disk`, `list_ignores_non_backup_files`)

If compile errors surface from Tauri API surface differences (e.g. `app.path()` naming), fix them against the installed `tauri` crate version's docs before proceeding — don't skip this step.

- [ ] **Step 3: Wire the module and commands into `main.rs`**

Replace the `src-tauri/src/main.rs` content from Task 1 with:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;

use backup::BackupState;

fn main() {
    tauri::Builder::default()
        .manage(BackupState::default())
        .invoke_handler(tauri::generate_handler![
            backup::backup_write,
            backup::backup_list,
            backup::backup_read,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Verify the full crate builds**

Run: `cd src-tauri && cargo build && cd ..`
Expected: `Compiling timetraked...` then `Finished` with no errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/backup.rs src-tauri/src/main.rs
git commit -m "feat: port disk-backup write/list/read to Tauri commands"
```

---

### Task 5: Native menu in Rust

**Files:**
- Create: `src-tauri/src/menu.rs`
- Modify: `src-tauri/src/main.rs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `menu::build_menu(app: &tauri::App) -> tauri::Result<tauri::menu::Menu<tauri::Wry>>` and `menu::handle_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent)`, wired into `main.rs`'s builder. Emits a Tauri event named `"menu:action"` with a string payload — one of `new-task`, `save`, `export`, `settings`, `command-palette`, `shortcuts-help`, `check-updates` — which `src/lib/tauriElectronApiShim.ts` (Task 9) listens for via `listen<string>("menu:action", ...)`. This is the same event name and same action strings `electron/menu.ts` sent over IPC as `"menu:action"`, so `src/lib/electronMenuActions.ts` and `useElectronMenuActions.ts` don't need to change.

This mirrors `electron/menu.ts` and its test `electron/menu.test.ts`.

> **Amendment (post-review):** the first implementation of this task used `tauri_plugin_shell::ShellExt::open()`, which task review found is deprecated in Tauri v2 in favor of `tauri-plugin-opener`. Fixed in the same task rather than deferred — the code below already reflects `tauri_plugin_opener::OpenerExt::open_url()`. `tauri-plugin-shell` is dropped entirely (nothing else in this app used it); `tauri-plugin-opener` is Rust-only — no `@tauri-apps/plugin-opener` JS package is needed since the frontend never calls it directly. This changes Task 3's npm install list, Task 6's and Task 9's `main.rs` listings, and Task 9's capabilities file below — each is updated in place.

- [ ] **Step 1: Write `src-tauri/src/menu.rs`**

```rust
use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{App, AppHandle, Emitter, Wry};
use tauri_plugin_opener::OpenerExt;

pub fn build_menu(app: &App) -> tauri::Result<Menu<Wry>> {
    let is_mac = cfg!(target_os = "macos");

    let new_task = MenuItemBuilder::with_id("new-task", "New Task")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let save = MenuItemBuilder::with_id("save", "Save Changes")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let export = MenuItemBuilder::with_id("export", "Export Data…")
        .accelerator("CmdOrCtrl+E")
        .build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator(if is_mac { "Cmd+," } else { "Ctrl+," })
        .build(app)?;

    let mut file_builder = SubmenuBuilder::new(app, "File")
        .item(&new_task)
        .item(&save)
        .item(&export);
    if !is_mac {
        file_builder = file_builder.separator().item(&settings);
    }
    let file_menu = file_builder
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let command_palette = MenuItemBuilder::with_id("command-palette", "Command Palette…")
        .accelerator("CmdOrCtrl+K")
        .build(app)?;
    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&command_palette)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let github = MenuItemBuilder::with_id("open-github", "Timetraked on GitHub").build(app)?;
    let shortcuts_help = MenuItemBuilder::with_id("shortcuts-help", "Keyboard Shortcuts").build(app)?;
    let check_updates = MenuItemBuilder::with_id("check-updates", "Check for Updates…").build(app)?;
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&github)
        .separator()
        .item(&shortcuts_help)
        .item(&check_updates)
        .build()?;

    let mut builder = MenuBuilder::new(app);
    if is_mac {
        let preferences = MenuItemBuilder::with_id("settings", "Preferences…")
            .accelerator("Cmd+,")
            .build(app)?;
        let app_menu = SubmenuBuilder::new(app, "Timetraked")
            .item(&PredefinedMenuItem::about(app, None, None)?)
            .separator()
            .item(&preferences)
            .separator()
            .item(&PredefinedMenuItem::services(app, None)?)
            .separator()
            .item(&PredefinedMenuItem::hide(app, None)?)
            .item(&PredefinedMenuItem::hide_others(app, None)?)
            .item(&PredefinedMenuItem::show_all(app, None)?)
            .separator()
            .item(&PredefinedMenuItem::quit(app, None)?)
            .build()?;
        builder = builder.item(&app_menu);
    }

    builder = builder.item(&file_menu).item(&edit_menu).item(&view_menu).item(&help_menu);
    builder.build()
}

// Menu clicks are dispatched here rather than handled per-item, mirroring
// electron/menu.ts's sendMenuAction: this process only tells the frontend
// what was clicked (or, for open-github, opens the URL itself) — the
// frontend owns routing/dialog state. "check-updates" is emitted the same
// way and intercepted by the frontend shim (Task 9) rather than special-cased
// here, unlike Electron's main-process-only updater.
pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id = event.id().0.as_str();
    if id == "open-github" {
        let _ = app.opener().open_url("https://github.com/AdamJ/TimeTrackerPro", None::<String>);
        return;
    }
    let _ = app.emit("menu:action", id);
}
```

- [ ] **Step 2: Wire it into `main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod menu;

use backup::BackupState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BackupState::default())
        .invoke_handler(tauri::generate_handler![
            backup::backup_write,
            backup::backup_list,
            backup::backup_read,
        ])
        .setup(|app| {
            let app_menu = menu::build_menu(app)?;
            app.set_menu(app_menu)?;
            Ok(())
        })
        .on_menu_event(menu::handle_menu_event)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Verify the crate builds**

Run: `cd src-tauri && cargo build && cd ..`
Expected: `Finished` with no errors. Fix any `PredefinedMenuItem`/`SubmenuBuilder` API name mismatches against the installed Tauri version's docs if the compiler flags them.

- [ ] **Step 4: Manual check (queued for Task 13)**

Add to the Task 13 checklist: "File/Edit/View/Help menus present with correct items per platform; New Task/Save/Export/Command Palette accelerators fire; Preferences (mac) / Settings (other) present in the right place."

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/menu.rs src-tauri/src/main.rs
git commit -m "feat: port native application menu to Tauri"
```

---

### Task 6: Quit-flush handshake in Rust

**Files:**
- Create: `src-tauri/src/quit_flush.rs`
- Modify: `src-tauri/src/main.rs`

**Interfaces:**
- Produces: `quit_flush::QuitState` (managed state), `quit_flush::handle_window_event`, `quit_flush::handle_run_event`, and command `quit_flush::before_quit_flush_done`. Emits Tauri event `"before-quit-flush"` (no payload) — the same event name `electron/preload.ts`'s `requestFlushBeforeQuit` listened for — and expects the frontend to invoke `before_quit_flush_done` once its flush completes, matching Electron's `ipcRenderer.send("before-quit-flush-done")`.

This mirrors `electron/main.ts`'s `beginQuitFlush`/close-event handling and its test `electron/main.test.ts`'s "quit-flush timeout fallback" suite.

- [ ] **Step 1: Write `src-tauri/src/quit_flush.rs`**

```rust
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, RunEvent, Window, WindowEvent};
use tokio::sync::Notify;

const QUIT_FLUSH_TIMEOUT_MS: u64 = 3000;

pub struct QuitState {
    pub quitting_for_real: AtomicBool,
    pub quit_intent: AtomicBool,
    pub flush_pending: AtomicBool,
    pub flush_notify: Notify,
}

impl Default for QuitState {
    fn default() -> Self {
        Self {
            quitting_for_real: AtomicBool::new(false),
            quit_intent: AtomicBool::new(false),
            flush_pending: AtomicBool::new(false),
            flush_notify: Notify::new(),
        }
    }
}

// Intercepts the window's own close (Cmd+Q, the Quit menu item, or a plain
// click on the close button all route here first) so the frontend gets one
// last chance to flush to localStorage/disk before the window actually
// closes, with a timeout so quit is never blocked indefinitely. Mirrors
// electron/main.ts's beginQuitFlush — see that file's comments for why this
// hooks the window-close event rather than an app-level "before quit" event.
pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        let app_handle = window.app_handle();
        let state = app_handle.state::<QuitState>();

        if state.quitting_for_real.load(Ordering::SeqCst) {
            return;
        }
        api.prevent_close();

        if state.flush_pending.swap(true, Ordering::SeqCst) {
            return;
        }

        let window = window.clone();
        let app_handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let state = app_handle.state::<QuitState>();
            let _ = window.emit("before-quit-flush", ());

            let timeout = tokio::time::sleep(Duration::from_millis(QUIT_FLUSH_TIMEOUT_MS));
            tokio::pin!(timeout);
            tokio::select! {
                _ = state.flush_notify.notified() => {}
                _ = &mut timeout => {}
            }

            state.quitting_for_real.store(true, Ordering::SeqCst);
            state.flush_pending.store(false, Ordering::SeqCst);
            if state.quit_intent.load(Ordering::SeqCst) {
                app_handle.exit(0);
            } else {
                let _ = window.close();
            }
        });
    }
}

// Fires when the whole app is asked to exit (Cmd+Q, the Quit menu item) —
// distinct from a single window's close button. Records the intent so the
// spawned task above knows whether to fully exit or just close the window
// once the flush completes.
pub fn handle_run_event(app_handle: &AppHandle, event: &RunEvent) {
    if let RunEvent::ExitRequested { api, .. } = event {
        let state = app_handle.state::<QuitState>();
        if !state.quitting_for_real.load(Ordering::SeqCst) {
            state.quit_intent.store(true, Ordering::SeqCst);
            api.prevent_exit();
        }
    }
}

#[tauri::command]
pub fn before_quit_flush_done(app: AppHandle) {
    app.state::<QuitState>().flush_notify.notify_one();
}
```

- [ ] **Step 2: Wire it into `main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod menu;
mod quit_flush;

use backup::BackupState;
use quit_flush::QuitState;

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BackupState::default())
        .manage(QuitState::default())
        .invoke_handler(tauri::generate_handler![
            backup::backup_write,
            backup::backup_list,
            backup::backup_read,
            quit_flush::before_quit_flush_done,
        ])
        .setup(|app| {
            let app_menu = menu::build_menu(app)?;
            app.set_menu(app_menu)?;
            Ok(())
        })
        .on_menu_event(menu::handle_menu_event)
        .on_window_event(quit_flush::handle_window_event)
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(quit_flush::handle_run_event);
}
```

- [ ] **Step 3: Verify the crate builds**

Run: `cd src-tauri && cargo build && cd ..`
Expected: `Finished` with no errors.

- [ ] **Step 4: Manual check (queued for Task 13)**

Add to the Task 13 checklist: "Start a timer, click the window's close button — app should stay open briefly then close (flush completed); force-quit (Cmd+Q) while a save is pending should still close within ~3s even if the frontend never acks."

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/quit_flush.rs src-tauri/src/main.rs
git commit -m "feat: port quit-flush handshake to Tauri"
```

---

### Task 7: Frontend bridge shim — `window.electronAPI` over Tauri invoke/listen

**Files:**
- Create: `src/lib/tauriElectronApiShim.ts`
- Create: `src/lib/tauriElectronApiShim.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `backup_write`/`backup_list`/`backup_read`/`before_quit_flush_done` Tauri commands (Task 4, Task 6) and the `"menu:action"`/`"before-quit-flush"` events (Task 5, Task 6).
- Produces: `installTauriElectronApiShim(): void`, called once from `src/main.tsx` before render. Populates `window.electronAPI` with the exact shape `src/types/electron.d.ts` declares, so `useElectronBackup.ts` and `useElectronMenuActions.ts` work unchanged.
- Depends on `checkForUpdatesManual` from `src/lib/tauriUpdater.ts` (Task 8) — write this task's code assuming that export exists; Task 8 creates it.

- [ ] **Step 1: Write the failing test — `src/lib/tauriElectronApiShim.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();
const listenMock = vi.fn();
const checkForUpdatesManualMock = vi.fn();
const checkForUpdatesSilentMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/api/event", () => ({ listen: listenMock }));
vi.mock("@/lib/tauriUpdater", () => ({
  checkForUpdatesManual: checkForUpdatesManualMock,
  checkForUpdatesSilent: checkForUpdatesSilentMock,
}));

async function loadShim() {
  vi.resetModules();
  const mod = await import("./tauriElectronApiShim");
  return mod.installTauriElectronApiShim;
}

describe("installTauriElectronApiShim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__TAURI_INTERNALS__;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI;
    listenMock.mockResolvedValue(() => undefined);
  });

  it("does nothing when the Tauri runtime is absent (web/PWA build)", async () => {
    const install = await loadShim();
    install();
    expect(window.electronAPI).toBeUndefined();
  });

  it("populates window.electronAPI with the full contract when Tauri is present", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    const install = await loadShim();
    install();

    expect(window.electronAPI).toBeDefined();
    expect(Object.keys(window.electronAPI!).sort()).toEqual(
      ["listBackups", "onMenuAction", "readBackup", "requestFlushBeforeQuit", "writeBackup"].sort(),
    );
  });

  it("writeBackup invokes backup_write with the JSON payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValueOnce({ ok: true });
    const install = await loadShim();
    install();

    const result = await window.electronAPI!.writeBackup("{\"foo\":1}");

    expect(invokeMock).toHaveBeenCalledWith("backup_write", { json: "{\"foo\":1}" });
    expect(result).toEqual({ ok: true });
  });

  it("listBackups invokes backup_list", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValueOnce({ ok: true, backups: [] });
    const install = await loadShim();
    install();

    const result = await window.electronAPI!.listBackups();

    expect(invokeMock).toHaveBeenCalledWith("backup_list");
    expect(result).toEqual({ ok: true, backups: [] });
  });

  it("readBackup invokes backup_read with the given name", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValueOnce({ ok: true, content: "{}" });
    const install = await loadShim();
    install();

    const result = await window.electronAPI!.readBackup("backup-1.json");

    expect(invokeMock).toHaveBeenCalledWith("backup_read", { name: "backup-1.json" });
    expect(result).toEqual({ ok: true, content: "{}" });
  });

  it("requestFlushBeforeQuit listens for before-quit-flush and acks via before_quit_flush_done", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    let capturedHandler: (() => Promise<void>) | undefined;
    listenMock.mockImplementation((_event: string, handler: () => Promise<void>) => {
      capturedHandler = handler;
      return Promise.resolve(() => undefined);
    });
    const install = await loadShim();
    install();

    const callback = vi.fn().mockResolvedValue(undefined);
    window.electronAPI!.requestFlushBeforeQuit(callback);
    await capturedHandler?.();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith("before_quit_flush_done");
  });

  it("onMenuAction forwards regular actions but intercepts check-updates", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TAURI_INTERNALS__ = {};
    let capturedHandler: ((event: { payload: string }) => void) | undefined;
    listenMock.mockImplementation((_event: string, handler: (event: { payload: string }) => void) => {
      capturedHandler = handler;
      return Promise.resolve(() => undefined);
    });
    const install = await loadShim();
    install();

    const callback = vi.fn();
    window.electronAPI!.onMenuAction(callback);

    capturedHandler?.({ payload: "new-task" });
    expect(callback).toHaveBeenCalledWith("new-task");

    capturedHandler?.({ payload: "check-updates" });
    expect(checkForUpdatesManualMock).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1); // not forwarded
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/tauriElectronApiShim.test.ts`
Expected: FAIL — `Cannot find module './tauriElectronApiShim'`

- [ ] **Step 3: Write `src/lib/tauriElectronApiShim.ts`**

```typescript
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { checkForUpdatesManual, checkForUpdatesSilent } from "@/lib/tauriUpdater";

// Populates window.electronAPI with the same shape electron/preload.ts used
// to expose, so useElectronBackup.ts and useElectronMenuActions.ts work
// completely unchanged under Tauri. Only runs when the Tauri runtime is
// present (desktop build); no-ops on web/PWA where window.electronAPI stays
// undefined, same as it always has.
export function installTauriElectronApiShim(): void {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;

  window.electronAPI = {
    writeBackup: (json: string) => invoke("backup_write", { json }),
    listBackups: () => invoke("backup_list"),
    readBackup: (name: string) => invoke("backup_read", { name }),

    requestFlushBeforeQuit: (callback: () => void | Promise<void>) => {
      void listen("before-quit-flush", async () => {
        try {
          await callback();
        } finally {
          await invoke("before_quit_flush_done");
        }
      });
    },

    onMenuAction: (callback: (action: string) => void) => {
      let unlisten: (() => void) | undefined;
      void listen<string>("menu:action", (event) => {
        if (event.payload === "check-updates") {
          void checkForUpdatesManual();
          return;
        }
        callback(event.payload);
      }).then((fn) => {
        unlisten = fn;
      });
      return () => unlisten?.();
    },
  };

  if (import.meta.env.PROD) {
    void checkForUpdatesSilent();
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/tauriElectronApiShim.test.ts`
Expected: PASS, all 7 tests green (this depends on Task 8's `src/lib/tauriUpdater.ts` existing — do Task 8 first if this fails on the mocked import)

- [ ] **Step 5: Call the installer from `src/main.tsx`**

Current content:

```tsx
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
```

New content:

```tsx
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installTauriElectronApiShim } from "@/lib/tauriElectronApiShim";

installTauriElectronApiShim();

createRoot(document.getElementById('root')!).render(<App />);
```

(Leave the existing single-quote import lines as-is — don't reformat lines this task didn't need to touch.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/tauriElectronApiShim.ts src/lib/tauriElectronApiShim.test.ts src/main.tsx
git commit -m "feat: bridge window.electronAPI to Tauri invoke/listen"
```

---

### Task 8: Frontend updater — `tauriUpdater.ts`

**Files:**
- Create: `src/lib/tauriUpdater.ts`
- Create: `src/lib/tauriUpdater.test.ts`

**Interfaces:**
- Produces: `checkForUpdatesSilent(): Promise<void>` (called at startup by Task 7's shim) and `checkForUpdatesManual(): Promise<void>` (called when the shim intercepts the `"check-updates"` menu action).
- Consumes: `check`/`Update` from `@tauri-apps/plugin-updater`, `ask`/`message` from `@tauri-apps/plugin-dialog`, `relaunch` from `@tauri-apps/plugin-process`.

Mirrors `electron/updater.ts`'s backoff/dialog behavior, but persists backoff state to `localStorage` instead of a userData file (no Rust command needed for a UX-only throttle) and drives dialogs from the frontend instead of the main process.

- [ ] **Step 1: Write the failing test — `src/lib/tauriUpdater.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const checkMock = vi.fn();
const askMock = vi.fn();
const messageMock = vi.fn();
const relaunchMock = vi.fn();

vi.mock("@tauri-apps/plugin-updater", () => ({ check: checkMock }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ ask: askMock, message: messageMock }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: relaunchMock }));

const BACKOFF_KEY = "timetracker_update_backoff";

async function loadModule() {
  vi.resetModules();
  return import("./tauriUpdater");
}

describe("tauriUpdater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("checkForUpdatesSilent", () => {
    it("does nothing when no update is available", async () => {
      checkMock.mockResolvedValueOnce(null);
      const { checkForUpdatesSilent } = await loadModule();

      await checkForUpdatesSilent();

      expect(askMock).not.toHaveBeenCalled();
    });

    it("prompts to download, then prompts to restart, when an update is available and accepted", async () => {
      const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
      checkMock.mockResolvedValueOnce({ version: "2.0.0", downloadAndInstall });
      askMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
      const { checkForUpdatesSilent } = await loadModule();

      await checkForUpdatesSilent();

      expect(downloadAndInstall).toHaveBeenCalledTimes(1);
      expect(relaunchMock).toHaveBeenCalledTimes(1);
    });

    it("records a backoff failure and skips future checks until the backoff window elapses", async () => {
      checkMock.mockRejectedValueOnce(new Error("network down"));
      const { checkForUpdatesSilent } = await loadModule();

      await checkForUpdatesSilent();
      expect(JSON.parse(localStorage.getItem(BACKOFF_KEY)!).consecutiveFailures).toBe(1);

      checkMock.mockClear();
      const { checkForUpdatesSilent: secondCall } = await loadModule();
      await secondCall();
      expect(checkMock).not.toHaveBeenCalled();
    });
  });

  describe("checkForUpdatesManual", () => {
    it("shows a 'no updates' message when already on the latest version", async () => {
      checkMock.mockResolvedValueOnce(null);
      const { checkForUpdatesManual } = await loadModule();

      await checkForUpdatesManual();

      expect(messageMock).toHaveBeenCalledWith(
        "You're running the latest version of Timetraked.",
        expect.objectContaining({ title: "No updates available" }),
      );
    });

    it("shows an error message when the check fails", async () => {
      checkMock.mockRejectedValueOnce(new Error("network down"));
      const { checkForUpdatesManual } = await loadModule();

      await checkForUpdatesManual();

      expect(messageMock).toHaveBeenCalledWith(
        "Could not check for updates. Please try again later.",
        expect.objectContaining({ title: "Update check failed" }),
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/tauriUpdater.test.ts`
Expected: FAIL — `Cannot find module './tauriUpdater'`

- [ ] **Step 3: Write `src/lib/tauriUpdater.ts`**

```typescript
import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

const BACKOFF_STORAGE_KEY = "timetracker_update_backoff";
const BASE_BACKOFF_MS = 60 * 60 * 1000; // 1 hour
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000; // 24 hours

interface BackoffState {
  consecutiveFailures: number;
  lastFailureAt: number;
}

const EMPTY_BACKOFF_STATE: BackoffState = { consecutiveFailures: 0, lastFailureAt: 0 };

function readBackoffState(): BackoffState {
  try {
    const raw = localStorage.getItem(BACKOFF_STORAGE_KEY);
    if (!raw) return EMPTY_BACKOFF_STATE;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.consecutiveFailures === "number" && typeof parsed?.lastFailureAt === "number") {
      return parsed as BackoffState;
    }
  } catch {
    // corrupt/missing — treat as no prior failures
  }
  return EMPTY_BACKOFF_STATE;
}

function writeBackoffState(state: BackoffState): void {
  localStorage.setItem(BACKOFF_STORAGE_KEY, JSON.stringify(state));
}

function nextAllowedCheckAt(state: BackoffState): number {
  if (state.consecutiveFailures <= 0) return 0;
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** (state.consecutiveFailures - 1), MAX_BACKOFF_MS);
  return state.lastFailureAt + delay;
}

async function promptDownloadAndInstall(version: string, update: { downloadAndInstall: () => Promise<void> }): Promise<void> {
  const shouldDownload = await ask(`Timetraked ${version} is available. Download it now?`, {
    title: "Update available",
    okLabel: "Download",
    cancelLabel: "Later",
  });
  if (!shouldDownload) return;

  await update.downloadAndInstall();

  const shouldRestart = await ask("Restart the app to apply the update?", {
    title: "Update ready",
    okLabel: "Restart Now",
    cancelLabel: "Later",
  });
  if (shouldRestart) await relaunch();
}

export async function checkForUpdatesSilent(): Promise<void> {
  const state = readBackoffState();
  if (Date.now() < nextAllowedCheckAt(state)) return;

  try {
    const update = await check();
    writeBackoffState(EMPTY_BACKOFF_STATE);
    if (!update) return;
    await promptDownloadAndInstall(update.version, update);
  } catch (error) {
    console.error("Auto-update check failed:", error);
    writeBackoffState({ consecutiveFailures: state.consecutiveFailures + 1, lastFailureAt: Date.now() });
  }
}

export async function checkForUpdatesManual(): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      await message("You're running the latest version of Timetraked.", { title: "No updates available" });
      return;
    }
    writeBackoffState(EMPTY_BACKOFF_STATE);
    await promptDownloadAndInstall(update.version, update);
  } catch (error) {
    console.error("Manual update check failed:", error);
    await message("Could not check for updates. Please try again later.", { title: "Update check failed" });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/tauriUpdater.test.ts`
Expected: PASS, all 5 tests green

- [ ] **Step 5: Re-run Task 7's shim test now that this module is real, not mocked-only**

Run: `pnpm vitest run src/lib/tauriElectronApiShim.test.ts src/lib/tauriUpdater.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/tauriUpdater.ts src/lib/tauriUpdater.test.ts
git commit -m "feat: add frontend-driven auto-update check for Tauri"
```

---

### Task 9: Register updater/dialog/process plugins in Rust and set capabilities

**Files:**
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces: the `tauri_plugin_updater`, `tauri_plugin_dialog`, `tauri_plugin_process` plugins registered in the builder, and the permission grants `src/lib/tauriUpdater.ts` (Task 8) needs at runtime.

- [ ] **Step 1: Add the plugin registrations to `main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod menu;
mod quit_flush;

use backup::BackupState;
use quit_flush::QuitState;

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(BackupState::default())
        .manage(QuitState::default())
        .invoke_handler(tauri::generate_handler![
            backup::backup_write,
            backup::backup_list,
            backup::backup_read,
            quit_flush::before_quit_flush_done,
        ])
        .setup(|app| {
            let app_menu = menu::build_menu(app)?;
            app.set_menu(app_menu)?;
            Ok(())
        })
        .on_menu_event(menu::handle_menu_event)
        .on_window_event(quit_flush::handle_window_event)
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(quit_flush::handle_run_event);
}
```

- [ ] **Step 2: Write `src-tauri/capabilities/default.json`**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capabilities for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "dialog:default",
    "updater:default",
    "process:allow-relaunch"
  ]
}
```

- [ ] **Step 3: Verify the crate builds**

Run: `cd src-tauri && cargo build && cd ..`
Expected: `Finished` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/main.rs src-tauri/capabilities/default.json
git commit -m "chore: register updater/dialog/process/opener Tauri plugins"
```

---

### Task 10: Generate the updater signing keypair (manual, gated on user approval)

**Files:** none checked in directly by Claude in this task — this task produces a private key that must never be committed, plus a public key value for `tauri.conf.json`.

**This task requires explicit user action for the secret-handling parts** — generating the local keypair is a safe local file operation Claude can run, but adding repository secrets is a change to shared infrastructure and must be confirmed with the user first, per the standing safety rules for this session.

- [ ] **Step 1: Generate the keypair**

```bash
pnpm tauri signer generate -w ~/.tauri/timetraked.key
```

This prints the public key to the terminal and writes the private key (optionally password-protected — accept the prompt) to `~/.tauri/timetraked.key`, outside the repo. Confirm it printed a public key starting with `dW50cnVzdGVk...` (base64) before continuing.

- [ ] **Step 2: Put the public key in `tauri.conf.json`**

Replace `"pubkey": "REPLACE_AFTER_TASK_10_KEYGEN"` in `src-tauri/tauri.conf.json` with the printed public key value.

- [ ] **Step 3: Ask the user to add the private key as GitHub repo secrets**

**Stop here and ask the user to confirm before running anything that touches GitHub repo secrets.** Once confirmed, either the user adds them via GitHub's UI (Settings → Secrets and variables → Actions), or — only with explicit approval — run:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/timetraked.key
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body "<the password chosen in Step 1>"
```

These two secret names are exactly what Task 11's CI workflow reads as env vars.

- [ ] **Step 4: Commit the public-key change only**

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: set Tauri updater public key"
```

---

### Task 11: CI workflow for Tauri builds

**Files:**
- Create: `.github/workflows/tauri-release.yml`

**Interfaces:**
- Consumes: the same `release-info` artifact and `workflow_run` trigger pattern as `.github/workflows/electron-release.yml`, plus the `TAURI_SIGNING_PRIVATE_KEY`/`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets from Task 10.

- [ ] **Step 1: Write `.github/workflows/tauri-release.yml`**

```yaml
name: Tauri Release

on:
  workflow_run:
    workflows: ["Release"]
    types: [completed]

jobs:
  check:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    permissions:
      actions: read
    outputs:
      tag: ${{ steps.tag.outputs.tag }}
      should_build: ${{ steps.tag.outputs.should_build }}
    steps:
      - name: Download release info
        continue-on-error: true
        uses: actions/download-artifact@v4
        with:
          name: release-info
          run-id: ${{ github.event.workflow_run.id }}
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Read release tag
        id: tag
        run: |
          if [ -f release-info.txt ]; then
            TAG=$(grep '^TAG=' release-info.txt | cut -d= -f2)
            echo "tag=$TAG" >> "$GITHUB_OUTPUT"
            echo "should_build=true" >> "$GITHUB_OUTPUT"
            echo "Found release tag: $TAG"
          else
            echo "should_build=false" >> "$GITHUB_OUTPUT"
            echo "No release-info artifact found; Release workflow run did not publish a release."
          fi

  build:
    needs: check
    if: needs.check.outputs.should_build == 'true'
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
          - platform: windows-latest

    runs-on: ${{ matrix.platform }}

    permissions:
      contents: write

    env:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ needs.check.outputs.tag }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build and publish Tauri app
        uses: tauri-apps/tauri-action@v0
        with:
          tagName: ${{ needs.check.outputs.tag }}
          releaseName: "Timetraked ${{ needs.check.outputs.tag }}"
          releaseDraft: false
          prerelease: false
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/tauri-release.yml
git commit -m "ci: add Tauri build/sign/publish workflow"
```

(This workflow only runs on a push to `main` via the `Release` workflow's completion — it can't be fully exercised from this branch. Verified for real once this branch is merged and the next version-bump release fires; note this in the Task 13 checklist.)

---

### Task 12: Full local verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all existing tests still pass, plus the new `tauriElectronApiShim.test.ts` and `tauriUpdater.test.ts`

- [ ] **Step 2: Run the Rust test suite**

Run: `cd src-tauri && cargo test && cd ..`
Expected: all `backup.rs` tests pass

- [ ] **Step 3: Lint and typecheck**

Run: `pnpm lint`
Expected: no errors

- [ ] **Step 4: Build the frontend and the Tauri app in dev mode**

```bash
pnpm tauri:dev
```

Expected: a native window opens loading the Vite dev server (same as `pnpm electron:dev` did), with the File/Edit/View/Help menu bar visible.

- [ ] **Step 5: Manual verification checklist**

Work through this checklist by hand in the running app (check each box before moving on):

- [ ] File > New Task navigates to `/` and opens the new-task form
- [ ] File > Save Changes triggers the same save behavior as `Cmd/Ctrl+S`
- [ ] File > Export Data… navigates to `/settings`
- [ ] View > Command Palette… opens the `Cmd/Ctrl+K` palette
- [ ] Help > Keyboard Shortcuts opens the `?` help dialog
- [ ] Help > Timetraked on GitHub opens the repo in the default browser
- [ ] Help > Check for Updates… shows a dialog (no update / update available, depending on current published version)
- [ ] macOS only: app-name menu shows Preferences… (not Settings…) and About
- [ ] Windows/Linux only: File menu shows Settings… (not Preferences…), no app-name submenu
- [ ] Settings → Data Recovery lists on-disk backups (exercise `listBackups`/`readBackup`)
- [ ] Trigger a manual sync/save to produce a disk backup, then confirm a new file appears via Data Recovery's list
- [ ] Start a timer, click the window's close button — window should stay open briefly (flush in flight) then close
- [ ] Force-quit (Cmd+Q / Alt+F4) — app should close within ~3 seconds even under load
- [ ] Package a real build (`pnpm tauri:build`) on macOS and confirm the `.dmg` installs and launches
- [ ] Package a real build (`pnpm tauri:build`) on Windows and confirm the NSIS installer installs and launches
- [ ] If self-hosting the SQL backend (`VITE_SQL_API_URL`), manually add its origin to `tauri.conf.json`'s `app.security.csp` `connect-src` and confirm requests aren't blocked
- [ ] Confirm the `tauri-release.yml` CI workflow succeeds on the next real version-bump release (can't be verified pre-merge)

- [ ] **Step 6: Do not commit yet** — this task is verification-only. Fix anything the checklist surfaces by returning to the relevant earlier task, then re-run this task's steps.

---

### Task 13: Remove Electron

**Only start this task once every box in Task 12's manual checklist is checked.**

**Files:**
- Delete: `electron/` (all files)
- Delete: `vite.electron.config.ts`
- Delete: `.github/workflows/electron-release.yml`
- Modify: `package.json` (remove Electron deps/scripts/`"build"` key)
- Modify: `.gitignore` (remove the now-unused "Electron build outputs" section, or leave it if `dist-electron*` might still linger locally — prefer removing it since it'll no longer be produced)

- [ ] **Step 1: Remove the Electron scripts and `"build"` config from `package.json`**

Remove these script entries: `"typecheck:electron"`, `"electron:build:main"`, `"electron:dev"`, `"electron:preview"`, `"electron:build"`.
Remove the `"main": "dist-electron/main.cjs"` field.
Remove the entire top-level `"build": { ... }` key (electron-builder config).

- [ ] **Step 2: Remove Electron dependencies**

```bash
pnpm remove electron electron-builder electron-updater
```

- [ ] **Step 3: Delete the Electron source tree and its dedicated Vite config**

```bash
git rm -r electron/
git rm vite.electron.config.ts
```

- [ ] **Step 4: Delete the old CI workflow**

```bash
git rm .github/workflows/electron-release.yml
```

- [ ] **Step 5: Clean up `.gitignore`**

Remove the lines:

```
# Electron build outputs
dist-electron/
dist-electron-build/
```

- [ ] **Step 6: Run the full test suite and lint one more time**

Run: `pnpm test && pnpm lint`
Expected: all pass (Electron's own test files are gone along with `electron/`, so the suite should shrink, not fail)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove Electron in favor of Tauri"
```

---

### Task 14: Sync documentation

**Files:**
- Modify: `AGENTS.md` (the "Electron Desktop Build" section becomes a "Tauri Desktop Build" section)
- Modify: `CHANGELOG.md`, `README.md`/`README-EXT.md` as needed

- [ ] **Step 1: Invoke the project's doc-sync skill**

Use the `.claude/skills/sync-docs/SKILL.md` workflow (per `AGENTS.md`'s Documentation section) to update `CLAUDE.md`/`AGENTS.md`, `CHANGELOG.md`, and the READMEs to describe the new Tauri build in place of the Electron section, including the new file table (`src-tauri/Cargo.toml`, `src-tauri/src/main.rs`, `src-tauri/src/backup.rs`, `src-tauri/src/menu.rs`, `src-tauri/src/quit_flush.rs`, `src/lib/tauriElectronApiShim.ts`, `src/lib/tauriUpdater.ts`) and the new npm scripts (`tauri`, `tauri:dev`, `tauri:build`).

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md CHANGELOG.md README.md README-EXT.md
git commit -m "docs: sync documentation for Tauri migration"
```

---

## Verification

End-to-end, this plan is verified by:
1. `pnpm test` and `cd src-tauri && cargo test` both green (Tasks 4, 6, 7, 8, 12).
2. `pnpm lint` clean (Task 12).
3. `pnpm tauri:dev` opens a working app with full menu/backup/quit-flush behavior (Task 12's manual checklist).
4. Real signed installers build via `pnpm tauri:build` on both macOS and Windows, and the CI workflow (Task 11) succeeds on the next real release tag.
5. After Task 13, `electron/` no longer exists and `pnpm test`/`pnpm lint` still pass — proof nothing depended on it beyond what was ported.
