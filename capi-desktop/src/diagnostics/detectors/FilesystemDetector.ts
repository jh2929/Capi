import type { BusEvent } from "../types";
import { BaseDetector } from "./Detector";

/**
 * Detector del sistema de archivos — detecta fallos al reproducir archivos
 * locales o descargados (archivo movido, borrado o inaccesible).
 */
export class FilesystemDetector extends BaseDetector {
  readonly id = "fs";
  readonly name = "Detector del sistema de archivos";

  onEvent(evt: BusEvent): void {
    const raw = String(evt.payload.reason ?? evt.payload.error ?? evt.payload.message ?? "");

    if (evt.type === "playback.failed" && /local|archivo|file|no existe|no such|permission|permiso/i.test(raw)) {
      this.engine.reportAnomaly({
        code: "FS_MISSING_FILE",
        severity: "error",
        message: `El archivo local no pudo cargarse: ${raw.slice(0, 200)}.`,
        detectorId: this.id,
        suggestion:
          "El archivo puede haber sido movido, borrado o quedado sin permisos de lectura. Revisa la carpeta de música local y las descargas.",
      });
      return;
    }

    if (evt.type === "player.error" && Number(evt.payload.code) === 4) {
      const source = this.engine.session?.streamUrl ?? "";
      if (/path=|file:|%2Fplay%3F/.test(source)) {
        this.engine.reportAnomaly({
          code: "FS_MISSING_FILE",
          severity: "error",
          message: "El reproductor no pudo abrir un archivo local (el recurso no es un audio válido o no existe).",
          detectorId: this.id,
          suggestion:
            "El proxy local no encontró o no pudo leer el archivo. Verifica que la ruta siga existiendo.",
        });
      }
    }
  }
}
