use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const MAX_HISTORY: usize = 10;
const HISTORY_REPLACE_WINDOW_MS: u128 = 15_000;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct FileMeta {
    path: String,
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionState {
    left_text: String,
    right_text: String,
    left_file: Option<FileMeta>,
    right_file: Option<FileMeta>,
    mode: String,
    ignore_whitespace: bool,
    ignore_case: bool,
}

impl Default for SessionState {
    fn default() -> Self {
        Self {
            left_text: String::new(),
            right_text: String::new(),
            left_file: None,
            right_file: None,
            mode: "side".into(),
            ignore_whitespace: false,
            ignore_case: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoryEntry {
    id: String,
    label: String,
    timestamp: u128,
    left_text: String,
    right_text: String,
    left_file: Option<FileMeta>,
    right_file: Option<FileMeta>,
    mode: String,
    ignore_whitespace: bool,
    ignore_case: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    session: SessionState,
    recent_comparisons: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StatePayload {
    session: SessionState,
    recent_comparisons: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FilePayload {
    content: String,
    file: FileMeta,
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn app_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Failed to resolve app config dir: {error}"))?;

    Ok(config_dir.join("state.json"))
}

fn sanitize_mode(mode: String) -> String {
    if mode == "inline" {
        "inline".into()
    } else {
        "side".into()
    }
}

fn sanitize_file_meta(file: Option<FileMeta>) -> Option<FileMeta> {
    file.and_then(|meta| {
        if meta.path.trim().is_empty() {
            None
        } else {
            let name = if meta.name.trim().is_empty() {
                Path::new(&meta.path)
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or("Untitled")
                    .to_string()
            } else {
                meta.name
            };

            Some(FileMeta {
                path: meta.path,
                name,
            })
        }
    })
}

fn sanitize_session(session: SessionState) -> SessionState {
    SessionState {
        left_text: session.left_text,
        right_text: session.right_text,
        left_file: sanitize_file_meta(session.left_file),
        right_file: sanitize_file_meta(session.right_file),
        mode: sanitize_mode(session.mode),
        ignore_whitespace: session.ignore_whitespace,
        ignore_case: session.ignore_case,
    }
}

fn build_comparison_label(session: &SessionState) -> String {
    let left = session
        .left_file
        .as_ref()
        .map(|file| file.name.clone())
        .unwrap_or_else(|| "Original".into());
    let right = session
        .right_file
        .as_ref()
        .map(|file| file.name.clone())
        .unwrap_or_else(|| "Modified".into());

    format!("{left} ↔ {right}")
}

fn build_snapshot_id(session: &SessionState) -> String {
    let json = serde_json::to_vec(session).unwrap_or_default();
    let digest = Sha256::digest(json);
    format!("{digest:x}").chars().take(16).collect()
}

fn create_history_entry(session: &SessionState) -> Option<HistoryEntry> {
    if session.left_text.is_empty() && session.right_text.is_empty() {
        return None;
    }

    Some(HistoryEntry {
        id: build_snapshot_id(session),
        label: build_comparison_label(session),
        timestamp: now_ms(),
        left_text: session.left_text.clone(),
        right_text: session.right_text.clone(),
        left_file: session.left_file.clone(),
        right_file: session.right_file.clone(),
        mode: session.mode.clone(),
        ignore_whitespace: session.ignore_whitespace,
        ignore_case: session.ignore_case,
    })
}

fn merge_history(existing: &[HistoryEntry], session: &SessionState) -> Vec<HistoryEntry> {
    let Some(next_entry) = create_history_entry(session) else {
        return existing.to_vec();
    };

    let latest = existing.first();
    let same_pair = latest.is_some_and(|entry| {
        entry
            .left_file
            .as_ref()
            .map(|file| file.path.as_str())
            .unwrap_or_default()
            == next_entry
                .left_file
                .as_ref()
                .map(|file| file.path.as_str())
                .unwrap_or_default()
            && entry
                .right_file
                .as_ref()
                .map(|file| file.path.as_str())
                .unwrap_or_default()
                == next_entry
                    .right_file
                    .as_ref()
                    .map(|file| file.path.as_str())
                    .unwrap_or_default()
    });

    let replace_latest = latest.is_some_and(|entry| {
        entry.id == next_entry.id
            || (same_pair && next_entry.timestamp.saturating_sub(entry.timestamp) < HISTORY_REPLACE_WINDOW_MS)
    });

    let filtered: Vec<HistoryEntry> = if replace_latest {
        existing
            .iter()
            .skip(1)
            .filter(|entry| entry.id != next_entry.id)
            .cloned()
            .collect()
    } else {
        existing
            .iter()
            .filter(|entry| entry.id != next_entry.id)
            .cloned()
            .collect()
    };

    std::iter::once(next_entry)
        .chain(filtered)
        .take(MAX_HISTORY)
        .collect()
}

fn load_persisted_state(app: &AppHandle) -> Result<PersistedState, String> {
    let state_path = app_state_path(app)?;

    if !state_path.exists() {
        return Ok(PersistedState::default());
    }

    let raw = fs::read_to_string(&state_path).map_err(|error| format!("Failed to read state: {error}"))?;
    let state: PersistedState =
        serde_json::from_str(&raw).map_err(|error| format!("Failed to parse state: {error}"))?;

    Ok(PersistedState {
        session: sanitize_session(state.session),
        recent_comparisons: state
            .recent_comparisons
            .into_iter()
            .filter_map(|entry| {
                let session = sanitize_session(SessionState {
                    left_text: entry.left_text,
                    right_text: entry.right_text,
                    left_file: entry.left_file,
                    right_file: entry.right_file,
                    mode: entry.mode,
                    ignore_whitespace: entry.ignore_whitespace,
                    ignore_case: entry.ignore_case,
                });

                if session.left_text.is_empty() && session.right_text.is_empty() {
                    return None;
                }

                Some(HistoryEntry {
                    id: if entry.id.is_empty() {
                        build_snapshot_id(&session)
                    } else {
                        entry.id
                    },
                    label: build_comparison_label(&session),
                    timestamp: if entry.timestamp == 0 { now_ms() } else { entry.timestamp },
                    left_text: session.left_text,
                    right_text: session.right_text,
                    left_file: session.left_file,
                    right_file: session.right_file,
                    mode: session.mode,
                    ignore_whitespace: session.ignore_whitespace,
                    ignore_case: session.ignore_case,
                })
            })
            .take(MAX_HISTORY)
            .collect(),
    })
}

fn write_persisted_state(app: &AppHandle, state: &PersistedState) -> Result<(), String> {
    let state_path = app_state_path(app)?;
    let parent = state_path
        .parent()
        .ok_or_else(|| "Failed to resolve state directory".to_string())?;

    fs::create_dir_all(parent).map_err(|error| format!("Failed to create state directory: {error}"))?;
    let raw = serde_json::to_string_pretty(state).map_err(|error| format!("Failed to encode state: {error}"))?;
    fs::write(state_path, raw).map_err(|error| format!("Failed to write state: {error}"))?;
    Ok(())
}

fn build_state_payload(state: PersistedState) -> StatePayload {
    StatePayload {
        session: state.session,
        recent_comparisons: state.recent_comparisons,
    }
}

fn is_probably_binary(bytes: &[u8]) -> bool {
    let sample = bytes.iter().take(8_000);
    let mut suspicious = 0usize;
    let mut total = 0usize;

    for byte in sample {
        total += 1;

        if *byte == 0 {
            return true;
        }

        let is_control = *byte < 7 || (*byte > 13 && *byte < 32);
        if is_control {
            suspicious += 1;
        }
    }

    total > 0 && suspicious as f64 / total as f64 > 0.12
}

#[tauri::command]
fn load_state(app: AppHandle) -> Result<StatePayload, String> {
    load_persisted_state(&app).map(build_state_payload)
}

#[tauri::command]
fn save_state(app: AppHandle, session: SessionState) -> Result<StatePayload, String> {
    let mut state = load_persisted_state(&app).unwrap_or_default();
    state.session = sanitize_session(session);
    state.recent_comparisons = merge_history(&state.recent_comparisons, &state.session);
    write_persisted_state(&app, &state)?;
    Ok(build_state_payload(state))
}

#[tauri::command]
fn reopen_comparison(app: AppHandle, id: String) -> Result<StatePayload, String> {
    let mut state = load_persisted_state(&app)?;
    let entry = state
        .recent_comparisons
        .iter()
        .find(|entry| entry.id == id)
        .cloned()
        .ok_or_else(|| "Comparison no longer exists.".to_string())?;

    state.session = sanitize_session(SessionState {
        left_text: entry.left_text,
        right_text: entry.right_text,
        left_file: entry.left_file,
        right_file: entry.right_file,
        mode: entry.mode,
        ignore_whitespace: entry.ignore_whitespace,
        ignore_case: entry.ignore_case,
    });
    state.recent_comparisons = merge_history(&state.recent_comparisons, &state.session);
    write_persisted_state(&app, &state)?;
    Ok(build_state_payload(state))
}

#[tauri::command]
fn clear_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    let mut state = load_persisted_state(&app).unwrap_or_default();
    state.recent_comparisons.clear();
    write_persisted_state(&app, &state)?;
    Ok(vec![])
}

#[tauri::command]
fn read_text_file(path: String) -> Result<FilePayload, String> {
    let bytes = fs::read(&path).map_err(|error| format!("Failed to read file: {error}"))?;

    if is_probably_binary(&bytes) {
        return Err("Selected file looks binary. ElDiff supports UTF-8 text only.".into());
    }

    let content = String::from_utf8(bytes).map_err(|error| format!("File is not valid UTF-8: {error}"))?;
    let name = Path::new(&path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Untitled")
        .to_string();

    Ok(FilePayload {
        content,
        file: FileMeta { path, name },
    })
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<String, String> {
    fs::write(&path, content).map_err(|error| format!("Failed to write file: {error}"))?;
    Ok(path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            reopen_comparison,
            clear_history,
            read_text_file,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
