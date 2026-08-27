import type { StageInfo, StageRecord } from "./types";

export interface StartResult {
  rec: StageRecord;
  created: boolean;
}

/**
 * Timeline Recorder — registra inicio, fin, duración y resultado de cada
 * etapa del pipeline, respetando el orden canónico definido en StageInfo.
 */
export class TimelineRecorder {
  private stages: StageRecord[] = [];

  constructor(private readonly infos: StageInfo[]) {}

  get(id: string): StageRecord | undefined {
    return this.stages.find((s) => s.id === id);
  }

  status(id: string): StageRecord["status"] | undefined {
    return this.get(id)?.status;
  }

  isStarted(id: string): boolean {
    return this.stages.some((s) => s.id === id);
  }

  /** Primera etapa del flujo canónico que aún no tiene registro. */
  firstPending(): StageInfo | null {
    return this.infos.find((i) => !this.stages.some((s) => s.id === i.id)) ?? null;
  }

  start(id: string, note?: string): StartResult | null {
    const info = this.infos.find((i) => i.id === id);
    if (!info) return null;
    const existing = this.get(id);
    if (existing) return { rec: existing, created: false };
    const rec: StageRecord = {
      id,
      name: info.name,
      status: "running",
      startedAt: Date.now(),
      anomalyIds: [],
      ...(note ? { note } : {}),
    };
    this.stages.push(rec);
    return { rec, created: true };
  }

  complete(id: string, result?: unknown, note?: string): StageRecord | null {
    const rec = this.get(id);
    if (!rec || rec.status !== "running") return null;
    rec.status = "completed";
    rec.finishedAt = Date.now();
    rec.durationMs = rec.finishedAt - rec.startedAt;
    if (result !== undefined) rec.result = result;
    if (note) rec.note = note;
    return rec;
  }

  fail(id: string, result?: unknown, note?: string): StageRecord | null {
    const rec = this.get(id);
    if (!rec || rec.status !== "running") return null;
    rec.status = "failed";
    rec.finishedAt = Date.now();
    rec.durationMs = rec.finishedAt - rec.startedAt;
    if (result !== undefined) rec.result = result;
    if (note) rec.note = note;
    return rec;
  }

  skip(id: string, note?: string): StageRecord | null {
    const info = this.infos.find((i) => i.id === id);
    if (!info) return null;
    const existing = this.get(id);
    if (existing) return existing;
    const rec: StageRecord = {
      id,
      name: info.name,
      status: "skipped",
      startedAt: Date.now(),
      anomalyIds: [],
      ...(note ? { note } : {}),
    };
    this.stages.push(rec);
    return rec;
  }

  markAnomaly(stageId: string, anomalyId: string): void {
    const rec = this.get(stageId);
    if (rec && !rec.anomalyIds.includes(anomalyId)) rec.anomalyIds.push(anomalyId);
  }

  running(): StageRecord[] {
    return this.stages.filter((s) => s.status === "running");
  }

  all(): StageRecord[] {
    return [...this.stages];
  }

  reset(): void {
    this.stages = [];
  }
}
