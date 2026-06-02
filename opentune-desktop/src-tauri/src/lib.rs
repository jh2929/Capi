use std::path::PathBuf;
use std::process::Command;
use std::io::Write;
use tauri::{Manager, Emitter};
use futures_util::StreamExt;
use std::net::TcpListener;
use std::io::{Read, Seek};
use std::fs::File;

struct LocalServerState {
    port: u16,
}

fn start_local_server(opentune_dir: PathBuf) -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind local server");
    let port = listener.local_addr().expect("Failed to get local address").port();
    let opentune_dir = opentune_dir.clone();
    
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let opentune_dir = opentune_dir.clone();
                std::thread::spawn(move || {
                    let mut buffer = [0; 4096];
                    if let Ok(n) = stream.read(&mut buffer) {
                        let request = String::from_utf8_lossy(&buffer[..n]);
                        let first_line = request.lines().next().unwrap_or("");
                        let parts: Vec<&str> = first_line.split_whitespace().collect();
                        if parts.len() >= 2 && parts[0] == "GET" {
                            let path_and_query = parts[1];
                            if let Some(pos) = path_and_query.find("file=") {
                                let encoded_file = &path_and_query[pos + 5..];
                                let decoded_str = match urlencoding::decode(encoded_file) {
                                    Ok(d) => d.into_owned(),
                                    Err(_) => encoded_file.to_string(),
                                };
                                let file_path = opentune_dir.join(&decoded_str);
                                if file_path.starts_with(&opentune_dir) && file_path.exists() {
                                    if let Ok(mut file) = File::open(&file_path) {
                                        let metadata = file.metadata().unwrap();
                                        let file_size = metadata.len();
                                        
                                        let mut range_start = 0;
                                        let mut range_end = file_size - 1;
                                        let mut is_partial = false;
                                        
                                        for line in request.lines() {
                                            if line.to_lowercase().starts_with("range:") {
                                                if let Some(pos) = line.find("bytes=") {
                                                    let range_str = &line[pos + 6..].trim();
                                                    let range_parts: Vec<&str> = range_str.split('-').collect();
                                                    if let Ok(start) = range_parts[0].parse::<u64>() {
                                                        range_start = start;
                                                        is_partial = true;
                                                    }
                                                    if range_parts.len() > 1 && !range_parts[1].is_empty() {
                                                        if let Ok(end) = range_parts[1].parse::<u64>() {
                                                            range_end = end;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        
                                        let content_length = range_end - range_start + 1;
                                        let status_line = if is_partial {
                                            "HTTP/1.1 206 Partial Content\r\n"
                                        } else {
                                            "HTTP/1.1 200 OK\r\n"
                                        };
                                        
                                        let ext = file_path.extension().and_then(|e| e.to_str()).unwrap_or("");
                                        let mime_type = if ext == "m4a" { "audio/mp4" } else { "audio/webm" };
                                        
                                        let mut response_headers = format!(
                                            "{}Content-Type: {}\r\nContent-Length: {}\r\nAccept-Ranges: bytes\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n",
                                            status_line, mime_type, content_length
                                        );
                                        
                                        if is_partial {
                                            response_headers.push_str(&format!(
                                                "Content-Range: bytes {}-{}/{}\r\n",
                                                range_start, range_end, file_size
                                            ));
                                        }
                                        
                                        response_headers.push_str("\r\n");
                                        
                                        if let Ok(_) = stream.write_all(response_headers.as_bytes()) {
                                            use std::io::Seek;
                                            if file.seek(std::io::SeekFrom::Start(range_start)).is_ok() {
                                                let mut chunk = [0; 65536];
                                                let mut remaining = content_length;
                                                while remaining > 0 {
                                                    let to_read = std::cmp::min(remaining, chunk.len() as u64) as usize;
                                                    match file.read(&mut chunk[..to_read]) {
                                                        Ok(0) => break,
                                                        Ok(bytes_read) => {
                                                            if stream.write_all(&chunk[..bytes_read]).is_err() {
                                                                break;
                                                            }
                                                            remaining -= bytes_read as u64;
                                                        }
                                                        Err(_) => break,
                                                    }
                                                }
                                            }
                                        }
                                        return;
                                    }
                                }
                            }
                        }
                        let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                        let _ = stream.write_all(response.as_bytes());
                    }
                });
            }
        }
    });
    port
}


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

#[tauri::command]
fn obtener_local_port(state: tauri::State<'_, LocalServerState>) -> u16 {
    state.port
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

            // Start localhost HTTP server for local music playback
            let app_data = app.handle().path().app_data_dir()
                .map_err(|e| format!("No se pudo resolver el directorio de datos: {}", e))?;
            let opentune_dir = app_data.join("Opentune");
            if !opentune_dir.exists() {
                std::fs::create_dir_all(&opentune_dir)
                    .map_err(|e| format!("No se pudo crear el directorio de Opentune: {}", e))?;
            }
            let local_port = start_local_server(opentune_dir);
            app.manage(LocalServerState { port: local_port });

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
            obtener_sugerencias,
            obtener_local_port
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
