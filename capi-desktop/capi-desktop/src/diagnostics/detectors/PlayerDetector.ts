import type { AnomalyCode, BusEvent, Severity } from "../types";
import { BaseDetector } from "./Detector";

interface MediaErrorMapping {
  code: AnomalyCode;
  severity: Severity;
  message: string;
  suggestion: string;
}

const MEDIA_ERRORS: Record<number, MediaErrorMapping> = {
  1: {
    code: "PLAYER_ERROR",
    severity: "warning",
    message: "La reproducción fue abortada por el reproductor (MEDIA_ERR_ABORTED).",
    suggestion:
      "La carga del recurso se interrumpió. Puede deberse a un cambio de pista o a una interrupción manual.",
  },
  2: {
    code: "NETWORK_ERROR",
    severity: "error",
    message: "El reproductor no pudo descargar el audio (MEDIA_ERR_NETWORK).",
    suggestion:
      "Error de red al descargar el stream. Verifica la conexión y que el proxy local (127.0.0.1) esté accesible.",
  },
  3: {
    code: "DECODE_ERROR",
    severity: "error",
    message: "El reproductor no pudo decodificar el audio (MEDIA_ERR_DECODE).",
    suggestion:
      "El stream devuelto por el backend no es decodificable: puede ser un stream parcial, una respuesta de error disfrazada o un códec no soportado.",
  },
  4: {
    code: "UNSUPPORTED_SOURCE",
    severity: "error",
    message: "La URL del stream no es un recurso de audio válido (MEDIA_ERR_SRC_NOT_SUPPORTED).",
    suggestion:
      "El proxy devolvió algo que no es audio (por ejemplo un error 404/403 o una página de bloqueo en lugar del stream).",
  },
};

/**
 * Detector del reproductor multimedia — interpreta los eventos del elemento
 * <audio> (error, networkState, readyState) y los convierte en anomalías
 * comprensibles en lugar de mensajes crudos del navegador.
 */
export class PlayerDetector extends BaseDetector {
  readonly id = "player";
  readonly name = "Detector del reproductor multimedia";

  onEvent(evt: BusEvent): void {
    switch (evt.type) {
      case "player.error": {
        const code = Number(evt.payload.code ?? -1);
        const mapping = MEDIA_ERRORS[code];
        if (mapping) {
          const running = this.engine.recorder.running();
          const runningStage = running.length > 0 ? running[running.length - 1].id : undefined;
          this.engine.reportAnomaly({
            code: mapping.code,
            severity: mapping.severity,
            message: mapping.message,
            stageId: runningStage,
            detectorId: this.id,
            suggestion: mapping.suggestion,
            context: {
              mediaErrorCode: code,
              networkState: evt.payload.networkState,
              readyState: evt.payload.readyState,
              message: evt.payload.message,
            },
          });
        } else {
          this.engine.reportAnomaly({
            code: "PLAYER_ERROR",
            severity: "error",
            message: `El reproductor multimedia reportó un error: ${evt.payload.message ?? `código ${code}`}`,
            detectorId: this.id,
            context: {
              networkState: evt.payload.networkState,
              readyState: evt.payload.readyState,
            },
          });
        }
        break;
      }
      case "player.src_set": {
        const url = String(evt.payload.url ?? "");
        if (!url || url === "null" || url === "undefined") {
          this.engine.reportAnomaly({
            code: "EMPTY_URL",
            severity: "error",
            message: "El reproductor recibió una URL de stream vacía.",
            stageId: "player_init",
            detectorId: this.id,
            suggestion: "La etapa de resolución del stream terminó sin una URL utilizable.",
          });
        }
        break;
      }
      default:
        break;
    }
  }
}
