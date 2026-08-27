import type { BusEvent } from "./types";

export type EventListener = (evt: BusEvent) => void;

const THREAD_BY_SOURCE: Record<string, string> = {
  backend: "Daemon (proceso Kotlin)",
  ui: "UI (WebView renderer)",
  player: "UI (WebView renderer)",
  network: "UI (WebView renderer)",
  cache: "UI (WebView renderer)",
  fs: "UI (WebView renderer)",
  auth: "UI (WebView renderer)",
  engine: "Sistema de diagnóstico",
  detector: "Sistema de diagnóstico",
};

/**
 * Event Bus central del sistema de diagnóstico.
 *
 * Desacoplado del reproductor: cualquiera puede emitir eventos tipados
 * (por tipo o de forma global) y cualquier detector puede suscribirse.
 * Mantiene un historial acotado para permitir reconstruir la línea temporal.
 */
export class EventBus {
  private listeners = new Map<string, Set<EventListener>>();
  private anyListeners = new Set<EventListener>();
  private history: BusEvent[] = [];
  private seq = 0;
  private readonly maxHistory = 500;

  emit(
    type: string,
    payload: Record<string, unknown> = {},
    source: string = "ui",
    sessionId?: string,
  ): BusEvent {
    const evt: BusEvent = {
      id: `evt-${(++this.seq).toString(36)}-${Date.now().toString(36)}`,
      type,
      payload: payload ?? {},
      source,
      thread: THREAD_BY_SOURCE[source] ?? "UI (WebView renderer)",
      timestamp: Date.now(),
      ...(sessionId ? { sessionId } : {}),
    };
    this.history.push(evt);
    if (this.history.length > this.maxHistory) this.history.shift();
    const set = this.listeners.get(type);
    if (set) for (const l of [...set]) l(evt);
    for (const l of [...this.anyListeners]) l(evt);
    return evt;
  }

  on(type: string, listener: EventListener): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
    return () => set?.delete(listener);
  }

  onAny(listener: EventListener): () => void {
    this.anyListeners.add(listener);
    return () => this.anyListeners.delete(listener);
  }

  getHistory(): BusEvent[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
    this.listeners.clear();
    this.anyListeners.clear();
  }
}
