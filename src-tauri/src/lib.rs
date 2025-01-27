use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use sha2::{Sha256, Sha512, Digest};
use std::fs::File;
use std::io::{Read, BufReader};
use tauri::Emitter;
use memmap2::MmapOptions;
use rayon::prelude::*;

const CHUNK_SIZE: usize = 1024 * 1024 * 8; // 8MB chunks
const PARALLEL_THRESHOLD: u64 = 10 * 1024 * 1024; // 10MB threshold for parallel processing

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

fn calculate_chunk_hash(chunk: &[u8], algorithm: &str) -> Vec<u8> {
    match algorithm {
        "sha256" => {
            let mut hasher = Sha256::new();
            hasher.update(chunk);
            hasher.finalize().to_vec()
        },
        "sha512" => {
            let mut hasher = Sha512::new();
            hasher.update(chunk);
            hasher.finalize().to_vec()
        },
        "md5" => {
            let mut hasher = md5::Context::new();
            hasher.consume(chunk);
            hasher.compute().0.to_vec()
        },
        _ => panic!("Unsupported algorithm")
    }
}

#[tauri::command]
async fn calculate_file_hash(
    request: HashRequest,
    state: tauri::State<'_, ProgressState>,
    app: tauri::AppHandle,
) -> Result<HashResponse, String> {
    let file = File::open(&request.path).map_err(|e| e.to_string())?;
    let file_size = file.metadata().map_err(|e| e.to_string())?.len();

    let hash = if file_size > PARALLEL_THRESHOLD {
        // Use memory mapping for large files
        let mmap = unsafe {
            MmapOptions::new()
                .map(&file)
                .map_err(|e| e.to_string())?
        };

        // Split the file into chunks
        let chunks: Vec<_> = mmap
            .chunks(CHUNK_SIZE)
            .collect();

        let total_chunks = chunks.len();
        let processed = std::sync::atomic::AtomicUsize::new(0);

        // Process chunks in parallel
        let chunk_hashes: Vec<Vec<u8>> = chunks
            .par_iter()
            .map(|chunk| {
                let hash = calculate_chunk_hash(chunk, &request.algorithm);

                // Update progress
                let current = processed.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
                let progress = (current as f32 / total_chunks as f32) * 100.0;

                if current % 10 == 0 || current == total_chunks {  // Update every 10 chunks or at completion
                    let _ = app.emit("hash-progress", ProgressPayload {
                        processed: (current as u64 * CHUNK_SIZE as u64).min(file_size),
                        total: file_size,
                    });
                }

                hash
            })
            .collect();

        // Combine chunk hashes
        let final_hash = match request.algorithm.as_str() {
            "sha256" => {
                let mut hasher = Sha256::new();
                for hash in chunk_hashes {
                    hasher.update(hash);
                }
                hex::encode(hasher.finalize())
            },
            "sha512" => {
                let mut hasher = Sha512::new();
                for hash in chunk_hashes {
                    hasher.update(hash);
                }
                hex::encode(hasher.finalize())
            },
            "md5" => {
                let mut hasher = md5::Context::new();
                for hash in chunk_hashes {
                    hasher.consume(hash);
                }
                hex::encode(hasher.compute().0)
            },
            _ => return Err("Unsupported hash algorithm".to_string()),
        };
        final_hash
    } else {
        // Use simple buffered reading for small files
        let mut reader = BufReader::with_capacity(CHUNK_SIZE, file);
        let mut buffer = vec![0; CHUNK_SIZE];
        let mut processed = 0u64;

        match request.algorithm.as_str() {
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
        }
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
