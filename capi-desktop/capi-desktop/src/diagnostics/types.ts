/**
 * Capa de observabilidad de Capi — Tipos centrales.
 *
 * Este módulo define el modelo de datos del sistema de diagnóstico:
 * etapas del pipeline, anomalías, eventos, sesiones y reportes.
 * No depende del reproductor ni de ninguna librería de UI.
 */

export type Severity = "info" | "warning" | "error" | "critical";

export type StageStatus = "running" | "completed" | "failed" | "skipped";

export interface StageInfo {
  /** Identificador único de la etapa (ej: "player_init"). */
  id: string;
  /** Nombre legible (ej: "Inicialización del reproductor"). */
  name: string;
  /** Descripción del comportamiento esperado de la etapa. */
  description: string;
  /** Tiempo máximo permitido antes de emitir un STAGE_TIMEOUT (ms). */
  timeoutMs: number;
  /** Umbral a partir del cual se emite un aviso STAGE_TOO_SLOW (ms). */
  slowMs?: number;
  /** Si la etapa puede omitirse legítimamente (ej: buffering instantáneo). */
  optional?: boolean;
  /** Mensaje específico de timeout (si no se provee, se genera uno genérico). */
  timeoutMessage?: string;
  /** Mensaje específico cuando la etapa queda sin terminar al cerrar la sesión. */
  neverFinishedMessage?: string;
  /** Sugerencia de causa para el timeout. */
  timeoutSuggestion?: string;
  /** Sugerencia de causa cuando la etapa nunca termina. */
  neverFinishedSuggestion?: string;
}

/** Flujo normal de reproducción modelado por el detector de pipeline. */
export const PLAYBACK_PIPELINE_STAGES: StageInfo[] = [
  {
    id: "playback_request",
    name: "Solicitud de reproducción",
    description: "El usuario solicita la reproducción de una canción.",
    timeoutMs: 60000,
    slowMs: 15000,
  },
  {
    id: "metadata_resolve",
    name: "Obtención de metadatos",
    description: "Se resuelven los metadatos y la lista de canciones cuando se trata de un álbum o playlist.",
    timeoutMs: 60000,
    slowMs: 15000,
  },
  {
    id: "stream_resolve",
    name: "Resolución del stream",
    description: "Se obtiene una URL de stream válida desde el backend, la caché o un archivo local.",
    timeoutMs: 45000,
    slowMs: 20000,
    timeoutMessage: "La resolución del stream tardó demasiado (el backend no respondió a tiempo).",
    timeoutSuggestion: "El daemon Kotlin no devolvió un stream dentro del tiempo permitido. Posibles causas: red lenta, YouTube Music devolviendo errores, o tokens PO/visitorData caducos.",
    neverFinishedMessage: "La resolución del stream no llegó a completarse.",
  },
  {
    id: "url_validation",
    name: "Validación de URL",
    description: "La URL del stream se valida: no vacía, esquema http(s) y vigencia de la firma.",
    timeoutMs: 5000,
    slowMs: 2500,
  },
  {
    id: "player_init",
    name: "Inicialización del reproductor",
    description: "El reproductor recibe la URL del stream y queda listo para reproducir (evento 'Ready' / loadedmetadata).",
    timeoutMs: 20000,
    slowMs: 10000,
    timeoutMessage: "El reproductor nunca recibió el evento 'Ready' (loadedmetadata/canplay).",
    timeoutSuggestion: "El audio nunca alcanzó un estado de listo. El proxy local puede no haber podido descargar el stream (URL expirada, red, o bloqueo).",
    neverFinishedMessage: "El reproductor nunca recibió el evento 'Ready'.",
    neverFinishedSuggestion: "La reproducción falló antes de que el reproductor confirmara que el audio estaba cargado.",
  },
  {
    id: "buffering",
    name: "Buffering",
    description: "El reproductor descarga los primeros segmentos de audio antes de reproducir.",
    timeoutMs: 30000,
    slowMs: 15000,
    optional: true,
    timeoutMessage: "El audio comenzó a cargar pero nunca estuvo listo para reproducirse (canplay).",
    timeoutSuggestion: "El stream se descarga demasiado lento o se detuvo a mitad de carga. Red inestable o stream muerto.",
  },
  {
    id: "playback_start",
    name: "Inicio del audio",
    description: "El audio comienza a reproducirse (evento 'Playing').",
    timeoutMs: 15000,
    slowMs: 8000,
    timeoutMessage: "El audio nunca comenzó a reproducirse (evento 'Playing' no recibido).",
    timeoutSuggestion: "El reproductor no pudo arrancar la reproducción. El autoplay puede haber sido rechazado o el stream devuelve errores al descargarse.",
  },
  {
    id: "state_update",
    name: "Actualización del estado de reproducción",
    description: "El estado de reproducción (tiempo, duración, UI) se sincroniza con el reproductor.",
    timeoutMs: 10000,
    slowMs: 5000,
  },
];

export type AnomalyCode =
  | "STAGE_NEVER_FINISHED"
  | "STAGE_TIMEOUT"
  | "STAGE_TOO_SLOW"
  | "MISSING_EVENT"
  | "INVALID_STATE_TRANSITION"
  | "EMPTY_URL"
  | "INVALID_STREAM"
  | "URL_EXPIRED"
  | "NULL_RESPONSE"
  | "UNEXPECTED_RESPONSE"
  | "NETWORK_ERROR"
  | "CONNECTION_LOST"
  | "HTTP_ERROR"
  | "BACKEND_ERROR"
  | "BACKEND_TIMEOUT"
  | "DAEMON_RESTARTED"
  | "PLAYER_ERROR"
  | "DECODE_ERROR"
  | "UNSUPPORTED_SOURCE"
  | "BUFFER_NEVER_STARTED"
  | "PLAYBACK_NEVER_STARTED"
  | "AUTH_ERROR"
  | "CACHE_STALE"
  | "FS_MISSING_FILE"
  | "PLAYLIST_RESOLVE_FAILED"
  | "OTHER";

export interface Anomaly {
  id: string;
  code: AnomalyCode;
  severity: Severity;
  /** Mensaje legible que explica QUÉ pasó, no solo "IOException". */
  message: string;
  /** Detector que emitió la anomalía. */
  detectorId: string;
  /** Etapa del pipeline a la que afecta (si aplica). */
  stageId?: string;
  timestamp: number;
  /** Causa probable sugerida. */
  suggestion?: string;
  context?: Record<string, unknown>;
}

export interface BusEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  /** Origen del evento: ui | player | backend | network | cache | fs | auth | engine | detector */
  source: string;
  /** Hilo/entorno donde ocurrió. */
  thread: string;
  timestamp: number;
  sessionId?: string;
}

export interface StageRecord {
  id: string;
  name: string;
  status: StageStatus;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  result?: unknown;
  note?: string;
  anomalyIds: string[];
}

export interface PlaybackSession {
  id: string;
  trackId: string;
  trackTitle: string;
  trackArtist?: string;
  source: string;
  status: "running" | "completed" | "failed" | "aborted";
  startedAt: number;
  finishedAt?: number;
  failureReason?: string;
  stages: StageRecord[];
  anomalies: Anomaly[];
  events: BusEvent[];
  attempts: number;
  streamUrl?: string;
}

export interface BackendInfo {
  app_version: string;
  os: string;
  arch: string;
  daemon_pid: number;
  backend: string;
  backend_version: string;
}

export interface TrackDescriptor {
  id: string;
  title: string;
  artist?: string;
}

export interface AnomalyInput {
  code: AnomalyCode;
  severity: Severity;
  message: string;
  detectorId: string;
  stageId?: string;
  suggestion?: string;
  context?: Record<string, unknown>;
}

export interface UrlCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface UrlValidation {
  ok: boolean;
  kind: "empty" | "scheme" | "proxy" | "expired" | "ok";
  checks: UrlCheck[];
  summary: string;
}

export interface TechnicalInfo {
  timestamp: string;
  thread: string;
  os: string;
  appVersion: string;
  backendVersion: string;
  sessionId: string;
  trackId?: string;
  trackTitle?: string;
  trackArtist?: string;
  streamUrl?: string;
  urlSignature?: string;
  stacktrace?: string;
  originalError?: string;
  online: boolean;
  retries: number;
  source: string;
}

export interface ReportSummary {
  /** Nombre corto del error (ej: "URL de stream expirada"). */
  name: string;
  /** Componente afectado (ej: "Backend (daemon Kotlin)"). */
  component: string;
  /** Etapa donde ocurrió (ej: "Validación de URL"). */
  stage: string;
  severity: Severity;
  /** Mensaje principal del error. */
  message: string;
}

export interface TimelineItem {
  kind: "stage";
  stageId: string;
  name: string;
  status: "ok" | "fail" | "running" | "skipped";
  durationMs?: number;
  note?: string;
  anomalyMessages: string[];
}

export interface DiagnosticReport {
  id: string;
  sessionId: string;
  generatedAt: string;
  summary: ReportSummary;
  explanation: string;
  possibleCauses: string[];
  timeline: TimelineItem[];
  anomalies: Anomaly[];
  technical: TechnicalInfo;
}
