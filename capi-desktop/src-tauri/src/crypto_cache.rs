use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptCache {
    pub js_url: String,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
    pub signature_timestamp: u32,
    pub decipher_operations: String,
    pub cached_at_ms: u64,
}

pub struct CryptoCacheManager {
    cache_path: PathBuf,
}

impl CryptoCacheManager {
    /// Inicializa el manejador de caché asegurando la existencia del directorio.
    pub fn new(app_data_dir: PathBuf) -> Self {
        if let Err(e) = fs::create_dir_all(&app_data_dir) {
            eprintln!("[CryptoCache] Advertencia creando app_data_dir: {}", e);
        }
        
        Self {
            cache_path: app_data_dir.join("crypto_cache.json"),
        }
    }

    /// Carga la caché local de descifrado desde el disco.
    pub fn load_local(&self) -> Option<DecryptCache> {
        if !self.cache_path.exists() {
            return None;
        }
        let content = fs::read_to_string(&self.cache_path).ok()?;
        serde_json::from_str(&content).ok()
    }

    /// Guarda la caché local de descifrado en el disco.
    pub fn save(&self, cache: &DecryptCache) -> Result<(), String> {
        let content = serde_json::to_string_pretty(cache)
            .map_err(|e| format!("Error serializando la caché: {}", e))?;
        fs::write(&self.cache_path, content)
            .map_err(|e| format!("Error escribiendo archivo de caché: {}", e))?;
        Ok(())
    }

    /// Obtiene el timestamp actual del sistema en milisegundos (Función estática utilitaria).
    pub fn current_time_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64
    }
}
