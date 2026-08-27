import type {
  Anomaly,
  AnomalyCode,
  PlaybackSession,
  ReportSummary,
  Severity,
  StageInfo,
} from "./types";

const SEVERITY_RANK: Record<Severity, number> = { critical: 4, error: 3, warning: 2, info: 1 };

const CODE_NAMES: Partial<Record<AnomalyCode, string>> = {
  EMPTY_URL: "URL de stream vacía",
  INVALID_STREAM: "Stream inválido",
  URL_EXPIRED: "URL de stream expirada",
  STAGE_TIMEOUT: "Tiempo de espera agotado",
  STAGE_NEVER_FINISHED: "Etapa de reproducción incompleta",
  STAGE_TOO_SLOW: "Etapa demasiado lenta",
  INVALID_STATE_TRANSITION: "Secuencia de etapas inválida",
  MISSING_EVENT: "Evento esperado no recibido",
  NULL_RESPONSE: "Respuesta nula del backend",
  UNEXPECTED_RESPONSE: "Respuesta inesperada del backend",
  NETWORK_ERROR: "Error de red",
  CONNECTION_LOST: "Conexión perdida",
  HTTP_ERROR: "Error HTTP del backend",
  BACKEND_ERROR: "Error del backend",
  BACKEND_TIMEOUT: "Timeout del backend",
  DAEMON_RESTARTED: "Reinicio del backend de streaming",
  PLAYER_ERROR: "Error del reproductor multimedia",
  DECODE_ERROR: "Fallo de decodificación del audio",
  UNSUPPORTED_SOURCE: "Formato de audio no soportado",
  BUFFER_NEVER_STARTED: "Buffering nunca iniciado",
  PLAYBACK_NEVER_STARTED: "El audio nunca inició",
  AUTH_ERROR: "Error de autenticación",
  CACHE_STALE: "Caché de stream caducada",
  FS_MISSING_FILE: "Archivo local no disponible",
  PLAYLIST_RESOLVE_FAILED: "No se pudo resolver la playlist",
  OTHER: "Anomalía de reproducción",
};

const COMPONENT_NAMES: Record<string, string> = {
  "playback-pipeline": "Pipeline de reproducción",
  player: "Reproductor multimedia",
  network: "Red",
  backend: "Backend (daemon Kotlin)",
  cache: "Caché de streams",
  auth: "Autenticación",
  fs: "Sistema de archivos",
  engine: "Motor de diagnóstico",
};

const CODE_CAUSES: Partial<Record<AnomalyCode, string>> = {
  EMPTY_URL:
    "El backend devolvió una respuesta vacía o un formato inesperado para este video (contenido no disponible, geobloqueo o error de la API).",
  INVALID_STREAM:
    "El backend devolvió contenido que no es una URL de audio válida; es posible que sea una página de bloqueo o un error disfrazado de YouTube Music.",
  URL_EXPIRED:
    "YouTube Music firma las URLs con validez limitada. Si entre la resolución del stream y el inicio de reproducción pasa demasiado tiempo, la URL caduca.",
  STAGE_TIMEOUT:
    "La etapa no se completó dentro del tiempo máximo permitido. En la resolución del stream esto suele indicar lentitud o fallo del daemon (red, tokens o API de YouTube Music).",
  STAGE_NEVER_FINISHED:
    "La etapa quedó abierta cuando la reproducción falló: el evento que debía cerrarla nunca llegó.",
  INVALID_STATE_TRANSITION:
    "Las señales del reproductor llegaron en un orden inesperado, lo que suele indicar un fallo en la lógica de orquestación o en el propio reproductor.",
  BACKEND_TIMEOUT:
    "El daemon Kotlin se quedó bloqueado o fue reiniciado por el watchdog mientras se esperaba su respuesta.",
  BACKEND_ERROR:
    "El daemon Kotlin respondió con un error inesperado; revisa los logs del daemon para conocer el detalle.",
  NETWORK_ERROR:
    "Hubo un fallo de conectividad entre la aplicación, el proxy local o los servidores de YouTube Music.",
  CONNECTION_LOST: "La conexión de red se interrumpió durante la reproducción.",
  DECODE_ERROR:
    "El stream descargado no puede decodificarse: puede estar corrupto, incompleto o usar un códec no soportado.",
  UNSUPPORTED_SOURCE:
    "La URL apuntaba a un recurso que no es audio decodificable (error del proxy o bloqueo del servidor).",
  BUFFER_NEVER_STARTED:
    "El reproductor quedó listo pero nunca comenzó a descargar audio: stream muerto, proxy bloqueado o red caída.",
  PLAYBACK_NEVER_STARTED:
    "El audio se descargó pero play() no arrancó la reproducción (autoplay rechazado o fallo del reproductor).",
  AUTH_ERROR:
    "Los tokens PO / visitorData de YouTube Music están caducos o el generador de tokens está fallando.",
  CACHE_STALE:
    "Se reutilizó una URL firmada en caché que puede haber expirado tras un reinicio del backend.",
  FS_MISSING_FILE: "El archivo local se movió, se borró o quedó sin permisos de lectura.",
  PLAYLIST_RESOLVE_FAILED:
    "El backend no pudo resolver la lista de canciones del álbum/playlist solicitado.",
  MISSING_EVENT:
    "Un resultado llegó sin que la etapa correspondiente hubiera comenzado: los eventos del flujo están desincronizados.",
  NULL_RESPONSE: "Una respuesta del sistema llegó nula o incompleta.",
  UNEXPECTED_RESPONSE: "La respuesta del sistema no tenía el formato esperado.",
  HTTP_ERROR: "El servidor respondió con un código de error HTTP.",
  PLAYER_ERROR: "El reproductor multimedia del sistema reportó un error al reproducir el audio.",
  DAEMON_RESTARTED:
    "El daemon de streaming se reinició a mitad de sesión (timeout o muerte del proceso), invalidando las URLs de la sesión anterior.",
  STAGE_TOO_SLOW: "La etapa tardó más de lo habitual, sin llegar a exceder el límite.",
  OTHER: "Causa no determinada con la información disponible.",
};

export interface AnalysisResult {
  summary: ReportSummary;
  explanation: string;
  possibleCauses: string[];
}

/** Selecciona la anomalía principal: la de mayor severidad y más antigua. */
export function pickPrimaryAnomaly(anomalies: Anomaly[]): Anomaly | null {
  if (anomalies.length === 0) return null;
  return [...anomalies].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.timestamp - b.timestamp,
  )[0];
}

export function componentName(detectorId: string): string {
  return COMPONENT_NAMES[detectorId] ?? detectorId;
}

export function stageName(stageId: string | undefined, infos: StageInfo[]): string {
  if (!stageId) return "—";
  return infos.find((i) => i.id === stageId)?.name ?? stageId;
}

/**
 * Error Analyzer — reconstruye la cadena de eventos de una sesión y genera
 * una explicación legible: qué ocurrió, en qué paso, qué se esperaba,
 * qué se observó y cuál podría ser la causa.
 */
export function analyzeSession(session: PlaybackSession | null, infos: StageInfo[]): AnalysisResult {
  if (!session) {
    return {
      summary: {
        name: "Sin sesión de reproducción",
        component: "Motor de diagnóstico",
        stage: "—",
        severity: "info",
        message: "No hay una sesión de reproducción registrada.",
      },
      explanation: "No se registró ninguna sesión de reproducción sobre la que generar un diagnóstico.",
      possibleCauses: [],
    };
  }

  const anomalies = session.anomalies;
  const failure = [...session.events].reverse().find((e) => e.type === "playback.failed");
  const primary = pickPrimaryAnomaly(anomalies);
  const stageOf = (id?: string) => stageName(id, infos);

  let summary: ReportSummary;
  if (primary) {
    summary = {
      name: CODE_NAMES[primary.code] ?? "Anomalía de reproducción",
      component: componentName(primary.detectorId),
      stage: stageOf(primary.stageId),
      severity: primary.severity,
      message: primary.message,
    };
  } else if (failure) {
    summary = {
      name: "Reproducción fallida",
      component: "Pipeline de reproducción",
      stage: "—",
      severity: "error",
      message: String(failure.payload.reason ?? "Fallo desconocido"),
    };
  } else {
    summary = {
      name: session.status === "aborted" ? "Reproducción interrumpida" : "Reproducción",
      component: "Pipeline de reproducción",
      stage: "—",
      severity: session.status === "failed" ? "error" : "info",
      message:
        session.failureReason ??
        (session.status === "aborted"
          ? "La sesión fue reemplazada por una nueva solicitud de reproducción."
          : "La reproducción no reportó anomalías."),
    };
  }

  // ── Explicación ──────────────────────────────────────────────────
  const parts: string[] = [];
  if (primary) {
    parts.push(`La reproducción falló en la etapa «${summary.stage}»: ${primary.message}.`);
    const expected = primary.stageId ? infos.find((i) => i.id === primary.stageId) : undefined;
    if (expected) parts.push(`Comportamiento esperado: ${expected.description}`);
    const rec = primary.stageId ? session.stages.find((s) => s.id === primary.stageId) : undefined;
    if (rec) {
      if (rec.status === "failed") {
        parts.push(
          `Comportamiento observado: la etapa «${rec.name}» terminó en fallo${
            rec.note ? ` (${rec.note})` : ""
          }${rec.durationMs !== undefined ? ` tras ${Math.round(rec.durationMs)} ms` : ""}.`,
        );
      } else if (rec.status === "running") {
        parts.push(`Comportamiento observado: la etapa «${rec.name}» quedó sin completar.`);
      } else if (rec.status === "skipped") {
        parts.push(`Comportamiento observado: la etapa «${rec.name}» se omitió (${rec.note ?? "innecesaria"}).`);
      } else {
        parts.push(
          `Comportamiento observado: la etapa «${rec.name}» se completó en ${Math.round(rec.durationMs ?? 0)} ms.`,
        );
      }
    }
  } else if (failure) {
    parts.push(`La reproducción falló antes de completar el flujo: ${summary.message}.`);
    const running = session.stages.filter((s) => s.status === "running");
    if (running.length > 0) {
      parts.push(
        `Las etapas «${running.map((r) => r.name).join("», «")}» quedaron sin completar al momento del fallo.`,
      );
    }
  } else {
    parts.push(summary.message);
  }

  // Causa probable
  if (primary?.suggestion) {
    parts.push(`Posible causa: ${primary.suggestion}`);
  }

  // Detalle del error original reportado por la aplicación (si difiere)
  if (failure && typeof failure.payload.reason === "string") {
    const reason = failure.payload.reason;
    if (reason && !summary.message.includes(reason) && !parts.some((p) => p.includes(reason))) {
      parts.push(`Detalle del error reportado por la aplicación: ${reason}`);
    }
  }

  // Anomalías secundarias
  const secondary = anomalies.filter((a) => a.id !== primary?.id);
  if (secondary.length > 0) {
    const extra = secondary
      .slice(0, 4)
      .map((a) => `• ${a.message}${a.stageId ? ` (etapa «${stageOf(a.stageId)}»)` : ""}`)
      .join("\n");
    parts.push(`Anomalías adicionales detectadas:\n${extra}`);
  }

  const possibleCauses: string[] = [];
  if (primary) {
    possibleCauses.push(primary.suggestion ?? CODE_CAUSES[primary.code] ?? "Causa no determinada.");
    for (const a of secondary.slice(0, 3)) {
      const cause = a.suggestion ?? CODE_CAUSES[a.code];
      if (cause && !possibleCauses.includes(cause)) possibleCauses.push(cause);
    }
  } else if (failure) {
    possibleCauses.push(
      "No se detectaron anomalías específicas. Consulta la información técnica y el stacktrace para profundizar.",
    );
  }

  return {
    summary,
    explanation: parts.join("\n\n"),
    possibleCauses,
  };
}
