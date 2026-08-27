import { useState } from "react";
import { Copy, Download, X, Check } from "lucide-react";
import { copyReportToClipboard, downloadMarkdown } from "./ReportGenerator";
import type { DiagnosticReport, TimelineItem } from "./types";

const SEVERITY_STYLES: Record<string, { label: string; badge: string; accent: string }> = {
  info: { label: "Info", badge: "bg-sky-500/15 text-sky-300 border-sky-400/30", accent: "text-sky-300" },
  warning: { label: "Advertencia", badge: "bg-amber-500/15 text-amber-300 border-amber-400/30", accent: "text-amber-300" },
  error: { label: "Error", badge: "bg-red-500/15 text-red-300 border-red-400/30", accent: "text-red-300" },
  critical: { label: "Crítico", badge: "bg-red-600/25 text-red-200 border-red-400/50", accent: "text-red-200" },
};

const TIMELINE_ICON: Record<TimelineItem["status"], { glyph: string; cls: string }> = {
  ok: { glyph: "✔", cls: "text-emerald-400" },
  fail: { glyph: "✖", cls: "text-red-400" },
  running: { glyph: "⏳", cls: "text-amber-300" },
  skipped: { glyph: "➖", cls: "text-text-secondary/50" },
};

function formatDuration(ms?: number): string {
  if (ms === undefined) return "";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(120px,190px)_1fr] gap-3 items-baseline py-1.5 border-b border-white/5 last:border-0">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className={`text-xs break-all ${mono ? "font-mono" : ""} ${value.startsWith("(no") ? "text-text-secondary/70" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

export default function DiagnosticModal({
  report,
  onClose,
}: {
  report: DiagnosticReport;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const sev = SEVERITY_STYLES[report.summary.severity] ?? SEVERITY_STYLES.error;
  const tech = report.technical;

  const handleCopy = async () => {
    const ok = await copyReportToClipboard(report);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[95] animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4 border-b border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <span className="w-6 h-6 rounded-full bg-red-500/25 text-red-300 font-bold text-sm flex items-center justify-center">
              !
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white leading-tight">Diagnóstico de reproducción</h3>
            <p className={`text-sm font-semibold mt-0.5 ${sev.accent}`}>{report.summary.name}</p>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">{report.summary.message}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${sev.badge}`}>
              {sev.label}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Resumen */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2.5">Resumen</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Error", value: report.summary.name },
                { label: "Componente", value: report.summary.component },
                { label: "Etapa", value: report.summary.stage },
                { label: "Canción", value: `${tech.trackTitle ?? "—"}${tech.trackArtist ? ` · ${tech.trackArtist}` : ""}` },
              ].map((row) => (
                <div key={row.label} className="rounded-xl bg-white/5 border border-white/5 p-3 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary mb-1">{row.label}</p>
                  <p className="text-sm text-white truncate" title={row.value}>
                    {row.value || "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Diagnóstico */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2.5">Diagnóstico</h4>
            <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-3">
              {report.explanation.split("\n\n").map((paragraph, i) => (
                <p key={i} className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {paragraph}
                </p>
              ))}
              {report.possibleCauses.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {report.possibleCauses.map((cause, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-brand-primary font-bold flex-shrink-0">→</span>
                      <span className="text-text-primary/90">{cause}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Línea temporal */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2.5">Línea temporal</h4>
            <div className="rounded-xl bg-white/5 border border-white/5 overflow-hidden">
              {report.timeline.length === 0 && (
                <p className="text-sm text-text-secondary p-4">No se registraron etapas.</p>
              )}
              {report.timeline.map((item, i) => {
                const icon = TIMELINE_ICON[item.status];
                const isLast = i === report.timeline.length - 1;
                return (
                  <div key={item.stageId} className="relative flex gap-3 px-4 py-2.5">
                    {!isLast && (
                      <span className="absolute left-[26px] top-8 bottom-0 w-px bg-white/10" />
                    )}
                    <span className={`w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs flex-shrink-0 z-10 ${icon.cls}`}>
                      {icon.glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${item.status === "fail" ? "text-red-300" : "text-white"}`}>
                          {item.name}
                        </span>
                        {item.durationMs !== undefined && (
                          <span className="text-[11px] text-text-secondary font-mono">{formatDuration(item.durationMs)}</span>
                        )}
                        {item.status === "running" && (
                          <span className="text-[11px] text-amber-300/80">en curso…</span>
                        )}
                      </div>
                      {item.note && <p className="text-xs text-text-secondary/80 mt-0.5">{item.note}</p>}
                      {item.anomalyMessages.map((msg, j) => (
                        <p key={j} className="text-xs text-red-300/90 mt-0.5">✖ {msg}</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Información técnica */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2.5">Información técnica</h4>
            <div className="rounded-xl bg-white/5 border border-white/5 px-4 py-2">
              <dl>
                <InfoRow label="Timestamp" value={tech.timestamp} mono />
                <InfoRow label="Hilo" value={tech.thread} />
                <InfoRow label="Sistema operativo" value={tech.os} />
                <InfoRow label="Versión de la app" value={tech.appVersion} />
                <InfoRow label="Versión del backend" value={tech.backendVersion} />
                <InfoRow label="ID de sesión" value={tech.sessionId} mono />
                <InfoRow label="Canción" value={`${tech.trackTitle ?? "—"}${tech.trackId ? ` (${tech.trackId})` : ""}`} />
                <InfoRow label="URL del stream" value={tech.streamUrl ?? "(no se obtuvo)"} mono />
                {tech.urlSignature && <InfoRow label="Firma de URL" value={tech.urlSignature} mono />}
                <InfoRow label="Reintentos" value={String(tech.retries)} />
                <InfoRow label="Origen" value={tech.source} />
                <InfoRow label="Con conexión" value={tech.online ? "sí" : "no"} />
                {tech.originalError && <InfoRow label="Excepción original" value={tech.originalError} mono />}
              </dl>
              {tech.stacktrace && (
                <pre className="mt-3 p-3 rounded-lg bg-black/30 border border-white/5 text-[11px] font-mono text-text-secondary overflow-x-auto max-h-40">
                  {tech.stacktrace}
                </pre>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 p-5 pt-3 border-t border-white/5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-all duration-200 active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar diagnóstico"}
          </button>
          <button
            onClick={() => downloadMarkdown(report)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary/90 hover:bg-brand-primary text-white text-sm font-medium transition-all duration-200 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Exportar (.md)
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-sm font-medium transition-all duration-200 active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
