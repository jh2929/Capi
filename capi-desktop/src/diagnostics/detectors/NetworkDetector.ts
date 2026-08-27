import type { BusEvent, PlaybackSession } from "../types";
import { BaseDetector } from "./Detector";

/**
 * Detector de red — vigila la conectividad del dispositivo y las señales
 * de pérdida de conexión durante el flujo de reproducción.
 */
export class NetworkDetector extends BaseDetector {
  readonly id = "network";
  readonly name = "Detector de red";

  onSessionStart(session: PlaybackSession): void {
    void session;
    const online =
      typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
        ? navigator.onLine
        : true;
    if (!online) {
      this.engine.reportAnomaly({
        code: "CONNECTION_LOST",
        severity: "warning",
        message: "Se inició la reproducción sin conexión de red.",
        detectorId: this.id,
        suggestion: "Verifica la conexión a internet antes de reproducir.",
      });
    }
  }

  onEvent(evt: BusEvent): void {
    switch (evt.type) {
      case "network.offline":
        this.engine.reportAnomaly({
          code: "CONNECTION_LOST",
          severity: "error",
          message: "Se perdió la conexión de red durante la reproducción.",
          detectorId: this.id,
          suggestion:
            "Sin conexión el proxy local no puede descargar el stream. La reproducción continuará fallando hasta restaurar la red.",
        });
        break;
      case "network.online":
        this.engine.emit("network.info", { message: "Conexión de red restablecida" }, "network");
        break;
      default:
        break;
    }
  }
}
