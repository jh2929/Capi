use std::collections::VecDeque;
use std::process::{Command, Stdio};
use std::sync::Arc;
use tokio::sync::{Mutex, Notify};
use tauri::Manager;
use crate::crypto_cache::CryptoCacheManager; // Reutilizamos el helper del tiempo

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PoTokenPair {
    pub po_token: String,
    pub visitor_data: String,
    pub generated_at_ms: u64,
}

pub struct PoTokenPool {
    pool: Arc<Mutex<VecDeque<PoTokenPair>>>,
    max_size: usize,
    refill_trigger: Arc<Notify>,
}

impl PoTokenPool {
    pub fn new(max_size: usize) -> Self {
        Self {
            pool: Arc::new(Mutex::new(VecDeque::with_capacity(max_size))),
            max_size,
            refill_trigger: Arc::new(Notify::new()),
        }
    }

    /// Obtiene de forma instantánea el primer token disponible de la cola.
    /// Notifica automáticamente al worker en background si se consume uno.
    pub async fn acquire_token(&self) -> Option<PoTokenPair> {
        let mut queue = self.pool.lock().await;
        let token = queue.pop_front();
        
        // Despertar al worker de inmediato para reponer la cola en background
        self.refill_trigger.notify_one();
        token
    }

    /// Inserta un token al final de la cola si no supera el tamaño máximo.
    pub async fn insert_token(&self, pair: PoTokenPair) {
        let mut queue = self.pool.lock().await;
        if queue.len() < self.max_size {
            queue.push_back(pair);
        }
    }

    /// Retorna el tamaño actual del pool.
    pub async fn len(&self) -> usize {
        self.pool.lock().await.len()
    }

    /// Retorna el trigger de recarga para ser consumido por el worker.
    pub fn get_trigger(&self) -> Arc<Notify> {
        self.refill_trigger.clone()
    }
}

/// Helper para obtener el path al binario del daemon `capi-core`.
fn get_binary_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let binary_name = if cfg!(target_os = "windows") { "capi-core.exe" } else { "capi-core" };

    // Intentar ruta de desarrollo local
    #[cfg(target_os = "linux")]
    {
        let dev_path = std::path::Path::new("/home/emixdy/Documentos/Capi/capi-desktop/bin/capi-core");
        if dev_path.exists() {
            return Ok(dev_path.to_path_buf());
        }
    }

    // Fallbacks dinámicos para producción
    if let Ok(dir) = app.path().resource_dir() {
        let path = dir.join("_up_").join("bin").join(binary_name);
        if path.exists() { return Ok(path); }
        let path = dir.join("bin").join(binary_name);
        if path.exists() { return Ok(path); }
        let path = dir.join("_up_").join(binary_name);
        if path.exists() { return Ok(path); }
        let path_flat = dir.join(binary_name);
        if path_flat.exists() { return Ok(path_flat); }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let path = parent.join("_up_").join("bin").join(binary_name);
            if path.exists() { return Ok(path); }
            let path = parent.join("bin").join(binary_name);
            if path.exists() { return Ok(path); }
            let path = parent.join("_up_").join(binary_name);
            if path.exists() { return Ok(path); }
            let path_flat = parent.join(binary_name);
            if path_flat.exists() { return Ok(path_flat); }
        }
    }

    app.path()
        .resource_dir()
        .map_err(|e| e.to_string())
        .map(|dir| dir.join("_up_").join("bin").join(binary_name))
}

/// Genera el token de forma nativa llamando a `capi-core --generate-only`.
fn generate_token_native(app: &tauri::AppHandle) -> Result<(String, String), String> {
    println!("[RUST PO POOL] Generando token nativo con capi-core...");
    let binary = get_binary_path(app)?;
    
    let output = Command::new(&binary)
        .arg("--generate-only")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .map_err(|e| format!("Error ejecutando capi-core: {}", e))?;

    if !output.status.success() {
        return Err(format!("capi-core falló con código {:?}", output.status.code()));
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout_str)
        .map_err(|e| format!("Error parseando salida de capi-core: {}", e))?;

    let po_token = json.get("poToken")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Falta poToken en la salida".to_string())?;

    let visitor_data = json.get("visitorData")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Falta visitorData en la salida".to_string())?;

    Ok((po_token.to_string(), visitor_data.to_string()))
}

/// Inicia el bucle en segundo plano para mantener la cola con tokens frescos.
pub fn start_refill_worker(pool: Arc<PoTokenPool>, app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let trigger = pool.get_trigger();
        loop {
            let current_len = pool.len().await;
            if current_len < pool.max_size {
                let app_handle = app.clone();
                
                // Procesamiento pesado aislado en un hilo de bloqueo nativo
                let token_res = tokio::task::spawn_blocking(move || {
                    generate_token_native(&app_handle).ok()
                }).await;

                match token_res {
                    Ok(Some((po_token, visitor_data))) => {
                        let pair = PoTokenPair {
                            po_token,
                            visitor_data,
                            generated_at_ms: CryptoCacheManager::current_time_ms(),
                        };

                        pool.insert_token(pair).await;
                        println!("[RUST PO POOL] Token inyectado con éxito. Inventario disponible: {}", pool.len().await);
                    }
                    _ => {
                        eprintln!("[RUST PO POOL] Fallo crítico de aprovisionamiento. Reintentando en 5s...");
                        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    }
                }
            } else {
                // Suspender hilo asíncronamente hasta que se consuma un token y nos despierten
                trigger.notified().await;
            }
        }
    });
}
