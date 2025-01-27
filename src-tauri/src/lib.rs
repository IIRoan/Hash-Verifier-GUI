use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::PathBuf;
use sha2::{Sha256, Sha512, Digest};
use std::fs;
use std::io::Write;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use tauri::Manager;
use tauri::Emitter;

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

#[derive(Deserialize)]
pub struct FileData {
    name: String,
    size: u64,
    #[serde(rename = "type")]
    type_: String,
    data: String, // Base64 encoded file content
}

#[tauri::command]
async fn get_file_path(file: FileData) -> Result<String, String> {
    // Get the app cache directory
    let cache_dir = if let Some(cache_dir) = dirs::cache_dir() {
        cache_dir.join("hash-verifier")
    } else {
        return Err("Could not determine cache directory".to_string());
    };

    // Create the cache directory if it doesn't exist
    fs::create_dir_all(&cache_dir).map_err(|e| format!("Failed to create cache directory: {}", e))?;

    // Create a unique filename
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let safe_name = sanitize_filename::sanitize(&file.name);
    let unique_name = format!("{}_{}", timestamp, safe_name);
    let file_path = cache_dir.join(unique_name);

    // Decode base64 data
    let file_data = BASE64.decode(file.data.split(",").last().unwrap_or(&file.data))
        .map_err(|e| format!("Failed to decode file data: {}", e))?;

    // Write the file
    let mut file = fs::File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&file_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    // Return the path as a string
    file_path.to_str()
        .ok_or_else(|| "Invalid path".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
async fn calculate_file_hash(
    request: HashRequest,
    state: tauri::State<'_, ProgressState>,
    app: tauri::AppHandle,
) -> Result<HashResponse, String> {
    let path = PathBuf::from(&request.path);
    let file_content = std::fs::read(&path).map_err(|e| e.to_string())?;
    let file_size = file_content.len();
    let chunk_size = 1024 * 1024; // 1MB chunks
    let mut processed = 0u64;

    let hash = match request.algorithm.as_str() {
        "sha256" => {
            let mut hasher = Sha256::new();
            for chunk in file_content.chunks(chunk_size) {
                hasher.update(chunk);
                processed += chunk.len() as u64;
                let progress = (processed as f32 / file_size as f32) * 100.0;
                *state.0.lock().map_err(|e| e.to_string())? = progress;
                let payload = ProgressPayload {
                    processed,
                    total: file_size as u64,
                };
                let _ = app.emit_to("main", "hash-progress", payload);
            }
            hex::encode(hasher.finalize())
        },
        "sha512" => {
            let mut hasher = Sha512::new();
            for chunk in file_content.chunks(chunk_size) {
                hasher.update(chunk);
                processed += chunk.len() as u64;
                let progress = (processed as f32 / file_size as f32) * 100.0;
                *state.0.lock().map_err(|e| e.to_string())? = progress;
                let payload = ProgressPayload {
                    processed,
                    total: file_size as u64,
                };
                let _ = app.emit_to("main", "hash-progress", payload);
            }
            hex::encode(hasher.finalize())
        },
        "md5" => {
            let mut hasher = md5::Context::new();
            for chunk in file_content.chunks(chunk_size) {
                hasher.consume(chunk);
                processed += chunk.len() as u64;
                let progress = (processed as f32 / file_size as f32) * 100.0;
                *state.0.lock().map_err(|e| e.to_string())? = progress;
                let payload = ProgressPayload {
                    processed,
                    total: file_size as u64,
                };
                let _ = app.emit_to("main", "hash-progress", payload);
            }
            hex::encode(hasher.compute().0)
        },
        _ => return Err("Unsupported hash algorithm".to_string()),
    };

    // Clean up the temporary file
    let _ = fs::remove_file(path);

    Ok(HashResponse { hash })
}

pub fn run() {
    tauri::Builder::default()
        .manage(ProgressState::default())
        .invoke_handler(tauri::generate_handler![
            calculate_file_hash,
            get_file_path
        ])
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
