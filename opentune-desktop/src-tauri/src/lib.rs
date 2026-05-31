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

/// En dev mode: usa CARGO_MANIFEST_DIR (src-tauri/) -> ../bin/opentune-core
/// En producción: usa resource_dir() que incluye el binario bundleado
fn get_binary_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if cfg!(dev) {
        // CARGO_MANIFEST_DIR = .../opentune-desktop/src-tauri (en compile time)
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let path = manifest_dir
            .parent()
            .ok_or_else(|| "No se pudo encontrar el directorio padre de src-tauri".to_string())?
            .join("bin")
            .join("opentune-core");
        Ok(path)
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())
            .map(|dir| dir.join("bin").join("opentune-core"))
    }
}

#[tauri::command]
async fn buscar_cancion(app: tauri::AppHandle, query: String) -> Result<String, String> {
    let binary = get_binary_path(&app)?;

    eprintln!("[opentune] buscar_cancion → binary: {:?}", binary);

    let output = tauri::async_runtime::spawn_blocking(move || {
        Command::new(&binary)
            .arg("--search")
            .arg(&query)
            .output()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("Error ejecutando binario: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        eprintln!("[opentune] stderr: {}", stderr);
        Err(stderr)
    }
}

#[tauri::command]
async fn obtener_stream(app: tauri::AppHandle, id: String) -> Result<String, String> {
    let binary = get_binary_path(&app)?;

    eprintln!("[opentune] obtener_stream → id: {}, binary: {:?}", id, binary);

    let output = tauri::async_runtime::spawn_blocking(move || {
        Command::new(&binary)
            .arg("--get-stream")
            .arg(&id)
            .output()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("Error ejecutando binario: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        eprintln!("[opentune] stderr: {}", stderr);
        Err(stderr)
    }
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
        .audio_dir()
        .map_err(|e| format!("No se pudo resolver el directorio de audio: {}", e))?;
    
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

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Error en la petición de descarga: {}", e))?;

    let total_size = res
        .content_length()
        .ok_or_else(|| "No se pudo obtener el tamaño total de la canción".to_string())?;

    let mut file = std::fs::File::create(&dest_path)
        .map_err(|e| format!("No se pudo crear el archivo local: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Error descargando chunk: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Error escribiendo bytes en el disco: {}", e))?;
        
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

    let absolute_path = dest_path
        .to_str()
        .ok_or_else(|| "Error convirtiendo la ruta final a texto".to_string())?
        .to_string();

    Ok(absolute_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            buscar_cancion,
            obtener_stream,
            descargar_cancion
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
