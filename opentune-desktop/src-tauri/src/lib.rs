use std::path::PathBuf;
use std::process::Command;
use std::io::Write;
use tauri::{Manager, Emitter};
use futures_util::StreamExt;

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    track_id: String,
    progress: f64,
}

fn get_binary_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // 1. Check development/absolute workspace path first to allow running the target/release binary directly
    let dev_path = std::path::Path::new("/home/emixdy/Documentos/opentune-desktop/opentune-desktop/bin/opentune-core");
    if dev_path.exists() {
        return Ok(dev_path.to_path_buf());
    }

    // 2. Check compiled bundle resources
    if let Ok(dir) = app.path().resource_dir() {
        let path = dir.join("bin").join("opentune-core");
        if path.exists() {
            return Ok(path);
        }
        let path_flat = dir.join("opentune-core");
        if path_flat.exists() {
            return Ok(path_flat);
        }
    }

    // 3. Check adjacent to current running binary directory
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let path = parent.join("bin").join("opentune-core");
            if path.exists() {
                return Ok(path);
            }
            let path_flat = parent.join("opentune-core");
            if path_flat.exists() {
                return Ok(path_flat);
            }
        }
    }

    // 4. Default build fallback
    app.path()
        .resource_dir()
        .map_err(|e| e.to_string())
        .map(|dir| dir.join("bin").join("opentune-core"))
}

use std::process::{ChildStdin, ChildStdout, Stdio};
use std::io::{BufRead, BufReader};
use std::sync::Mutex;

struct DaemonProcess {
    stdin: Mutex<ChildStdin>,
    stdout: Mutex<BufReader<ChildStdout>>,
}

fn send_daemon_command(daemon: &DaemonProcess, command: &str) -> Result<String, String> {
    let mut stdin = daemon.stdin.lock().map_err(|e| e.to_string())?;
    let mut stdout = daemon.stdout.lock().map_err(|e| e.to_string())?;
    
    writeln!(stdin, "{}", command).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    
    let mut response = String::new();
    stdout.read_line(&mut response).map_err(|e| e.to_string())?;
    Ok(response.trim().to_string())
}

#[tauri::command]
async fn buscar_cancion(daemon: tauri::State<'_, DaemonProcess>, query: String) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "search",
        "query": query
    }).to_string();
    send_daemon_command(&daemon, &cmd)
}

#[tauri::command]
async fn obtener_stream(daemon: tauri::State<'_, DaemonProcess>, id: String) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "get-stream",
        "id": id
    }).to_string();
    send_daemon_command(&daemon, &cmd)
}

#[tauri::command]
async fn descargar_cancion(
    app: tauri::AppHandle,
    track_id: String,
    title: String,
    artist: String,
    url: String,
) -> Result<String, String> {
    let music_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver el directorio de datos de la app: {}", e))?;
    
    let opentune_dir = music_dir.join("Opentune");
    if !opentune_dir.exists() {
        std::fs::create_dir_all(&opentune_dir)
            .map_err(|e| format!("No se pudo crear el directorio de Opentune: {}", e))?;
    }

    let clean_title: String = title
        .chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let clean_artist: String = artist
        .chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' })
        .collect();

    let ext = if url.contains("mime=audio%2Fmp4") || url.contains("mime=audio/mp4") || url.contains("mime=audio%2Fm4a") {
        "m4a"
    } else {
        "webm"
    };

    let filename = format!("{} - {}.{}", clean_artist, clean_title, ext);
    let dest_path = opentune_dir.join(&filename);

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {}", e))?;
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Error en la petición de descarga: {}", e))?;

    let total_size = res
        .content_length()
        .ok_or_else(|| "No se pudo obtener el tamaño total de la canción".to_string())?;

    let mut downloaded: u64 = 0;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&dest_path)
        .map_err(|e| format!("No se pudo crear el archivo local: {}", e))?;

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {}", e))?;

    // Hardening: Retry loop up to 3 attempts with Range resumes
    let mut attempts = 0;
    while downloaded < total_size {
        if attempts > 3 {
            return Err("Descarga fallida tras múltiples reintentos de red".to_string());
        }

        let mut req = client.get(&url);
        if downloaded > 0 {
            req = req.header("Range", format!("bytes={}-", downloaded));
        }

        let res = match req.send().await {
            Ok(r) => r,
            Err(_e) => {
                attempts += 1;
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                continue;
            }
        };

        if !res.status().is_success() && res.status() != reqwest::StatusCode::PARTIAL_CONTENT {
            attempts += 1;
            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
            continue;
        }

        let mut stream = res.bytes_stream();
        let mut stream_err = false;

        while let Some(item) = stream.next().await {
            match item {
                Ok(chunk) => {
                    if let Err(e) = file.write_all(&chunk) {
                        return Err(format!("Error escribiendo bytes en el disco: {}", e));
                    }
                    downloaded += chunk.len() as u64;
                    let progress = (downloaded as f64 / total_size as f64) * 100.0;

                    app.emit(
                        "download-progress",
                        DownloadProgress {
                            track_id: track_id.clone(),
                            progress,
                        },
                    )
                    .ok();
                }
                Err(_) => {
                    stream_err = true;
                    break;
                }
            }
        }

        if stream_err {
            attempts += 1;
            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        } else {
            // Success or complete chunk stream
            break;
        }
    }

    // Validation post-download
    let metadata = std::fs::metadata(&dest_path)
        .map_err(|e| format!("Fallo al validar metadatos del archivo: {}", e))?;
    if metadata.len() < 1024 {
        let _ = std::fs::remove_file(&dest_path);
        return Err("Descarga inválida: El archivo final está corrupto o vacío (< 1KB)".to_string());
    }

    let absolute_path = dest_path
        .to_str()
        .ok_or_else(|| "Error convirtiendo la ruta final a texto".to_string())?
        .to_string();

    Ok(absolute_path)
}

#[tauri::command]
async fn borrar_cancion(path: String) -> Result<(), String> {
    let file_path = std::path::Path::new(&path);
    if file_path.exists() {
        std::fs::remove_file(file_path)
            .map_err(|e| format!("No se pudo borrar el archivo: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn obtener_home(daemon: tauri::State<'_, DaemonProcess>, continuation: Option<String>) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "home",
        "continuation": continuation
    }).to_string();
    send_daemon_command(&daemon, &cmd)
}

#[tauri::command]
async fn obtener_artista(daemon: tauri::State<'_, DaemonProcess>, id: String) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "artist",
        "id": id
    }).to_string();
    send_daemon_command(&daemon, &cmd)
}

#[tauri::command]
async fn obtener_explorar(daemon: tauri::State<'_, DaemonProcess>) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "explore"
    }).to_string();
    send_daemon_command(&daemon, &cmd)
}

#[tauri::command]
async fn obtener_letras(daemon: tauri::State<'_, DaemonProcess>, artist: String, title: String, duration: i32) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "lyrics",
        "artist": artist,
        "title": title,
        "duration": duration
    }).to_string();
    send_daemon_command(&daemon, &cmd)
}

#[tauri::command]
async fn obtener_sugerencias(query: String) -> Result<String, String> {
    let url = format!(
        "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={}",
        urlencoding::encode(&query)
    );
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .map_err(|e| format!("Error fetching suggestions: {}", e))?;
    let text = res
        .text()
        .await
        .map_err(|e| format!("Error reading suggestions: {}", e))?;
    let parsed: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Error parsing suggestions: {}", e))?;
    if let Some(arr) = parsed.get(1) {
        Ok(arr.to_string())
    } else {
        Ok("[]".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let binary = get_binary_path(&app.handle())?;
            let mut child = Command::new(&binary)
                .arg("--daemon")
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
                .map_err(|e| format!("Fallo al iniciar opentune-core daemon: {}", e))?;

            let stdin = child.stdin.take().unwrap();
            let mut stdout = BufReader::new(child.stdout.take().unwrap());

            // Wait for {"status":"ready"}
            let mut ready_line = String::new();
            stdout.read_line(&mut ready_line).map_err(|e| format!("Daemon startup read failed: {}", e))?;
            if !ready_line.contains("ready") {
                return Err(format!("Daemon initialization failed: {}", ready_line).into());
            }

            app.manage(DaemonProcess {
                stdin: Mutex::new(stdin),
                stdout: Mutex::new(stdout),
            });

            // Prevent leaking daemon by holding child process
            let child_mutex = Mutex::new(child);
            app.manage(child_mutex);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            buscar_cancion,
            obtener_stream,
            descargar_cancion,
            borrar_cancion,
            obtener_home,
            obtener_artista,
            obtener_explorar,
            obtener_letras,
            obtener_sugerencias
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
