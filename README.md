# ElDiff

ElDiff is a local macOS desktop utility for comparing UTF-8 text files and quickly inspecting developer-friendly text formats. It is built with Tauri, a static HTML/CSS/JS renderer, and a small Rust backend for file access and local state persistence.

The app is intentionally offline-first: no telemetry, no network font dependencies, and no remote services.

## Features

- Side-by-side and inline text diffs
- Open and save original/modified text panes
- Export a self-contained HTML diff snapshot
- Restore the last comparison on launch
- Keep recent comparison history locally, capped at 10 entries
- JSON parser, beautifier, minifier, copy, and save flow
- Log reader with search, level filtering, line jumping, source/time/level highlighting, multiline entry handling, and collapsible formatted JSON payloads

## Scope

ElDiff is for UTF-8 text content only. Binary-ish files are rejected by the Rust backend before they reach the renderer.

Not included in this pass:

- Binary diff
- Folder diff
- Git diff integration
- Telemetry
- Auto-update
- Code signing or notarization

## Project Layout

```text
src/renderer/
  index.html      App shell markup and tool panels
  styles.css      macOS-style layout, panes, diff/log/JSON styling
  app.js          Renderer state, diff logic, tool behavior, Tauri bridge calls

src-tauri/
  src/main.rs     Tauri commands for state, history, and UTF-8 file IO
  tauri.conf.json Window, bundle, and frontend configuration

references/
  index.html      Original one-file prototype/reference
```

Tauri is the source of truth for the desktop app. The `dist/` directory may contain stale artifacts from an older Electron implementation and should not be treated as the current packaging target.

## Requirements

- Node.js and npm
- Rust toolchain
- macOS for the current app bundle target

Install JavaScript dependencies:

```bash
npm install
```

## Development

Run the app in development mode:

```bash
npm start
```

or:

```bash
npm run dev
```

## Build

Build a macOS `.app` bundle:

```bash
npm run build:mac
```

Build a macOS `.app` and `.dmg`:

```bash
npm run dist:mac
```

Primary packaged app output:

```text
src-tauri/target/release/bundle/macos/ElDiff.app
```

Typical DMG output directory:

```text
src-tauri/target/release/bundle/dmg/
```

## Local State

ElDiff stores session and recent comparison state in the app config directory as JSON. Recent history stores pane snapshots, file metadata, timestamps, and compare options. Scratch state for utility tools is kept locally in browser storage when practical.

## Notes For Contributors

- Treat `src/renderer/` as the real frontend.
- Treat `src-tauri/src/main.rs` as the trusted filesystem and persistence layer.
- Keep exported HTML self-contained so it opens outside the app.
- Preserve the native draggable header behavior through `data-tauri-drag-region`.
- Avoid placing custom UI over the macOS traffic-light controls.
- Preserve offline behavior and the restrained mac-native visual style.
