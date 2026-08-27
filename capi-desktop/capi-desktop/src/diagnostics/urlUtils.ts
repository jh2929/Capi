import type { UrlValidation } from "./types";

/**
 * Utilidades de validación y saneamiento de URLs de stream.
 * Las URLs firmadas de YouTube Music contienen parámetros sensibles
 * (expire, pot, firma), por lo que nunca se muestran completas: se
 * sanitizan para el reporte y se conserva solo una firma corta.
 */

/** Devuelve la URL interna de un stream envuelto por el proxy local. */
export function extractInnerUrl(url: string): string | null {
  const inner = extractQueryParam(url, "url");
  if (inner === null) return null;
  return inner.length > 0 ? inner : null;
}

function extractQueryParam(url: string, name: string): string | null {
  try {
    return new URL(url).searchParams.get(name);
  } catch {
    const m = url.match(new RegExp(`[?&]${name}=([^&]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }
}

export function validateStreamUrl(raw?: string | null): UrlValidation {
  const checks: { name: string; ok: boolean; detail?: string }[] = [];
  const url = (raw ?? "").trim();
  const push = (name: string, ok: boolean, detail?: string) =>
    checks.push({ name, ok, ...(detail ? { detail } : {}) });

  push("url_no_vacia", url.length > 0 && url !== "null" && url !== "undefined");
  push("esquema_http", /^https?:\/\//i.test(url));

  const inner = extractInnerUrl(url);
  if (inner !== null) {
    push("url_interna_no_vacia", inner.trim().length > 0 && inner !== "null");
    push("esquema_interno_http", /^https?:\/\//i.test(inner));
  }

  const target = inner ?? url;
  try {
    const expireRaw = new URL(target).searchParams.get("expire");
    if (expireRaw && /^\d+$/.test(expireRaw)) {
      const expire = parseInt(expireRaw, 10);
      const now = Math.floor(Date.now() / 1000);
      const valid = expire > now - 60;
      push("url_vigente", valid, `expire=${expire} (${valid ? "vigente" : "expirada"})`);
    }
  } catch {
    /* esquema inválido: ya reportado por el check de esquema */
  }

  const failed = checks.filter((c) => !c.ok);
  const kind: UrlValidation["kind"] =
    failed.length === 0
      ? "ok"
      : failed[0].name === "url_no_vacia"
        ? "empty"
        : failed[0].name === "esquema_http" || failed[0].name === "esquema_interno_http"
          ? "scheme"
          : failed[0].name === "url_vigente"
            ? "expired"
            : "proxy";

  return {
    ok: failed.length === 0,
    kind,
    checks,
    summary:
      failed.length === 0
        ? "URL de stream válida"
        : failed.map((c) => `${c.name.replace(/_/g, " ")}${c.detail ? ` (${c.detail})` : ""}`).join("; "),
  };
}

function sanitizeSimple(url: string): string {
  try {
    const parsed = new URL(url);
    const nParams = parsed.search ? parsed.search.split("&").length : 0;
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${
      nParams ? `?… (${nParams} parámetros ocultos)` : ""
    }`;
  } catch {
    return `(no es una URL http válida: ${url.slice(0, 60)})`;
  }
}

/**
 * Devuelve una representación segura de la URL para mostrar en reportes:
 * esquema, host y ruta, con los parámetros de firma ocultos.
 */
export function sanitizeUrl(url?: string | null): string {
  if (!url) return "(vacía)";
  const trimmed = url.trim();
  if (trimmed === "null" || trimmed === "undefined") return trimmed;
  const inner = extractInnerUrl(trimmed);
  if (inner !== null) {
    return `${sanitizeSimple(trimmed)} → stream interno: ${sanitizeSimple(inner)}`;
  }
  return sanitizeSimple(trimmed);
}

/** Firma corta (hash no criptográfico) de la URL completa para correlación. */
export function urlSignature(url?: string | null): string {
  if (!url) return "n/a";
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `0x${(h >>> 0).toString(16).padStart(8, "0")}`;
}
