use std::sync::Arc;
use tokio::sync::RwLock;
use serde::Serialize;
use reqwest::header::{IF_NONE_MATCH, IF_MODIFIED_SINCE, ETAG, LAST_MODIFIED};
use tauri::Manager;

use crate::crypto_cache::{CryptoCacheManager, DecryptCache};
use crate::po_token::{PoTokenPool, start_refill_worker};

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
pub enum PipelineStatus {
    Uninitialized,
    FetchingRemote,
    Ready,
    Degraded,
}

pub struct PipelineState {
    pub status: Arc<RwLock<PipelineStatus>>,
    pub token_pool: Arc<PoTokenPool>,
    pub current_decrypt_cache: Arc<RwLock<Option<DecryptCache>>>,
    pub last_stream_req_ms: Arc<std::sync::atomic::AtomicU64>,
}

impl PipelineState {
    pub fn new(max_tokens: usize) -> Self {
        Self {
            status: Arc::new(RwLock::new(PipelineStatus::Uninitialized)),
            token_pool: Arc::new(PoTokenPool::new(max_tokens)),
            current_decrypt_cache: Arc::new(RwLock::new(None)),
            last_stream_req_ms: Arc::new(std::sync::atomic::AtomicU64::new(0)),
        }
    }
}

/// Inicializa el pipeline en segundo plano de forma segura sin provocar deadlocks.
pub fn init_background_pipeline(app: &tauri::AppHandle, state: &PipelineState) {
    let app_handle = app.clone();
    let status_lock = state.status.clone();
    let token_pool = state.token_pool.clone();
    let cache_lock = state.current_decrypt_cache.clone();

    // 1. Obtener la ruta de datos de manera segura para Tauri v2
    let app_data_dir = app_handle.path().app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("./"));
    
    let cache_manager = Arc::new(CryptoCacheManager::new(app_data_dir));
    let local_cache = cache_manager.load_local();
    let has_local_cache = local_cache.is_some();

    // Encolar la inicialización en memoria de manera asíncrona para evitar blocking_write deadlocks
    let local_cache_clone = local_cache.clone();
    let cache_lock_init = cache_lock.clone();
    let status_lock_init = status_lock.clone();
    
    tauri::async_runtime::spawn(async move {
        if let Some(cache) = local_cache_clone {
            println!("[BG Pipeline] Caché local encontrada (STS: {}). Cargando en memoria...", cache.signature_timestamp);
            *cache_lock_init.write().await = Some(cache);
            *status_lock_init.write().await = PipelineStatus::Ready; // Ready provisional
        } else {
            println!("[BG Pipeline] No se encontró caché local. Buscando en remoto...");
            *status_lock_init.write().await = PipelineStatus::FetchingRemote;
        }
    });

    // 2. Disparar el pool de PO Tokens en background
    println!("[BG Pipeline] Inicializando pool de PO Tokens...");
    start_refill_worker(token_pool, app_handle.clone());

    // 3. Lanzar validación/actualización de base.js remota de forma asíncrona
    let cache_manager_clone = cache_manager.clone();
    tauri::async_runtime::spawn(async move {
        println!("[BG Pipeline Task] Iniciando verificación de base.js remoto...");
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_default();

        let yt_player_url = get_current_player_url(&client).await;

        // Obtener metadatos actuales de la caché para peticiones condicionales
        let (cached_etag, cached_last_modified) = {
            let cache_read = cache_lock.read().await;
            if let Some(ref c) = *cache_read {
                (c.etag.clone(), c.last_modified.clone())
            } else {
                (None, None)
            }
        };

        // Construir petición HEAD ligera para verificar cambios
        let mut head_req = client.head(&yt_player_url);
        if let Some(ref etag) = cached_etag {
            head_req = head_req.header(IF_NONE_MATCH, etag);
        }
        if let Some(ref lm) = cached_last_modified {
            head_req = head_req.header(IF_MODIFIED_SINCE, lm);
        }

        let mut needs_download = true;
        let mut response_etag = None;
        let mut response_last_modified = None;

        match head_req.send().await {
            Ok(resp) => {
                if resp.status() == reqwest::StatusCode::NOT_MODIFIED {
                    println!("[BG Pipeline Task] El archivo base.js no ha cambiado (304 Not Modified). Usando caché existente.");
                    needs_download = false;
                } else if resp.status().is_success() {
                    response_etag = resp.headers().get(ETAG).and_then(|h| h.to_str().ok()).map(|s| s.to_string());
                    response_last_modified = resp.headers().get(LAST_MODIFIED).and_then(|h| h.to_str().ok()).map(|s| s.to_string());
                }
            }
            Err(e) => {
                eprintln!("[BG Pipeline Task] Error en petición de red HEAD: {}", e);
                if has_local_cache {
                    *status_lock.write().await = PipelineStatus::Degraded;
                    println!("[BG Pipeline Task] Entrando en modo Degradado usando la caché local.");
                }
                return;
            }
        }

        if needs_download {
            println!("[BG Pipeline Task] Descargando base.js remoto desde {}...", yt_player_url);
            match client.get(&yt_player_url).send().await {
                Ok(resp) => {
                    if let Ok(js_content) = resp.text().await {
                        let sig_ts = extract_signature_timestamp(&js_content).unwrap_or(0);
                        
                        if sig_ts > 0 {
                            println!("[BG Pipeline Task] Extraído signature_timestamp remoto: {}", sig_ts);
                            let new_cache = DecryptCache {
                                js_url: yt_player_url.clone(),
                                etag: response_etag,
                                last_modified: response_last_modified,
                                signature_timestamp: sig_ts,
                                decipher_operations: "{}".to_string(),
                                cached_at_ms: CryptoCacheManager::current_time_ms(),
                            };

                            // Guardar en disco
                            if let Err(e) = cache_manager_clone.save(&new_cache) {
                                eprintln!("[BG Pipeline Task] Error persistiendo la caché: {}", e);
                            }

                            // Actualizar en memoria y pasar a Ready
                            *cache_lock.write().await = Some(new_cache);
                            *status_lock.write().await = PipelineStatus::Ready;
                            println!("[BG Pipeline Task] Pipeline actualizado a Ready con éxito.");
                        } else {
                            eprintln!("[BG Pipeline Task] No se pudo extraer el signature timestamp del JS remoto.");
                            if has_local_cache {
                                *status_lock.write().await = PipelineStatus::Degraded;
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[BG Pipeline Task] Falló la descarga de base.js: {}", e);
                    if has_local_cache {
                        *status_lock.write().await = PipelineStatus::Degraded;
                    }
                }
            }
        } else {
            // El archivo no cambió, asegurar estado Ready
            *status_lock.write().await = PipelineStatus::Ready;
        }
    });
}

/// Helper ligero usando patrones simples para buscar el signatureTimestamp/sts en base.js
fn extract_signature_timestamp(js: &str) -> Option<u32> {
    if let Some(pos) = js.find("signatureTimestamp:") {
        let start = pos + "signatureTimestamp:".len();
        let end = js[start..].find(|c: char| !c.is_numeric()).unwrap_or(0);
        if end > 0 {
            return js[start..start + end].parse::<u32>().ok();
        }
    }
    if let Some(pos) = js.find("sts:") {
        let start = pos + "sts:".len();
        let end = js[start..].find(|c: char| !c.is_numeric()).unwrap_or(0);
        if end > 0 {
            return js[start..start + end].parse::<u32>().ok();
        }
    }
    None
}

/// Obtiene dinámicamente la URL actual de base.js desde la página de embed de YouTube.
async fn get_current_player_url(client: &reqwest::Client) -> String {
    let embed_url = "https://www.youtube.com/embed/lYBUbBu4W08";
    if let Ok(resp) = client.get(embed_url).send().await {
        if let Ok(html) = resp.text().await {
            if let Some(pos) = html.find("/s/player/") {
                let start = pos;
                if let Some(end) = html[start..].find(".js") {
                    let path = &html[start..start + end + 3];
                    let absolute_url = format!("https://www.youtube.com{}", path);
                    println!("[BG Pipeline Task] URL de base.js detectada dinámicamente: {}", absolute_url);
                    return absolute_url;
                }
            }
        }
    }
    // Fallback de emergencia
    "https://www.youtube.com/s/player/4f38b487/player_embed.vflset/es_MX/base.js".to_string()
}

