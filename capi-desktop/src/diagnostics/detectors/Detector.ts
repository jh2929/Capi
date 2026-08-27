import type { DiagnosticEngine } from "../DiagnosticEngine";
import type { BusEvent, PlaybackSession } from "../types";

/**
 * Contrato de un detector de anomalías.
 *
 * Los detectores son la unidad extensible del sistema: cada uno observa el
 * EventBus y emite diagnósticos independientes sin modificar el núcleo.
 * Para añadir un detector nuevo basta con implementar esta interfaz y
 * registrarlo en el motor.
 */
export interface Detector {
  readonly id: string;
  readonly name: string;
  attach(engine: DiagnosticEngine): void;
  onEvent(evt: BusEvent): void;
  onSessionStart?(session: PlaybackSession): void;
  onSessionEnd?(session: PlaybackSession): void;
}

export abstract class BaseDetector implements Detector {
  abstract readonly id: string;
  abstract readonly name: string;

  protected engine!: DiagnosticEngine;

  attach(engine: DiagnosticEngine): void {
    this.engine = engine;
  }

  abstract onEvent(evt: BusEvent): void;
}
