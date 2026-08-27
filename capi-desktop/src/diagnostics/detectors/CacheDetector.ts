import type { BusEvent } from "../types";
import { BaseDetector } from "./Detector";

/**
 * Detector de caché — detecta cuando se reutilizan URLs de stream cacheadas
 * que pueden haber quedado caducas (por ejemplo tras un reinicio del daemon,
 * que invalida las URLs firmadas de la sesión anterior).
 */
export class CacheDetector extends BaseDetector {
  readonly id = "cache";
  readonly name = "Detector de caché de streams";

  private daemonRestartedAt: number | null = null;

  onEvent(evt: BusEvent): void {
    switch (evt.type) {
      case "backend.daemon_restarted":
        this.daemonRestartedAt = evt.timestamp;
        break;

      case "stream.resolved": {
        const source = String(evt.payload.source ?? "");
        const sessionStarted = this.engine.session?.startedAt ?? evt.timestamp;
        if (source === "cache" && this.daemonRestartedAt !== null && this.daemonRestartedAt >= sessionStarted) {
          this.engine.reportAnomaly({
            code: "CACHE_STALE",
            severity: "warning",
            message:
              "Se usó una URL de stream en caché generada antes del último reinicio del backend. Las URLs firmadas pueden estar caducas.",
            detectorId: this.id,
            suggestion:
              "Después de reiniciarse el daemon se deberían descartar las URLs cacheadas y volver a resolver el stream.",
          });
        }
        break;
      }
      default:
        break;
    }
  }
}
