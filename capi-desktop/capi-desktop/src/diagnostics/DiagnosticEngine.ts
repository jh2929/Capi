import { EventBus } from "./EventBus";
import { TimelineRecorder } from "./TimelineRecorder";
import { buildDiagnosticReport } from "./ReportGenerator";
import type {
  Anomaly,
  AnomalyInput,
  BackendInfo,
  BusEvent,
  DiagnosticReport,
  PlaybackSession,
  StageInfo,
  TrackDescriptor,
} from "./types";
import { PLAYBACK_PIPELINE_STAGES } from "./types";
import type { Detector } from "./detectors/Detector";

const randomId = (prefix: string) =>
  `${prefix}-${(globalThis.crypto?.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`)}`;

/**
 * Diagnostic Engine — núcleo de la capa de observabilidad.
 *
 * - Posee el EventBus, el TimelineRecorder y el registro de detectores.
 * - Administra el ciclo de vida de las sesiones de reproducción.
 * - Ejecuta watchdogs de timeout/lentitud por etapa.
 * - Convierte señales del pipeline en etapas, anomalías y reportes.
 *
 * No conoce al reproductor: solo reacciona a eventos del bus.
 */
export class DiagnosticEngine {
  readonly bus: EventBus;
  readonly recorder: TimelineRecorder;
  readonly stageInfos: StageInfo[] = PLAYBACK_PIPELINE_STAGES;

  private detectors = new Map<string, Detector>();
  private activeSession: PlaybackSession | null = null;
  private lastSession: PlaybackSession | null = null;
  private watchdogs = new Map<string, { timeout: ReturnType<typeof setTimeout>; slow: ReturnType<typeof setTimeout> }>();
  private pendingAnomalies: Anomaly[] = [];
  private backendInfo: BackendInfo | null = null;

  constructor() {
    this.bus = new EventBus();
    this.recorder = new TimelineRecorder(this.stageInfos);
    this.bus.onAny((evt) => this.routeEvent(evt));
  }

  // ─── Registro de detectores ───────────────────────────────────────

  register(detector: Detector): void {
    detector.attach(this);
    this.detectors.set(detector.id, detector);
  }

  // ─── Acceso al estado ─────────────────────────────────────────────

  get session(): PlaybackSession | null {
    return this.activeSession ?? this.lastSession;
  }

  get isSessionRunning(): boolean {
    return this.activeSession !== null;
  }

  setBackendInfo(info: BackendInfo | null): void {
    this.backendInfo = info;
  }

  get backendInfoValue(): BackendInfo | null {
    return this.backendInfo;
  }

  // ─── Emisión de eventos ───────────────────────────────────────────

  emit(type: string, payload: Record<string, unknown> = {}, source = "ui"): BusEvent {
    return this.bus.emit(type, payload, source, this.activeSession?.id);
  }

  private routeEvent(evt: BusEvent): void {
    if (evt.sessionId && this.activeSession?.id === evt.sessionId) {
      this.activeSession.events.push(evt);
      if (this.activeSession.events.length > 300) this.activeSession.events.shift();
    }
    for (const d of this.detectors.values()) d.onEvent(evt);
  }

  // ─── Sesiones ─────────────────────────────────────────────────────

  startSession(track: TrackDescriptor, source: string): PlaybackSession {
    if (this.activeSession && this.activeSession.status === "running") {
      this.completeSession("aborted", "Reemplazada por una nueva solicitud de reproducción");
    }
    const session: PlaybackSession = {
      id: randomId("sess"),
      trackId: track.id,
      trackTitle: track.title,
      trackArtist: track.artist ?? "",
      source,
      status: "running",
      startedAt: Date.now(),
      stages: [],
      anomalies: [...this.pendingAnomalies],
      events: [],
      attempts: 0,
    };
    this.pendingAnomalies = [];
    this.activeSession = session;
    for (const d of this.detectors.values()) d.onSessionStart?.(session);
    this.emit(
      "session.started",
      { track: { id: track.id, title: track.title }, source },
      "engine",
    );
    return session;
  }

  /** Reasigna la pista de la sesión activa (p. ej. playlist → primera canción). */
  rebindTrack(track: TrackDescriptor): void {
    if (!this.activeSession) return;
    this.activeSession.trackId = track.id;
    this.activeSession.trackTitle = track.title;
    this.activeSession.trackArtist = track.artist ?? "";
  }

  completeSession(status: "completed" | "failed" | "aborted", reason?: string): void {
    const s = this.activeSession;
    if (!s) return;
    s.status = status;
    s.finishedAt = Date.now();
    if (reason) s.failureReason = reason;

    // Primero los detectores derivan anomalías específicas (aún hay sesión activa).
    for (const d of this.detectors.values()) d.onSessionEnd?.(s);

    // Cualquier etapa que quedó abierta al fallar → "nunca terminó".
    if (status === "failed") {
      for (const rec of this.recorder.running()) {
        const info = this.stageInfos.find((i) => i.id === rec.id);
        this.reportAnomaly({
          code: "STAGE_NEVER_FINISHED",
          severity: "error",
          message:
            info?.neverFinishedMessage ??
            `La etapa «${rec.name}» nunca terminó.`,
          stageId: rec.id,
          detectorId: "playback-pipeline",
          suggestion: info?.neverFinishedSuggestion,
        });
        this.recorder.fail(rec.id, { reason: "La etapa no terminó antes del cierre de la sesión" });
      }
    }

    s.stages = this.recorder.all();
    this.clearWatchdogs();
    this.recorder.reset();

    this.emit("session.ended", { status, reason }, "engine");
    this.lastSession = s;
    this.activeSession = null;
  }

  noteRetry(): void {
    if (this.activeSession) this.activeSession.attempts++;
  }

  recordStreamUrl(url: string): void {
    if (this.activeSession) this.activeSession.streamUrl = url;
  }

  // ─── Ciclo de vida de etapas ──────────────────────────────────────

  beginStage(id: string, note?: string): boolean {
    const res = this.recorder.start(id, note);
    if (!res) return false;
    if (res.created) {
      this.emit("stage.started", { stageId: id, note }, "engine");
      const info = this.stageInfos.find((i) => i.id === id);
      if (info) this.armWatchdog(id, info);
    }
    return true;
  }

  completeStage(id: string, result?: unknown, note?: string): boolean {
    const rec = this.recorder.complete(id, result, note);
    if (!rec) return false;
    this.disarmWatchdog(id);
    this.emit("stage.completed", { stageId: id, result, note }, "engine");
    return true;
  }

  failStage(id: string, result?: unknown, note?: string): boolean {
    const rec = this.recorder.fail(id, result, note);
    if (!rec) return false;
    this.disarmWatchdog(id);
    this.emit("stage.failed", { stageId: id, result, note }, "engine");
    return true;
  }

  skipStage(id: string, note?: string): boolean {
    const rec = this.recorder.skip(id, note);
    if (!rec) return false;
    this.disarmWatchdog(id);
    this.emit("stage.skipped", { stageId: id, note }, "engine");
    return true;
  }

  private armWatchdog(id: string, info: StageInfo): void {
    const slowMs = info.slowMs ?? Math.max(2500, Math.round(info.timeoutMs * 0.4));
    const slow = setTimeout(() => {
      const rec = this.recorder.get(id);
      if (rec && rec.status === "running" && this.activeSession) {
        this.reportAnomaly({
          code: "STAGE_TOO_SLOW",
          severity: "warning",
          message: `La etapa «${rec.name}» está tardando más de lo esperado (>${Math.round(slowMs / 1000)} s).`,
          stageId: id,
          detectorId: "playback-pipeline",
        });
      }
    }, slowMs);

    const timeout = setTimeout(() => {
      const rec = this.recorder.get(id);
      if (rec && rec.status === "running" && this.activeSession) {
        this.reportAnomaly({
          code: "STAGE_TIMEOUT",
          severity: "error",
          message:
            info.timeoutMessage ??
            `La etapa «${rec.name}» excedió el tiempo máximo permitido (${Math.round(info.timeoutMs / 1000)} s).`,
          stageId: id,
          detectorId: "playback-pipeline",
          suggestion: info.timeoutSuggestion,
        });
        this.failStage(id, { reason: "Tiempo máximo excedido" }, "Excedió el tiempo máximo permitido");
      }
    }, info.timeoutMs);

    this.watchdogs.set(id, { timeout, slow });
  }

  private disarmWatchdog(id: string): void {
    const w = this.watchdogs.get(id);
    if (w) {
      clearTimeout(w.timeout);
      clearTimeout(w.slow);
      this.watchdogs.delete(id);
    }
  }

  private clearWatchdogs(): void {
    for (const w of this.watchdogs.values()) {
      clearTimeout(w.timeout);
      clearTimeout(w.slow);
    }
    this.watchdogs.clear();
  }

  // ─── Anomalías ────────────────────────────────────────────────────

  reportAnomaly(input: AnomalyInput): Anomaly {
    const anomaly: Anomaly = {
      id: randomId("anom"),
      code: input.code,
      severity: input.severity,
      message: input.message,
      detectorId: input.detectorId,
      timestamp: Date.now(),
      ...(input.stageId ? { stageId: input.stageId } : {}),
      ...(input.suggestion ? { suggestion: input.suggestion } : {}),
      ...(input.context ? { context: input.context } : {}),
    };
    const s = this.activeSession;
    if (s) {
      s.anomalies.push(anomaly);
      if (anomaly.stageId) this.recorder.markAnomaly(anomaly.stageId, anomaly.id);
    } else {
      // Sin sesión activa: se conservan y se adjuntan a la próxima sesión.
      this.pendingAnomalies.push(anomaly);
      if (this.pendingAnomalies.length > 20) this.pendingAnomalies.shift();
    }
    this.emit("anomaly.recorded", { ...anomaly }, input.detectorId === "engine" ? "engine" : "detector");
    return anomaly;
  }

  // ─── Reportes ─────────────────────────────────────────────────────

  buildReport(): DiagnosticReport {
    return buildDiagnosticReport(this.session, this.backendInfo, this.stageInfos);
  }

  reset(): void {
    this.clearWatchdogs();
    this.pendingAnomalies = [];
    this.activeSession = null;
    this.lastSession = null;
    this.recorder.reset();
  }
}
