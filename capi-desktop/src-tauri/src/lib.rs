use std::path::PathBuf;
use std::process::Command;
use std::io::Write;
use tauri::{Manager, Emitter};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use tauri::WebviewWindowBuilder;
use tauri_plugin_single_instance;
use futures_util::StreamExt;
use std::net::TcpListener;
use std::io::Read;
use std::fs::File;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

struct LocalServerState {
    port: u16,
}

pub struct DiscordState {
    pub client: Mutex<Option<DiscordIpcClient>>,
}

fn start_local_server(capi_dir: PathBuf) -> u16 {
    let port = (12761..12771).find(|&p| TcpListener::bind(format!("127.0.0.1:{}", p)).is_ok())
        .expect("Failed to bind local server on any port 12761-12770");
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).unwrap();
    println!("[PROXY] Server started on port {}", port);
    let capi_dir = capi_dir.clone();
    
    let client = reqwest::blocking::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .connect_timeout(std::time::Duration::from_secs(8))
        .pool_idle_timeout(std::time::Duration::from_secs(20))
        .build()
        .expect("Failed to build proxy HTTP client");
    
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let capi_dir = capi_dir.clone();
                let client = client.clone();
                std::thread::spawn(move || {
                    let mut buffer = [0; 4096];
                    if let Ok(n) = stream.read(&mut buffer) {
                        let request = String::from_utf8_lossy(&buffer[..n]);
                        let first_line = request.lines().next().unwrap_or("");
                        let parts: Vec<&str> = first_line.split_whitespace().collect();
                        if parts.len() >= 2 && parts[0] == "GET" {
                            let path_and_query = parts[1];
                            
                            // ─── Image proxy: /image?url=... ───────────
                            if path_and_query.starts_with("/image") {
                                if let Some(pos) = path_and_query.find("url=") {
                                    let encoded_url = &path_and_query[pos + 4..];
                                    let img_url = match urlencoding::decode(encoded_url) {
                                        Ok(d) => d.into_owned(),
                                        Err(_) => encoded_url.to_string(),
                                    };
                                    if let Ok(mut resp) = client.get(&img_url).send() {
                                        let status = resp.status();
                                        let content_type = resp.headers().get("content-type")
                                            .and_then(|h| h.to_str().ok())
                                            .unwrap_or("image/jpeg");
                                        let content_length = resp.headers().get("content-length")
                                            .and_then(|h| h.to_str().ok())
                                            .unwrap_or("0");
                                        let cache_control = resp.headers().get("cache-control")
                                            .and_then(|h| h.to_str().ok())
                                            .unwrap_or("public, max-age=86400");
                                        let status_line = format!("HTTP/1.1 {} {}\r\n", status.as_u16(), status.canonical_reason().unwrap_or("OK"));
                                        let response_headers = format!(
                                            "{}Content-Type: {}\r\nContent-Length: {}\r\nCache-Control: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
                                            status_line, content_type, content_length, cache_control
                                        );
                                        let _ = stream.write_all(response_headers.as_bytes());
                                        let mut buf = [0; 65536];
                                        while let Ok(n) = resp.read(&mut buf) {
                                            if n == 0 { break; }
                                            if stream.write_all(&buf[..n]).is_err() { break; }
                                        }
                                    } else {
                                        let resp = "HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                                        let _ = stream.write_all(resp.as_bytes());
                                    }
                                } else {
                                    let resp = "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                                    let _ = stream.write_all(resp.as_bytes());
                                }
                                return;
                            }
                            
                            // ─── Audio stream proxy: /play?url=... ─────
                            if let Some(pos) = path_and_query.find("url=") {
                                let encoded_url = &path_and_query[pos + 4..];
                                let decoded_url = match urlencoding::decode(encoded_url) {
                                    Ok(d) => d.into_owned(),
                                    Err(_) => encoded_url.to_string(),
                                };
                                
                                let mut range_header = None;
                                for line in request.lines() {
                                    if line.to_lowercase().starts_with("range:") {
                                        range_header = Some(line.to_string());
                                    }
                                }
                                println!("[PROXY] Incoming request for url: {}", &decoded_url[..std::cmp::min(100, decoded_url.len())]);
                                let mut req = client.get(&decoded_url);
                                if let Some(ref r) = range_header {
                                    println!("[PROXY] Request Range: {:?}", r);
                                    if let Some(val) = r.split(':').nth(1) {
                                        req = req.header("Range", val.trim());
                                    }
                                }
                                
                                let req_start = std::time::Instant::now();
                                if let Ok(mut response) = req.send() {
                                    let req_duration = req_start.elapsed().as_millis();
                                    let status = response.status();
                                    println!("[PROXY] reqwest send took: {}ms | Status: {}", req_duration, status);
                                    let headers = response.headers();
                                    
                                    let content_type = headers.get("content-type")
                                        .and_then(|h| h.to_str().ok())
                                        .unwrap_or("audio/webm");
                                    let content_length = headers.get("content-length")
                                        .and_then(|h| h.to_str().ok())
                                        .unwrap_or("0");
                                        
                                    let status_line = format!("HTTP/1.1 {} {}\r\n", status.as_u16(), status.canonical_reason().unwrap_or("OK"));
                                    let mut response_headers = format!(
                                        "{}Content-Type: {}\r\nContent-Length: {}\r\nAccept-Ranges: bytes\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n",
                                        status_line, content_type, content_length
                                    );
                                    
                                    if let Some(range_val) = headers.get("content-range") {
                                        if let Ok(rv) = range_val.to_str() {
                                            response_headers.push_str(&format!("Content-Range: {}\r\n", rv));
                                        }
                                    }
                                    response_headers.push_str("\r\n");
                                    
                                    let _ = stream.set_nodelay(true);
                                    if stream.write_all(response_headers.as_bytes()).is_ok() {
                                         stream.flush().ok();
                                         let mut buf = [0; 65536];
                                         let mut total_bytes = 0;
                                         let write_start = std::time::Instant::now();
                                         while let Ok(bytes_read) = response.read(&mut buf) {
                                             if bytes_read == 0 {
                                                 break;
                                             }
                                             if stream.write_all(&buf[..bytes_read]).is_err() {
                                                 break;
                                             }
                                             let _ = stream.flush();
                                             total_bytes += bytes_read;
                                         }
                                         println!("[PROXY] Finished sending stream. Total bytes: {} | Time: {}ms", total_bytes, write_start.elapsed().as_millis());
                                     }
                                     return;
                                }
                            } else if let Some(pos) = path_and_query.find("path=") {
                                let encoded_path = &path_and_query[pos + 5..];
                                let decoded_str = match urlencoding::decode(encoded_path) {
                                    Ok(d) => d.into_owned(),
                                    Err(_) => encoded_path.to_string(),
                                };
                                let file_path = std::path::Path::new(&decoded_str);
                                let is_audio_ext = file_path.extension()
                                    .and_then(|ext| ext.to_str())
                                    .map(|ext| {
                                        let ext_lower = ext.to_lowercase();
                                        ext_lower == "mp3" || ext_lower == "wav" || ext_lower == "ogg" ||
                                        ext_lower == "m4a" || ext_lower == "flac" || ext_lower == "aac"
                                    })
                                    .unwrap_or(false);
                                let is_allowed = file_path.exists() && file_path.is_file() && (
                                    file_path.starts_with(&capi_dir) ||
                                    is_audio_ext
                                );
                                if is_allowed {
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
    let binary_name = if cfg!(target_os = "windows") { "capi-core.exe" } else { "capi-core" };

    // 1. Check development/absolute workspace path first
    #[cfg(target_os = "linux")]
    {
        let dev_path = std::path::Path::new("/home/emixdy/Documentos/Capi/capi-desktop/bin/capi-core");
        if dev_path.exists() {
            return Ok(dev_path.to_path_buf());
        }
    }

    // 2. Check compiled bundle resources
    if let Ok(dir) = app.path().resource_dir() {
        let path = dir.join("_up_").join("bin").join(binary_name);
        if path.exists() {
            return Ok(path);
        }
        let path = dir.join("bin").join(binary_name);
        if path.exists() {
            return Ok(path);
        }
        let path = dir.join("_up_").join(binary_name);
        if path.exists() {
            return Ok(path);
        }
        let path_flat = dir.join(binary_name);
        if path_flat.exists() {
            return Ok(path_flat);
        }
    }

    // 3. Check adjacent to current running binary directory
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let path = parent.join("_up_").join("bin").join(binary_name);
            if path.exists() {
                return Ok(path);
            }
            let path = parent.join("bin").join(binary_name);
            if path.exists() {
                return Ok(path);
            }
            let path = parent.join("_up_").join(binary_name);
            if path.exists() {
                return Ok(path);
            }
            let path_flat = parent.join(binary_name);
            if path_flat.exists() {
                return Ok(path_flat);
            }
        }
    }

    // 4. Default build fallback
    app.path()
        .resource_dir()
        .map_err(|e| e.to_string())
        .map(|dir| dir.join("_up_").join("bin").join(binary_name))
}

use std::process::{ChildStdin, ChildStdout, Stdio};
use std::io::{BufRead, BufReader};
use std::sync::Mutex;
use std::sync::Arc;

struct DaemonProcess {
    stdin: Mutex<ChildStdin>,
    stdout: Mutex<BufReader<ChildStdout>>,
}

async fn send_daemon_command(
    daemon: Arc<DaemonProcess>,
    child: Arc<Mutex<std::process::Child>>,
    command: String,
) -> Result<String, String> {
    let timeout_dur = std::time::Duration::from_secs(25);

    let result = tokio::time::timeout(
        timeout_dur,
        tokio::task::spawn_blocking(move || {
            let start = std::time::Instant::now();
            let mut stdin = daemon.stdin.lock().map_err(|e| e.to_string())?;
            let mut stdout = daemon.stdout.lock().map_err(|e| e.to_string())?;
            writeln!(stdin, "{}", command).map_err(|e| e.to_string())?;
            stdin.flush().map_err(|e| e.to_string())?;
            let mut response = String::new();
            stdout.read_line(&mut response).map_err(|e| e.to_string())?;
            println!("[DAEMON] cmd took: {}ms | cmd: {}", start.elapsed().as_millis(), &command[..std::cmp::min(60, command.len())]);
            Ok::<String, String>(response.trim().to_string())
        }),
    ).await;

    match result {
        Ok(Ok(Ok(resp))) => Ok(resp),
        Ok(Ok(Err(e))) => Err(e),
        Ok(Err(join_err)) => Err(format!("Daemon thread error: {}", join_err)),
        Err(_elapsed) => {
            // Timeout — kill daemon to unblock the stuck thread
            if let Ok(mut guard) = child.lock() {
                let _ = guard.kill();
                let _ = guard.wait();
            }
            // Small pause so the blocking thread detects the broken pipe
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            Err("El daemon dejó de responder".to_string())
        }
    }
}

fn spawn_daemon_process(binary: &PathBuf) -> Result<(DaemonProcess, std::process::Child), String> {
    let mut cmd = Command::new(binary);
    cmd.arg("--daemon")
       .stdin(Stdio::piped())
       .stdout(Stdio::piped())
       .stderr(Stdio::inherit());

    let mut child = cmd.spawn()
        .map_err(|e| format!("Fallo al iniciar capi-core daemon: {}", e))?;

    let stdin = child.stdin.take().unwrap();
    let mut stdout = BufReader::new(child.stdout.take().unwrap());

    // Wait for {"status":"ready"}
    let mut ready_line = String::new();
    stdout.read_line(&mut ready_line).map_err(|e| format!("Daemon startup read failed: {}", e))?;
    if !ready_line.contains("ready") {
        return Err(format!("Daemon initialization failed: {}", ready_line));
    }

    Ok((DaemonProcess {
        stdin: Mutex::new(stdin),
        stdout: Mutex::new(stdout),
    }, child))
}

fn restart_daemon(app: &tauri::AppHandle) -> Result<(), String> {
    let binary = get_binary_path(app)?;
    let (daemon, child) = spawn_daemon_process(&binary)?;
    app.manage(Arc::new(daemon));
    app.manage(Arc::new(Mutex::new(child)));
    println!("[DAEMON] Restarted successfully");
    Ok(())
}

#[tauri::command]
async fn buscar_cancion(app: tauri::AppHandle, daemon: tauri::State<'_, Arc<DaemonProcess>>, child: tauri::State<'_, Arc<Mutex<std::process::Child>>>, query: String) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "search",
        "query": query
    }).to_string();
    let result = send_daemon_command(daemon.inner().clone(), child.inner().clone(), cmd).await;
    if let Err(ref e) = result {
        if e == "El daemon dejó de responder" {
            restart_daemon(&app)?;
            let new_daemon = app.state::<Arc<DaemonProcess>>();
            let new_child = app.state::<Arc<Mutex<std::process::Child>>>();
            let cmd2 = serde_json::json!({
                "action": "search",
                "query": query
            }).to_string();
            return send_daemon_command(new_daemon.inner().clone(), new_child.inner().clone(), cmd2).await;
        }
    }
    result
}

#[tauri::command]
async fn obtener_stream(app: tauri::AppHandle, daemon: tauri::State<'_, Arc<DaemonProcess>>, child: tauri::State<'_, Arc<Mutex<std::process::Child>>>, id: String) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "get-stream",
        "id": id
    }).to_string();
    let result = send_daemon_command(daemon.inner().clone(), child.inner().clone(), cmd).await;
    if let Err(ref e) = result {
        if e == "El daemon dejó de responder" {
            restart_daemon(&app)?;
            let new_daemon = app.state::<Arc<DaemonProcess>>();
            let new_child = app.state::<Arc<Mutex<std::process::Child>>>();
            let cmd2 = serde_json::json!({
                "action": "get-stream",
                "id": id
            }).to_string();
            return send_daemon_command(new_daemon.inner().clone(), new_child.inner().clone(), cmd2).await;
        }
    }
    result
}

#[tauri::command]
async fn obtener_playlist(app: tauri::AppHandle, daemon: tauri::State<'_, Arc<DaemonProcess>>, child: tauri::State<'_, Arc<Mutex<std::process::Child>>>, id: String) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "get-playlist",
        "id": id
    }).to_string();
    let result = send_daemon_command(daemon.inner().clone(), child.inner().clone(), cmd).await;
    if let Err(ref e) = result {
        if e == "El daemon dejó de responder" {
            restart_daemon(&app)?;
            let new_daemon = app.state::<Arc<DaemonProcess>>();
            let new_child = app.state::<Arc<Mutex<std::process::Child>>>();
            let cmd2 = serde_json::json!({
                "action": "get-playlist",
                "id": id
            }).to_string();
            return send_daemon_command(new_daemon.inner().clone(), new_child.inner().clone(), cmd2).await;
        }
    }
    result
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
    
    let capi_dir = music_dir.join("Capi");
    if !capi_dir.exists() {
        std::fs::create_dir_all(&capi_dir)
            .map_err(|e| format!("No se pudo crear el directorio de Capi: {}", e))?;
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
    let dest_path = capi_dir.join(&filename);

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .connect_timeout(std::time::Duration::from_secs(8))
        .timeout(std::time::Duration::from_secs(30))
        .pool_idle_timeout(std::time::Duration::from_secs(20))
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
        .connect_timeout(std::time::Duration::from_secs(8))
        .timeout(std::time::Duration::from_secs(30))
        .pool_idle_timeout(std::time::Duration::from_secs(20))
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
async fn obtener_home(app: tauri::AppHandle, daemon: tauri::State<'_, Arc<DaemonProcess>>, child: tauri::State<'_, Arc<Mutex<std::process::Child>>>, continuation: Option<String>) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "home",
        "continuation": continuation
    }).to_string();
    let result = send_daemon_command(daemon.inner().clone(), child.inner().clone(), cmd).await;
    if let Err(ref e) = result {
        if e == "El daemon dejó de responder" {
            restart_daemon(&app)?;
            let new_daemon = app.state::<Arc<DaemonProcess>>();
            let new_child = app.state::<Arc<Mutex<std::process::Child>>>();
            let cmd2 = serde_json::json!({
                "action": "home",
                "continuation": continuation
            }).to_string();
            return send_daemon_command(new_daemon.inner().clone(), new_child.inner().clone(), cmd2).await;
        }
    }
    result
}

#[tauri::command]
async fn obtener_artista(app: tauri::AppHandle, daemon: tauri::State<'_, Arc<DaemonProcess>>, child: tauri::State<'_, Arc<Mutex<std::process::Child>>>, id: String) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "artist",
        "id": id
    }).to_string();
    let result = send_daemon_command(daemon.inner().clone(), child.inner().clone(), cmd).await;
    if let Err(ref e) = result {
        if e == "El daemon dejó de responder" {
            restart_daemon(&app)?;
            let new_daemon = app.state::<Arc<DaemonProcess>>();
            let new_child = app.state::<Arc<Mutex<std::process::Child>>>();
            let cmd2 = serde_json::json!({
                "action": "artist",
                "id": id
            }).to_string();
            return send_daemon_command(new_daemon.inner().clone(), new_child.inner().clone(), cmd2).await;
        }
    }
    result
}

#[tauri::command]
async fn obtener_explorar(app: tauri::AppHandle, daemon: tauri::State<'_, Arc<DaemonProcess>>, child: tauri::State<'_, Arc<Mutex<std::process::Child>>>,) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "explore"
    }).to_string();
    let result = send_daemon_command(daemon.inner().clone(), child.inner().clone(), cmd).await;
    if let Err(ref e) = result {
        if e == "El daemon dejó de responder" {
            restart_daemon(&app)?;
            let new_daemon = app.state::<Arc<DaemonProcess>>();
            let new_child = app.state::<Arc<Mutex<std::process::Child>>>();
            let cmd2 = serde_json::json!({
                "action": "explore"
            }).to_string();
            return send_daemon_command(new_daemon.inner().clone(), new_child.inner().clone(), cmd2).await;
        }
    }
    result
}

#[tauri::command]
async fn obtener_letras(app: tauri::AppHandle, daemon: tauri::State<'_, Arc<DaemonProcess>>, child: tauri::State<'_, Arc<Mutex<std::process::Child>>>, artist: String, title: String, duration: i32) -> Result<String, String> {
    let cmd = serde_json::json!({
        "action": "lyrics",
        "artist": artist,
        "title": title,
        "duration": duration
    }).to_string();
    let result = send_daemon_command(daemon.inner().clone(), child.inner().clone(), cmd).await;
    if let Err(ref e) = result {
        if e == "El daemon dejó de responder" {
            restart_daemon(&app)?;
            let new_daemon = app.state::<Arc<DaemonProcess>>();
            let new_child = app.state::<Arc<Mutex<std::process::Child>>>();
            let cmd2 = serde_json::json!({
                "action": "lyrics",
                "artist": artist,
                "title": title,
                "duration": duration
            }).to_string();
            return send_daemon_command(new_daemon.inner().clone(), new_child.inner().clone(), cmd2).await;
        }
    }
    result
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

#[tauri::command]
async fn discord_connect(state: tauri::State<'_, DiscordState>) -> Result<bool, String> {
    let mut client_guard = state.client.lock().map_err(|e| e.to_string())?;
    if client_guard.is_some() {
        return Ok(true);
    }
    let mut client = DiscordIpcClient::new("1249392288333889638").map_err(|e| e.to_string())?;
    client.connect().map_err(|e| format!("Discord no está abierto: {}", e))?;
    *client_guard = Some(client);
    Ok(true)
}

#[tauri::command]
async fn discord_update(
    state: tauri::State<'_, DiscordState>,
    title: String,
    artist: String,
    thumbnail: String,
    elapsed: i64,
    duration: i64,
    is_playing: bool,
) -> Result<(), String> {
    let mut client_guard = state.client.lock().map_err(|e| e.to_string())?;
    if let Some(client) = client_guard.as_mut() {
        if !is_playing {
            let _ = client.clear_activity();
            return Ok(());
        }

        let mut assets = activity::Assets::new()
            .large_text(&title);
        
        if !thumbnail.is_empty() {
            assets = assets.large_image(&thumbnail);
        } else {
            assets = assets.large_image("logo");
        }

        let mut act = activity::Activity::new()
            .state(&artist)
            .details(&title)
            .assets(assets);

        if duration > 0 {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            let start = now - elapsed;
            let end = start + duration;
            let timestamps = activity::Timestamps::new()
                .start(start)
                .end(end);
            act = act.timestamps(timestamps);
        }

        let _ = client.set_activity(act);
    }
    Ok(())
}

#[tauri::command]
async fn discord_disconnect(state: tauri::State<'_, DiscordState>) -> Result<(), String> {
    let mut client_guard = state.client.lock().map_err(|e| e.to_string())?;
    if let Some(mut client) = client_guard.take() {
        let _ = client.clear_activity();
        let _ = client.close();
    }
    Ok(())
}


#[derive(serde::Serialize, Debug)]
struct LocalTrack {
    id: String,
    title: String,
    artist: String,
    thumbnail: String,
    duration: u32,
}

#[tauri::command]
fn seleccionar_carpeta() -> Option<String> {
    let result = rfd::FileDialog::new()
        .pick_folder();
    result.map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn listar_archivos_locales(ruta: String) -> Result<Vec<LocalTrack>, String> {
    let dir_path = std::path::Path::new(&ruta);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err("La ruta no existe o no es un directorio".to_string());
    }

    let mut tracks = Vec::new();
    let entries = std::fs::read_dir(dir_path).map_err(|e| e.to_string())?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if ext_lower == "mp3" || ext_lower == "wav" || ext_lower == "m4a" || 
                       ext_lower == "ogg" || ext_lower == "flac" || ext_lower == "aac" {
                        
                        let file_name = path.file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Audio Local")
                            .to_string();
                        
                        let title = path.file_stem()
                            .and_then(|n| n.to_str())
                            .unwrap_or(&file_name)
                            .to_string();

                        let path_str = path.to_string_lossy().into_owned();
                        let id = format!("local://{}", path_str);

                        tracks.push(LocalTrack {
                            id,
                            title,
                            artist: "Archivo Local".to_string(),
                            thumbnail: "".to_string(),
                            duration: 0,
                        });
                    }
                }
            }
        }
    }

    Ok(tracks)
}

#[tauri::command]
async fn abrir_carpeta_descargas(app: tauri::AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("Capi");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    open::that(&dir).map_err(|e| format!("No se pudo abrir: {}", e))
}

// ─── Audio Cache System ─────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
struct CacheEntry {
    path: String,
    cached_at: u64,
    size_bytes: u64,
    title: String,
    artist: String,
    thumbnail: String,
}

#[derive(Serialize, Deserialize)]
struct CacheMetadata {
    tracks: HashMap<String, CacheEntry>,
}

#[derive(Serialize)]
struct CacheStats {
    used_bytes: u64,
    max_bytes: u64,
    file_count: usize,
    oldest_entry: u64,
}

impl CacheMetadata {
    fn load(path: &PathBuf) -> Self {
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(path) {
                if let Ok(meta) = serde_json::from_str::<CacheMetadata>(&content) {
                    return meta;
                }
            }
        }
        CacheMetadata { tracks: HashMap::new() }
    }

    fn save(&self, path: &PathBuf) {
        if let Ok(content) = serde_json::to_string_pretty(self) {
            let _ = std::fs::write(path, content);
        }
    }
}

fn get_cache_dirs(app: &tauri::AppHandle) -> Result<(PathBuf, PathBuf, PathBuf), String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let cache_dir = base.join("Capi").join("cache").join("audio");
    let meta_path = base.join("Capi").join("cache").join("cache_metadata.json");
    let config_path = base.join("Capi").join("cache_config.json");
    Ok((cache_dir, meta_path, config_path))
}

#[derive(Serialize, Deserialize)]
struct CacheConfig {
    max_bytes: u64,
    ttl_secs: u64,
}

impl Default for CacheConfig {
    fn default() -> Self {
        CacheConfig { max_bytes: 2_147_483_648, ttl_secs: 604_800 }
    }
}

fn load_cache_config(config_path: &PathBuf) -> CacheConfig {
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(config_path) {
            if let Ok(cfg) = serde_json::from_str::<CacheConfig>(&content) {
                return cfg;
            }
        }
    }
    CacheConfig::default()
}

#[tauri::command]
async fn get_cached_audio(app: tauri::AppHandle, track_id: String) -> Result<Option<String>, String> {
    let (_cache_dir, meta_path, config_path) = get_cache_dirs(&app)?;
    let config = load_cache_config(&config_path);
    let metadata = CacheMetadata::load(&meta_path);

    if let Some(entry) = metadata.tracks.get(&track_id) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let age = now.saturating_sub(entry.cached_at);
        let path = std::path::Path::new(&entry.path);

        if age <= config.ttl_secs && path.exists() {
            Ok(Some(entry.path.clone()))
        } else {
            if path.exists() {
                let _ = std::fs::remove_file(path);
            }
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn cache_audio(app: tauri::AppHandle, track_id: String, url: String, title: String, artist: String, thumbnail: String) -> Result<String, String> {
    let (cache_dir, meta_path, config_path) = get_cache_dirs(&app)?;

    if !cache_dir.exists() {
        std::fs::create_dir_all(&cache_dir)
            .map_err(|e| format!("Error creando directorio de caché: {}", e))?;
    }

    let ext = if url.contains("mime=audio%2Fmp4") || url.contains("mime=audio/mp4") || url.contains("mime=audio%2Fm4a") {
        "m4a"
    } else {
        "webm"
    };

    let dest_path = cache_dir.join(format!("{}.{}", track_id, ext));
    if dest_path.exists() {
        let dest_str = dest_path.to_str().unwrap_or("").to_string();
        return Ok(dest_str);
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .connect_timeout(std::time::Duration::from_secs(8))
        .timeout(std::time::Duration::from_secs(30))
        .pool_idle_timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Error creando cliente HTTP: {}", e))?;

    let res = client.get(&url).send().await
        .map_err(|e| format!("Error en petición de caché: {}", e))?;

    let mut file = std::fs::File::create(&dest_path)
        .map_err(|e| format!("Error creando archivo de caché: {}", e))?;

    let mut stream = res.bytes_stream();
    let mut total_bytes: u64 = 0;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Error leyendo stream: {}", e))?;
        file.write_all(&chunk).map_err(|e| format!("Error escribiendo caché: {}", e))?;
        total_bytes += chunk.len() as u64;
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let mut metadata = CacheMetadata::load(&meta_path);
    metadata.tracks.insert(track_id.clone(), CacheEntry {
        path: dest_path.to_str().unwrap_or("").to_string(),
        cached_at: now,
        size_bytes: total_bytes,
        title,
        artist,
        thumbnail,
    });
    metadata.save(&meta_path);

    // Clean up if over limit
    let config = load_cache_config(&config_path);
    let total: u64 = metadata.tracks.values().map(|e| e.size_bytes).sum();
    if total > config.max_bytes {
        let _ = clean_audio_cache_internal(&cache_dir, &meta_path, config.max_bytes, config.ttl_secs);
    }

    let dest_str = dest_path.to_str().unwrap_or("").to_string();
    Ok(dest_str)
}

fn clean_audio_cache_internal(
    _cache_dir: &PathBuf,
    meta_path: &PathBuf,
    max_bytes: u64,
    ttl_secs: u64,
) -> Result<CacheStats, String> {
    let mut metadata = CacheMetadata::load(meta_path);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Remove expired entries
    let expired_ids: Vec<String> = metadata.tracks.iter()
        .filter(|(_, e)| now.saturating_sub(e.cached_at) > ttl_secs)
        .map(|(id, _)| id.clone())
        .collect();

    for id in &expired_ids {
        if let Some(entry) = metadata.tracks.get(id) {
            let path = std::path::Path::new(&entry.path);
            if path.exists() {
                let _ = std::fs::remove_file(path);
            }
        }
        metadata.tracks.remove(id);
    }

    // Remove oldest entries if over size limit
    if max_bytes > 0 {
        let mut total: u64 = metadata.tracks.values().map(|e| e.size_bytes).sum();
        let mut sorted: Vec<(String, u64)> = metadata.tracks.iter()
            .map(|(id, e)| (id.clone(), e.cached_at))
            .collect();
        sorted.sort_by_key(|(_, t)| *t);

        for (id, _) in &sorted {
            if total <= max_bytes { break; }
            if let Some(entry) = metadata.tracks.get(id) {
                total = total.saturating_sub(entry.size_bytes);
                let path = std::path::Path::new(&entry.path);
                if path.exists() {
                    let _ = std::fs::remove_file(path);
                }
            }
            metadata.tracks.remove(id);
        }
    }

    metadata.save(meta_path);

    let oldest = metadata.tracks.values()
        .map(|e| e.cached_at)
        .min()
        .unwrap_or(0);

    Ok(CacheStats {
        used_bytes: metadata.tracks.values().map(|e| e.size_bytes).sum(),
        max_bytes,
        file_count: metadata.tracks.len(),
        oldest_entry: oldest,
    })
}

#[tauri::command]
async fn clean_audio_cache(app: tauri::AppHandle) -> Result<CacheStats, String> {
    let (cache_dir, meta_path, config_path) = get_cache_dirs(&app)?;
    let config = load_cache_config(&config_path);
    clean_audio_cache_internal(&cache_dir, &meta_path, config.max_bytes, config.ttl_secs)
}

#[tauri::command]
async fn get_cache_stats(app: tauri::AppHandle) -> Result<CacheStats, String> {
    let (cache_dir, meta_path, config_path) = get_cache_dirs(&app)?;
    let config = load_cache_config(&config_path);
    let metadata = CacheMetadata::load(&meta_path);

    let oldest = metadata.tracks.values()
        .map(|e| e.cached_at)
        .min()
        .unwrap_or(0);

    // Also clean expired on stats fetch
    let _ = clean_audio_cache_internal(&cache_dir, &meta_path, config.max_bytes, config.ttl_secs);

    let metadata = CacheMetadata::load(&meta_path);
    Ok(CacheStats {
        used_bytes: metadata.tracks.values().map(|e| e.size_bytes).sum(),
        max_bytes: config.max_bytes,
        file_count: metadata.tracks.len(),
        oldest_entry: oldest,
    })
}

#[tauri::command]
async fn set_cache_config(app: tauri::AppHandle, max_bytes: u64, ttl_secs: u64) -> Result<(), String> {
    let (_, _, config_path) = get_cache_dirs(&app)?;
    let config = CacheConfig { max_bytes, ttl_secs };
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Error serializando config: {}", e))?;
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Error guardando config: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn list_cached_tracks(app: tauri::AppHandle) -> Result<HashMap<String, CacheEntry>, String> {
    let (_, meta_path, _) = get_cache_dirs(&app)?;
    let metadata = CacheMetadata::load(&meta_path);
    Ok(metadata.tracks)
}

#[tauri::command]
async fn remove_cached_track(app: tauri::AppHandle, track_id: String) -> Result<(), String> {
    let (_cache_dir, meta_path, _) = get_cache_dirs(&app)?;
    let mut metadata = CacheMetadata::load(&meta_path);
    if let Some(entry) = metadata.tracks.remove(&track_id) {
        let _ = std::fs::remove_file(&entry.path);
        // Also try to clean any matching webm/m4a
        for ext in &["webm", "m4a"] {
            let alt = entry.path.replace(".webm", &format!(".{}", ext)).replace(".m4a", &format!(".{}", ext));
            if alt != entry.path {
                let _ = std::fs::remove_file(&alt);
            }
        }
        metadata.save(&meta_path);
    }
    Ok(())
}

#[derive(Serialize)]
struct StorageInfo {
    app_size: u64,
    downloads_size: u64,
    cache_size: u64,
    free_space: u64,
}

fn dir_size(path: &PathBuf) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                total += dir_size(&p);
            } else if let Ok(meta) = p.metadata() {
                total += meta.len();
            }
        }
    }
    total
}

#[tauri::command]
fn obtener_espacio_almacenamiento(app: tauri::AppHandle) -> Result<StorageInfo, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let capi_dir = app_data.join("Capi");
    let cache_dir = capi_dir.join("cache");

    let downloads_size = if capi_dir.exists() {
        let mut total = dir_size(&capi_dir);
        if cache_dir.exists() {
            total -= dir_size(&cache_dir);
        }
        total
    } else {
        0
    };

    let cache_size = if cache_dir.exists() {
        dir_size(&cache_dir)
    } else {
        0
    };

    let app_size = std::env::current_exe()
        .ok()
        .and_then(|p| p.metadata().ok())
        .map(|m| m.len())
        .unwrap_or(0);

    let free_space = Some(capi_dir.parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("/")))
        .and_then(|p| fs2::available_space(&p).ok())
        .unwrap_or(0);

    Ok(StorageInfo { app_size, downloads_size, cache_size, free_space })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            let handle = app.handle();

            let binary = get_binary_path(handle)?;
            let (daemon_process, child) = spawn_daemon_process(&binary)?;

            app.manage(Arc::new(daemon_process));
            app.manage(Arc::new(Mutex::new(child)));

            // Start localhost HTTP server for local music playback
            let app_data = handle.path().app_data_dir()
                .map_err(|e| format!("No se pudo resolver el directorio de datos: {}", e))?;
            let capi_dir = app_data.join("Capi");
            if !capi_dir.exists() {
                std::fs::create_dir_all(&capi_dir)
                    .map_err(|e| format!("No se pudo crear el directorio de Capi: {}", e))?;
            }
            // Create cache directory
            let cache_dir = capi_dir.join("cache").join("audio");
            if !cache_dir.exists() {
                std::fs::create_dir_all(&cache_dir)
                    .map_err(|e| format!("No se pudo crear el directorio de caché: {}", e))?;
            }
            let local_port = start_local_server(capi_dir);
            app.manage(LocalServerState { port: local_port });
            app.manage(DiscordState { client: Mutex::new(None) });

            // ─── System Tray ────────────────────────────────────────
            if let Some(icon) = handle.default_window_icon() {
                if let Ok(show) = MenuItem::with_id(handle, "show", "Mostrar ventana", true, None::<&str>) {
                    if let Ok(new_window) = MenuItem::with_id(handle, "new-window", "Abrir otra ventana", true, None::<&str>) {
                    if let Ok(quit) = MenuItem::with_id(handle, "quit", "Salir", true, None::<&str>) {
                        if let Ok(menu) = Menu::with_items(handle, &[&show, &new_window, &quit]) {
                            let _ = TrayIconBuilder::new()
                                .icon(icon.clone())
                                .tooltip("Capi")
                                .menu(&menu)
                                .on_menu_event(|handle, event| {
                                    match event.id.as_ref() {
                                        "show" => {
                                            if let Some(window) = handle.get_webview_window("main") {
                                                let _ = window.show();
                                                let _ = window.set_focus();
                                            }
                                        }
                                        "new-window" => {
                                            let _ = WebviewWindowBuilder::new(
                                                handle,
                                                format!("main-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos()),
                                                tauri::WebviewUrl::App("index.html".into()),
                                            )
                                            .title("Capi")
                                            .inner_size(1000.0, 700.0)
                                            .build();
                                        }
                                        "quit" => handle.exit(0),
                                        _ => {}
                                    }
                                })
                                .on_tray_icon_event(|tray, event| {
                                    if let TrayIconEvent::Click {
                                        button: MouseButton::Left,
                                        button_state: MouseButtonState::Up,
                                        ..
                                    } = event {
                                        let handle = tray.app_handle();
                                        if let Some(window) = handle.get_webview_window("main") {
                                            if window.is_visible().unwrap_or(false) {
                                                let _ = window.hide();
                                            } else {
                                                let _ = window.show();
                                                let _ = window.set_focus();
                                            }
                                        }
                                    }
                                })
                                .build(handle);
                        }
                    }
                    }
                }
            }

            // ─── Start hidden (autostart) ──────────────────────────
            let args: Vec<String> = std::env::args().collect();
            if args.contains(&"--hidden".to_string()) {
                if let Some(window) = handle.get_webview_window("main") {
                    window.hide()?;
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            buscar_cancion,
            obtener_stream,
            obtener_playlist,
            descargar_cancion,
            borrar_cancion,
            obtener_home,
            obtener_artista,
            obtener_explorar,
            obtener_letras,
            obtener_sugerencias,
            obtener_local_port,
            discord_connect,
            discord_update,
            discord_disconnect,
            seleccionar_carpeta,
            listar_archivos_locales,
            abrir_carpeta_descargas,
            get_cached_audio,
            cache_audio,
            clean_audio_cache,
            get_cache_stats,
            set_cache_config,
            list_cached_tracks,
            remove_cached_track,
            obtener_espacio_almacenamiento
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
