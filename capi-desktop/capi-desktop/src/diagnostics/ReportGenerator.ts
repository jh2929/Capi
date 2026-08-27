import { analyzeSession } from "./ErrorAnalyzer";
import { sanitizeUrl, urlSignature } from "./urlUtils";
import type {
  BackendInfo,
  DiagnosticReport,
  PlaybackSession,
  StageInfo,
  TimelineItem,
} from "./types";

const SEVERITY_LABEL: Record<string, string> = {
  info: "Info",
  warning: "Advertencia",
  error: "Error",
  critical: "Crítico",
};

const TIMELINE_GLYPH = { ok: "✔", fail: "✖", running: "⏳", skipped: "➖" } as const;

/**
 * Report Generator — construye el reporte estructurado a partir de una
 * sesión y lo serializa a Markdown, portapapeles o archivo .md.
 */
export function buildDiagnosticReport(
  session: PlaybackSession | null,
  backendInfo: BackendInfo | null,
  stageInfos: StageInfo[],
): DiagnosticReport {
  const analysis = analyzeSession(session, stageInfos);
  const s = session;
  const failureEvt = s ? [...s.events].reverse().find((e) => e.type === "playback.failed") : undefined;
  const errorPayload =
    failureEvt && typeof failureEvt.payload.error === "object"
      ? (failureEvt.payload.error as { name?: string; message?: string; stack?: string })
      : undefined;

  const timeline: TimelineItem[] = s
    ? stageInfos
        .map((info) => {
          const rec = s.stages.find((r) => r.id === info.id);
          if (!rec) return null;
          const anomalies = s.anomalies.filter((a) => a.stageId === rec.id);
          return {
            kind: "stage",
            stageId: rec.id,
            name: rec.name,
            status:
              rec.status === "completed" ? "ok" : rec.status === "failed" ? "fail" : rec.status === "skipped" ? "skipped" : "running",
            ...(rec.durationMs !== undefined ? { durationMs: rec.durationMs } : {}),
            ...(rec.note ? { note: rec.note } : {}),
            anomalyMessages: anomalies.map((a) => a.message),
          } satisfies TimelineItem;
        })
        .filter((t): t is TimelineItem => t !== null)
    : [];

  return {
    id: `report-${Date.now().toString(36)}`,
    sessionId: s?.id ?? "n/a",
    generatedAt: new Date().toISOString(),
    summary: analysis.summary,
    explanation: analysis.explanation,
    possibleCauses: analysis.possibleCauses,
    timeline,
    anomalies: s ? [...s.anomalies] : [],
    technical: {
      timestamp: s ? new Date(s.startedAt).toISOString() : new Date().toISOString(),
      thread: failureEvt?.thread ?? "UI (WebView renderer)",
      os: backendInfo
        ? `${backendInfo.os} ${backendInfo.arch}`
        : `${typeof navigator !== "undefined" ? navigator.platform : "desconocido"}`,
      appVersion: backendInfo?.app_version ?? "no disponible",
      backendVersion: backendInfo?.backend_version ?? "no expuesta",
      sessionId: s?.id ?? "n/a",
      ...(s?.trackId ? { trackId: s.trackId } : {}),
      ...(s?.trackTitle ? { trackTitle: s.trackTitle } : {}),
      ...(s?.trackArtist ? { trackArtist: s.trackArtist } : {}),
      ...(s?.streamUrl ? { streamUrl: sanitizeUrl(s.streamUrl) } : {}),
      ...(s?.streamUrl ? { urlSignature: urlSignature(s.streamUrl) } : {}),
      ...(errorPayload?.stack ? { stacktrace: errorPayload.stack } : {}),
      ...(errorPayload?.message ? { originalError: errorPayload.message } : {}),
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
      retries: s?.attempts ?? 0,
      source: s?.source ?? "desconocida",
    },
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function reportToMarkdown(report: DiagnosticReport): string {
  const t = report.technical;
  const lines: string[] = [];

  lines.push("# Diagnóstico de reproducción", "");
  lines.push(`- **Fecha:** ${t.timestamp}`);
  lines.push(`- **Versión:** ${t.appVersion}`);
  lines.push(`- **Sistema operativo:** ${t.os}`);
  lines.push(`- **Sesión:** ${t.sessionId}`);
  lines.push(`- **Canción:** ${t.trackTitle ?? "—"}${t.trackArtist ? ` — ${t.trackArtist}` : ""}${t.trackId ? ` (\`${t.trackId}\`)` : ""}`);
  lines.push("");

  lines.push("## Flujo", "");
  for (const item of report.timeline) {
    const glyph = TIMELINE_GLYPH[item.status];
    const dur = item.durationMs !== undefined ? ` — ${formatDuration(item.durationMs)}` : "";
    const note = item.note ? ` — ${item.note}` : "";
    const anomalies =
      item.anomalyMessages.length > 0 ? ` — ${item.anomalyMessages.join("; ")}` : "";
    lines.push(`${glyph} ${item.name}${dur}${note}${anomalies}`);
  }
  lines.push("");

  lines.push("## Error", "");
  lines.push(`- **Nombre:** ${report.summary.name}`);
  lines.push(`- **Componente:** ${report.summary.component}`);
  lines.push(`- **Etapa:** ${report.summary.stage}`);
  lines.push(`- **Severidad:** ${SEVERITY_LABEL[report.summary.severity] ?? report.summary.severity}`);
  lines.push("");
  lines.push(report.summary.message);
  lines.push("");

  lines.push("## Diagnóstico", "", report.explanation, "");

  if (report.possibleCauses.length > 0) {
    lines.push("## Posible causa", "");
    for (const c of report.possibleCauses) lines.push(`- ${c}`);
    lines.push("");
  }

  if (report.anomalies.length > 0) {
    lines.push("## Anomalías registradas", "");
    for (const a of report.anomalies) {
      lines.push(`- [${SEVERITY_LABEL[a.severity] ?? a.severity}] ${a.message} (\`${a.code}\` — ${a.detectorId})`);
    }
    lines.push("");
  }

  lines.push("## Información técnica", "");
  lines.push(`- **Timestamp:** ${t.timestamp}`);
  lines.push(`- **Hilo:** ${t.thread}`);
  lines.push(`- **Sistema operativo:** ${t.os}`);
  lines.push(`- **Versión de la aplicación:** ${t.appVersion}`);
  lines.push(`- **Versión del backend:** ${t.backendVersion}`);
  lines.push(`- **ID de sesión:** ${t.sessionId}`);
  lines.push(`- **Canción solicitada:** ${t.trackTitle ?? "—"} (${t.trackId ?? "sin id"})`);
  lines.push(`- **URL del stream:** ${t.streamUrl ?? "(no se obtuvo)"}`);
  lines.push(`- **Firma de URL:** ${t.urlSignature ?? "n/a"}`);
  lines.push(`- **Reintentos:** ${t.retries}`);
  lines.push(`- **Origen:** ${t.source}`);
  lines.push(`- **Con conexión:** ${t.online ? "sí" : "no"}`);
  lines.push("");

  if (t.originalError) {
    lines.push("## Excepción original", "", `\`\`\`\n${t.originalError}\n\`\`\``, "");
  }
  if (t.stacktrace) {
    lines.push("## Stacktrace", "", `\`\`\`\n${t.stacktrace}\n\`\`\``, "");
  }

  lines.push("---", "", "_Generado por el sistema de diagnóstico de Capi._");
  return lines.join("\n");
}

export function downloadMarkdown(report: DiagnosticReport): void {
  const markdown = reportToMarkdown(report);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const a = document.createElement("a");
  a.href = url;
  a.download = `capi-diagnostico-${stamp}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyReportToClipboard(report: DiagnosticReport): Promise<boolean> {
  const markdown = reportToMarkdown(report);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(markdown);
      return true;
    }
  } catch {
    /* fallback abajo */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = markdown;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
