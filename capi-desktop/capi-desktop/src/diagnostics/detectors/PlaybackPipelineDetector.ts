import type { BusEvent, PlaybackSession, UrlValidation, AnomalyCode } from "../types";
import { BaseDetector } from "./Detector";

interface ValidationFailure {
  code: AnomalyCode;
  severity: "error";
  message: string;
  suggestion: string;
}

const VALIDATION_FAILURES: Partial<Record<UrlValidation["kind"], ValidationFailure>> = {
  empty: {
    code: "EMPTY_URL",
    severity: "error",
    message: "La reproducción falló porque la resolución del stream devolvió una URL vacía.",
    suggestion:
      "El backend devolvió una respuesta vacía o un formato inesperado para el video solicitado (contenido no disponible, geobloqueo o error de la API).",
  },
  scheme: {
    code: "INVALID_STREAM",
    severity: "error",
    message: "La URL del stream no es una URL http(s) válida.",
    suggestion:
      "El contenido devuelto por el backend no es una URL de stream; puede ser una respuesta de error o de bloqueo de YouTube Music.",
  },
  proxy: {
    code: "INVALID_STREAM",
    severity: "error",
    message: "La URL envuelta por el proxy local no contiene un stream válido.",
    suggestion: "El proxy local recibió una URL interna vacía o con un formato no soportado.",
  },
  expired: {
    code: "URL_EXPIRED",
    severity: "error",
    message: "La URL del stream expiró antes de poder reproducirse.",
    suggestion:
      "YouTube Music firma las URLs con validez limitada. Si la resolución tardó demasiado, el stream caduca antes del inicio de la reproducción.",
  },
};

/**
 * Detector del pipeline de reproducción.
 *
 * Modela el flujo esperado (solicitud → metadatos → stream → validación de
 * URL → reproductor → buffering → inicio → estado), valida las transiciones
 * entre etapas y traduce los eventos del dominio en ciclos de vida de etapas.
 */
export class PlaybackPipelineDetector extends BaseDetector {
  readonly id = "playback-pipeline";
  readonly name = "Detector del pipeline de reproducción";

  private hadPlaying = false;

  onSessionStart(): void {
    this.hadPlaying = false;
  }

  onEvent(evt: BusEvent): void {
    const engine = this.engine;
    const recorder = engine.recorder;

    switch (evt.type) {
      case "playback.requested":
        engine.beginStage("playback_request");
        break;

      case "playlist.resolve_started":
        engine.beginStage("metadata_resolve", "Resolviendo playlist/álbum…");
        break;

      case "playback.metadata_ready":
        if (!recorder.isStarted("metadata_resolve")) engine.beginStage("metadata_resolve");
        engine.completeStage("metadata_resolve");
        engine.completeStage("playback_request");
        break;

      case "playlist.resolved":
        engine.completeStage("metadata_resolve", { count: evt.payload.count });
        break;

      case "playlist.resolve_failed":
        if (recorder.isStarted("metadata_resolve")) {
          engine.failStage("metadata_resolve", { reason: evt.payload.reason }, String(evt.payload.reason ?? ""));
        }
        engine.reportAnomaly({
          code: "PLAYLIST_RESOLVE_FAILED",
          severity: "error",
          message: `No se pudo resolver la lista de canciones del álbum/playlist: ${evt.payload.reason ?? "motivo desconocido"}`,
          stageId: "metadata_resolve",
          detectorId: this.id,
          suggestion: "El backend no devolvió la lista de canciones. Comprueba el estado del daemon y la validez del identificador.",
        });
        break;

      case "stream.resolve_started":
        if (recorder.isStarted("metadata_resolve") && recorder.status("metadata_resolve") === "running") {
          engine.completeStage("metadata_resolve");
        }
        engine.beginStage("stream_resolve", `Fuente: ${String(evt.payload.source ?? "desconocida")}`);
        break;

      case "stream.retry":
        engine.noteRetry();
        break;

      case "stream.resolved": {
        engine.completeStage("stream_resolve", {
          source: evt.payload.source,
          durationMs: Math.round(Number(evt.payload.durationMs ?? 0)),
          hasUrl: Boolean(evt.payload.url),
        });
        if (typeof evt.payload.url === "string") engine.recordStreamUrl(evt.payload.url);
        const validation = evt.payload.validation as UrlValidation | undefined;
        if (validation) {
          if (!recorder.isStarted("url_validation")) engine.beginStage("url_validation");
          this.applyValidation(validation);
        }
        break;
      }

      case "stream.resolve_failed":
        if (recorder.isStarted("stream_resolve") && recorder.status("stream_resolve") === "running") {
          engine.failStage("stream_resolve", { reason: evt.payload.reason }, String(evt.payload.reason ?? ""));
        } else {
          engine.reportAnomaly({
            code: "MISSING_EVENT",
            severity: "warning",
            message:
              "Se recibió el fallo de resolución del stream antes de que la etapa correspondiente hubiera comenzado.",
            stageId: "stream_resolve",
            detectorId: this.id,
          });
        }
        break;

      case "url.validation": {
        if (!recorder.isStarted("url_validation")) engine.beginStage("url_validation");
        const validation = evt.payload.validation as UrlValidation | undefined;
        if (validation) this.applyValidation(validation);
        break;
      }

      case "player.src_set":
        if (recorder.isStarted("url_validation") && recorder.status("url_validation") === "running") {
          engine.completeStage("url_validation", { accepted: true }, "URL aceptada por el reproductor");
        }
        engine.beginStage("player_init");
        break;

      case "player.loaded_metadata":
        if (!recorder.isStarted("player_init")) engine.beginStage("player_init");
        engine.completeStage("player_init", { duration: evt.payload.duration });
        break;

      case "player.waiting":
      case "player.stalled":
        if (!recorder.isStarted("buffering")) {
          engine.beginStage("buffering");
        }
        break;

      case "player.canplay":
        if (recorder.isStarted("buffering") && recorder.status("buffering") === "running") {
          engine.completeStage("buffering");
        } else if (
          recorder.isStarted("player_init") &&
          recorder.status("player_init") === "completed" &&
          !recorder.isStarted("buffering")
        ) {
          engine.skipStage("buffering", "El audio estuvo listo de inmediato (sin buffering)");
        }
        break;

      case "player.play_called":
        engine.beginStage("playback_start");
        break;

      case "player.playing":
        this.hadPlaying = true;
        if (!recorder.isStarted("playback_start")) engine.beginStage("playback_start");
        engine.completeStage("playback_start");
        if (!recorder.isStarted("state_update")) engine.beginStage("state_update");
        engine.completeStage("state_update", undefined, "Estado sincronizado al iniciar el audio");
        break;

      case "player.ended":
        if (recorder.isStarted("state_update") && recorder.status("state_update") === "running") {
          engine.completeStage("state_update", undefined, "Reproducción finalizada");
        }
        break;

      case "playback.succeeded":
        if (recorder.isStarted("state_update") && recorder.status("state_update") === "running") {
          engine.completeStage("state_update", undefined, "Reproducción en curso");
        }
        engine.completeSession("completed");
        break;

      case "playback.failed":
        engine.completeSession("failed", String(evt.payload.reason ?? "Fallo de reproducción"));
        break;

      case "playback.aborted":
        engine.completeSession("aborted", String(evt.payload.reason ?? "Reproducción interrumpida"));
        break;

      case "stage.started":
        this.validateOrder(evt);
        break;

      default:
        break;
    }
  }

  onSessionEnd(session: PlaybackSession): void {
    // Diagnósticos derivados cuando la reproducción falló sin excepción explícita.
    if (session.status !== "failed") return;
    const recorder = this.engine.recorder;
    const pi = recorder.get("player_init");
    const buf = recorder.get("buffering");
    const ps = recorder.get("playback_start");

    if (pi?.status === "completed" && !buf && !ps && !this.hadPlaying) {
      this.engine.reportAnomaly({
        code: "BUFFER_NEVER_STARTED",
        severity: "error",
        message: "La inicialización terminó correctamente, pero el buffer nunca comenzó.",
        stageId: "buffering",
        detectorId: this.id,
        suggestion:
          "El reproductor quedó listo pero nunca empezó a descargar el audio. Puede ser una URL muerta, un proxy que devuelve errores o un problema de red.",
      });
    } else if (pi?.status === "completed" && !ps && !this.hadPlaying) {
      this.engine.reportAnomaly({
        code: "PLAYBACK_NEVER_STARTED",
        severity: "error",
        message: "La carga del audio se completó, pero la reproducción nunca inició (evento 'Playing' no recibido).",
        stageId: "playback_start",
        detectorId: this.id,
        suggestion:
          "El audio se descargó pero play() no pudo arrancar la reproducción (autoplay bloqueado o error del reproductor).",
      });
    }
  }

  private applyValidation(validation: UrlValidation): void {
    if (validation.ok) {
      this.engine.completeStage("url_validation", { checks: validation.checks }, validation.summary);
      return;
    }
    const failure = VALIDATION_FAILURES[validation.kind];
    if (!failure) return;
    if (
      this.engine.recorder.isStarted("url_validation") &&
      this.engine.recorder.status("url_validation") === "running"
    ) {
      this.engine.failStage("url_validation", { reason: validation.summary }, validation.summary);
    } else if (!this.engine.recorder.isStarted("url_validation")) {
      this.engine.beginStage("url_validation");
      this.engine.failStage("url_validation", { reason: validation.summary }, validation.summary);
    }
    this.engine.reportAnomaly({
      code: failure.code,
      severity: failure.severity,
      message: failure.message,
      stageId: "url_validation",
      detectorId: this.id,
      suggestion: failure.suggestion,
      context: { checks: validation.checks },
    });
  }

  private validateOrder(evt: BusEvent): void {
    const id = String(evt.payload.stageId ?? "");
    const index = this.engine.stageInfos.findIndex((i) => i.id === id);
    if (index <= 0) return;
    const missing = this.engine.stageInfos
      .slice(0, index)
      .filter((i) => !i.optional && !this.engine.recorder.isStarted(i.id));
    if (missing.length === 0) return;
    const started = this.engine.stageInfos[index];
    this.engine.reportAnomaly({
      code: "INVALID_STATE_TRANSITION",
      severity: "error",
      message: `Transición de estados incorrecta: la etapa «${started.name}» comenzó antes de que «${missing
        .map((m) => m.name)
        .join("», «")}» se iniciara.`,
      stageId: id,
      detectorId: this.id,
      suggestion:
        "Los eventos del reproductor llegaron en un orden inesperado, lo que puede indicar un fallo del reproductor o de la lógica que orquesta la reproducción.",
    });
  }
}
