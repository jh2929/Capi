use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

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

    // Diagnóstico: loguear ruta del binario
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![buscar_cancion, obtener_stream])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
