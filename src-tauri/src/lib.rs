use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use sha2::{Sha256, Sha512, Digest};
use std::fs::File;
use std::io::{Read, BufReader};
use tauri::Emitter;

const CHUNK_SIZE: usize = 1024 * 1024 * 8; // 8MB chunks

// Progress tracking struct
#[derive(Default)]
pub struct ProgressState(pub Mutex<f32>);

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    processed: u64,
    total: u64,
}

#[derive(Deserialize)]
pub struct HashRequest {
    path: String,
    algorithm: String,
}

#[derive(Serialize)]
pub struct HashResponse {
    hash: String,
}

#[tauri::command]
async fn calculate_file_hash(
    request: HashRequest,
    state: tauri::State<'_, ProgressState>,
    app: tauri::AppHandle,
) -> Result<HashResponse, String> {
    let file = File::open(&request.path).map_err(|e| e.to_string())?;
    let file_size = file.metadata().map_err(|e| e.to_string())?.len();
    let mut reader = BufReader::with_capacity(CHUNK_SIZE, file);
    let mut buffer = vec![0; CHUNK_SIZE];
    let mut processed = 0u64;

    let hash = match request.algorithm.as_str() {
        "sha256" => {
            let mut hasher = Sha256::new();
            loop {
                let n = reader.read(&mut buffer).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buffer[..n]);
                processed += n as u64;

                let progress = (processed as f32 / file_size as f32) * 100.0;
                *state.0.lock().map_err(|e| e.to_string())? = progress;
                let _ = app.emit("hash-progress", ProgressPayload {
                    processed,
                    total: file_size,
                });
            }
            hex::encode(hasher.finalize())
        },
        "sha512" => {
            let mut hasher = Sha512::new();
            loop {
                let n = reader.read(&mut buffer).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.update(&buffer[..n]);
                processed += n as u64;

                let progress = (processed as f32 / file_size as f32) * 100.0;
                *state.0.lock().map_err(|e| e.to_string())? = progress;
                let _ = app.emit("hash-progress", ProgressPayload {
                    processed,
                    total: file_size,
                });
            }
            hex::encode(hasher.finalize())
        },
        "md5" => {
            let mut hasher = md5::Context::new();
            loop {
                let n = reader.read(&mut buffer).map_err(|e| e.to_string())?;
                if n == 0 { break; }
                hasher.consume(&buffer[..n]);
                processed += n as u64;

                let progress = (processed as f32 / file_size as f32) * 100.0;
                *state.0.lock().map_err(|e| e.to_string())? = progress;
                let _ = app.emit("hash-progress", ProgressPayload {
                    processed,
                    total: file_size,
                });
            }
            hex::encode(hasher.compute().0)
        },
        _ => return Err("Unsupported hash algorithm".to_string()),
    };

    Ok(HashResponse { hash })
}

pub fn run() {
    tauri::Builder::default()
        .manage(ProgressState::default())
        .invoke_handler(tauri::generate_handler![calculate_file_hash])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
