import { DiagnosticEngine } from "./DiagnosticEngine";
import { AuthDetector } from "./detectors/AuthDetector";
import { BackendDetector } from "./detectors/BackendDetector";
import { CacheDetector } from "./detectors/CacheDetector";
import { FilesystemDetector } from "./detectors/FilesystemDetector";
import { NetworkDetector } from "./detectors/NetworkDetector";
import { PlaybackPipelineDetector } from "./detectors/PlaybackPipelineDetector";
import { PlayerDetector } from "./detectors/PlayerDetector";
import { validateStreamUrl } from "./urlUtils";
import type {
  BackendInfo,
  DiagnosticReport,
  TrackDescriptor,
  UrlValidation,
} from "./types";

export type * from "./types";
export { validateStreamUrl, sanitizeUrl, urlSignature } from "./urlUtils";
export { default as DiagnosticModal } from "./DiagnosticModal";

export interface MediaErrorInfo {
  code: number;
  message?: string;
  networkState?: number;
  readyState?: number;
}

function errorMessage(err: unknown): string {
  if (!err) return "Error desconocido";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function errorPayload(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack ?? undefined,
    };
  }
  return { message: errorMessage(err) };
}

/**
 * Fachada pública de la capa de observabilidad.
 *
 * El reproductor (o cualquier otro módulo) interactúa únicamente con este
 * objeto: emite señales de dominio sin conocer los detectores ni el motor.
 */
class Diagnostics {
  private readonly engine = new DiagnosticEngine();
  private initialized = false;

  constructor() {
    // Los detectores se registran aquí; para añadir uno nuevo basta
    // con implementar Detector y registrarlo (el núcleo no cambia).
    this.engine.register(new PlaybackPipelineDetector());
    this.engine.register(new PlayerDetector());
    this.engine.register(new NetworkDetector());
    this.engine.register(new BackendDetector());
    this.engine.register(new CacheDetector());
    this.engine.register(new AuthDetector());
    this.engine.register(new FilesystemDetector());
  }

  /** Inicializa los listeners globales (conectividad de red). Idempotente. */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => this.engine.emit("network.online", {}, "network"));
    window.addEventListener("offline", () => this.engine.emit("network.offline", {}, "network"));
  }

  setBackendInfo(info: BackendInfo | null): void {
    this.engine.setBackendInfo(info);
  }

  // ─── Señales del dominio de reproducción ─────────────────────────

  onPlaybackRequested(track: TrackDescriptor, source = "manual"): void {
    const active = this.engine.session;
    const recorder = this.engine.recorder;
    // Rebind: resolución de playlist → primera canción en la misma sesión.
    if (
      active &&
      active.status === "running" &&
      active.source === source &&
      !recorder.isStarted("stream_resolve")
    ) {
      this.engine.rebindTrack({ id: track.id, title: track.title, artist: track.artist ?? "" });
    } else {
      this.engine.startSession({ id: track.id, title: track.title, artist: track.artist ?? "" }, source);
    }
    this.engine.emit("playback.requested", { trackId: track.id, title: track.title }, "ui");
  }

  onPlaylistResolveStarted(): void {
    this.engine.emit("playlist.resolve_started", {}, "ui");
  }

  onPlaylistResolved(count: number): void {
    this.engine.emit("playlist.resolved", { count }, "ui");
  }

  onPlaylistResolveFailed(err: unknown): void {
    this.engine.emit("playlist.resolve_failed", { reason: errorMessage(err) }, "ui");
  }

  onMetadataReady(track: TrackDescriptor): void {
    this.engine.emit("playback.metadata_ready", { trackId: track.id, title: track.title }, "ui");
  }

  onStreamResolveStarted(source: "local" | "download" | "cache" | "backend"): void {
    this.engine.emit("stream.resolve_started", { source }, "ui");
  }

  onStreamResolveRetry(attempt: number): void {
    this.engine.emit("stream.retry", { attempt }, "ui");
  }

  onStreamResolved(url: string, source: string, durationMs: number, validation: UrlValidation): void {
    this.engine.emit("stream.resolved", { url, source, durationMs, validation }, "ui");
  }

  onStreamResolveFailed(err: unknown): void {
    this.engine.emit("stream.resolve_failed", { reason: errorMessage(err) }, "ui");
  }

  onUrlValidated(url: string, validation: UrlValidation): void {
    this.engine.emit("url.validation", { url, validation }, "ui");
  }

  onPlayerInitStarted(url: string): void {
    this.engine.emit("player.src_set", { url }, "player");
  }

  onPlayerLoadedMetadata(duration: number): void {
    this.engine.emit("player.loaded_metadata", { duration }, "player");
  }

  onPlayerWaiting(): void {
    this.engine.emit("player.waiting", {}, "player");
  }

  onPlayerStalled(): void {
    this.engine.emit("player.stalled", {}, "player");
  }

  onPlayerCanPlay(): void {
    this.engine.emit("player.canplay", {}, "player");
  }

  onPlayerPlayCalled(): void {
    this.engine.emit("player.play_called", {}, "player");
  }

  onPlayerPlaying(): void {
    this.engine.emit("player.playing", {}, "player");
  }

  onPlayerPaused(): void {
    this.engine.emit("player.paused", {}, "player");
  }

  onPlayerError(info: MediaErrorInfo): void {
    this.engine.emit(
      "player.error",
      { code: info.code, message: info.message ?? "", networkState: info.networkState, readyState: info.readyState },
      "player",
    );
  }

  onPlayerEnded(): void {
    this.engine.emit("player.ended", {}, "player");
  }

  onPlaybackStarted(track: TrackDescriptor): void {
    this.engine.emit("playback.succeeded", { trackId: track.id, title: track.title }, "ui");
  }

  onPlaybackFailed(track: TrackDescriptor, err?: unknown): void {
    this.engine.emit(
      "playback.failed",
      { trackId: track.id, title: track.title, reason: err ? errorMessage(err) : undefined, error: errorPayload(err) },
      "ui",
    );
  }

  // ─── Señales del backend (daemon) ────────────────────────────────

  onDaemonRestarted(reason: string, timestamp?: string): void {
    this.engine.emit("backend.daemon_restarted", { reason, timestamp }, "backend");
  }

  onDaemonReady(): void {
    this.engine.emit("backend.daemon_ready", {}, "backend");
  }

  // ─── Consultas ───────────────────────────────────────────────────

  validateStreamUrl(url?: string | null): UrlValidation {
    return validateStreamUrl(url);
  }

  getSessionStatus(): "running" | "completed" | "failed" | "aborted" | null {
    return this.engine.session?.status ?? null;
  }

  buildReport(): DiagnosticReport {
    return this.engine.buildReport();
  }

  reset(): void {
    this.engine.reset();
  }
}

export const diagnostics = new Diagnostics();
