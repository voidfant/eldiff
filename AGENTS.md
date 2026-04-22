# AGENTS.md

## Project Overview

This repo is a macOS desktop text diff app called `ElDiff`.

Current app stack:

- Tauri for the desktop shell and packaging
- Static HTML/CSS/JS renderer
- Rust commands for filesystem access, state persistence, and history restore

Important: this project is no longer Electron-first. Old Electron build artifacts may still exist in the repo, but Tauri is the source of truth now.

## Source Of Truth

- Renderer UI: `src/renderer/`
- Tauri app shell: `src-tauri/`
- Original one-file prototype/reference: `references/index.html`

Main files to know:

- `src/renderer/index.html`
  - App shell markup
  - Includes the draggable header region
- `src/renderer/styles.css`
  - Desktop glass styling
  - Layout, panes, diff surface, history panel
- `src/renderer/app.js`
  - Renderer state
  - Diff behavior
  - Tauri dialog/invoke bridge usage
  - Export/open/save/recent-history UI logic
- `src-tauri/src/main.rs`
  - Rust backend commands
  - State persistence
  - Recent-comparison storage/reopen
  - Binary-file rejection
- `src-tauri/tauri.conf.json`
  - Window config
  - Bundle config
  - Frontend path

## App Behavior Notes

The app is scoped to UTF-8 text diffing only.

Supported desktop flows:

- Open left file
- Open right file
- Save left pane
- Save right pane
- Export diff as HTML snapshot
- Restore last session on launch
- Keep recent comparison history locally

Recent comparison history:

- Stored in app config/state JSON
- Capped at 10 items
- Stores pane snapshots, metadata, timestamp, and compare options

Renderer state includes:

- Left text
- Right text
- Left/right file metadata
- Compare options
- Active mode (`side` or `inline`)
- Recent history list

## Rust Commands

Commands exposed from `src-tauri/src/main.rs`:

- `load_state`
- `save_state`
- `reopen_comparison`
- `clear_history`
- `read_text_file`
- `write_text_file`

Notes:

- Renderer uses Tauri `invoke` for state and file IO
- Native dialogs are opened from the renderer through Tauri globals
- Binary-ish files are rejected in Rust before loading into the text panes

## Window / UI Notes

The macOS window uses Tauri native chrome configuration, not a fake custom title bar.

Important UI implementation detail:

- The top header area must remain draggable via `data-tauri-drag-region`

If drag stops working, inspect `src/renderer/index.html` first and check whether an overlaying element is blocking the drag region.

Also be careful around traffic lights:

- Do not let header plates or absolutely positioned UI overlap the macOS close/minimize/zoom controls

## Run / Build

Install deps:

```bash
npm install
```

Run in dev:

```bash
npm start
```

or:

```bash
npm run dev
```

Build `.app`:

```bash
npm run build:mac
```

Build `.app` and `.dmg`:

```bash
npm run dist:mac
```

Current package scripts live in `package.json`.

## Build Output

Primary packaged app path:

```text
src-tauri/target/release/bundle/macos/ElDiff.app
```

Typical DMG output path:

```text
src-tauri/target/release/bundle/dmg/
```

## Repo Size / Cleanup Notes

If repo size looks wrong, check these first:

- `dist/`
  - likely stale Electron output from the old implementation
  - not the current desktop target
- `src-tauri/target/`
  - Cargo build cache and bundle output
  - expected to get large during builds

Tauri app bundle is small. If someone reports a massive app size again, make sure they are not measuring old Electron artifacts in `dist/`.

## Known Defaults

- Packaging is local only
- No signing/notarization in this pass
- No auto-update
- No telemetry
- No git diff integration
- No binary diff
- No folder diff

## Practical Editing Guidance

When changing the app:

- Treat `src/renderer/` as the real frontend
- Treat `src-tauri/src/main.rs` as the trusted layer for filesystem/state operations
- Keep exports self-contained so exported HTML opens outside the app
- Preserve offline behavior; do not add network font dependencies
- Keep the visual style restrained and mac-native rather than glossy-for-the-sake-of-gloss

## Asset Note

`src-tauri/icons/icon.png` is currently a placeholder icon so local bundling works. If polish matters, replace it with a proper app icon set later.
