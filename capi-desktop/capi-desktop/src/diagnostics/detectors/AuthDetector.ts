import type { BusEvent } from "../types";
import { BaseDetector } from "./Detector";

const AUTH_PATTERNS =
  /poToken|po token|visitorData|visitor data|token/i;

const AUTH_FAILURE_PATTERNS =
  /forbidden|prohibido|sign in|iniciar sesión|401|403|authentication|auth/i;

/**
 * Detector de autenticación — identifica fallos relacionados con las
 * credenciales de streaming de YouTube Music (PO tokens / visitorData).
 */
export class AuthDetector extends BaseDetector {
  readonly id = "auth";
  readonly name = "Detector de autenticación";

  onEvent(evt: BusEvent): void {
    const raw = String(
      evt.payload.reason ?? evt.payload.error ?? evt.payload.message ?? "",
    );
    if (!raw) return;

    const isAuthFlavored =
      (evt.type === "backend.error" || evt.type === "stream.resolve_failed" || evt.type === "playback.failed") &&
      (AUTH_PATTERNS.test(raw) || AUTH_FAILURE_PATTERNS.test(raw));

    if (!isAuthFlavored) return;

    this.engine.reportAnomaly({
      code: "AUTH_ERROR",
      severity: "error",
      message: `El backend devolvió un error de autenticación (PO token / visitorData): ${raw.slice(0, 200)}.`,
      detectorId: this.id,
      suggestion:
        "Los tokens PO se refrescan automáticamente cada 30 minutos. Si el error persiste, el generador de tokens puede estar fallando o YouTube Music bloqueó la sesión.",
      context: { sourceEvent: evt.type },
    });
  }
}
