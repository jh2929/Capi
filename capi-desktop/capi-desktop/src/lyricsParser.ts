export interface LyricLine {
  time: number; // in seconds (-1 if unsynced)
  text: string;
}

export interface LyricsParseResult {
  isSynced: boolean;
  lines: LyricLine[];
  plainLines: LyricLine[];
  rawText: string;
}

/**
 * Parses time string (e.g. "01:23.45", "1:23.456", "01:23", "00:01:23.45") into seconds.
 */
function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length === 2) {
    const min = parseFloat(parts[0]);
    const sec = parseFloat(parts[1]);
    if (!isNaN(min) && !isNaN(sec)) {
      return min * 60 + sec;
    }
  } else if (parts.length === 3) {
    const hr = parseFloat(parts[0]);
    const min = parseFloat(parts[1]);
    const sec = parseFloat(parts[2]);
    if (!isNaN(hr) && !isNaN(min) && !isNaN(sec)) {
      return hr * 3600 + min * 60 + sec;
    }
  } else if (parts.length === 1) {
    const sec = parseFloat(parts[0]);
    if (!isNaN(sec)) return sec;
  }
  return null;
}

/**
 * Robust lyrics parser and synchronization detector.
 * Supports standard LRC [mm:ss.xx], [mm:ss.xxx], [mm:ss], [hh:mm:ss.xx],
 * multiple timestamps per line, TTML/XML timestamps, and natural plain text.
 */
export function parseAndDetectLyrics(rawLyrics: string, _trackDuration?: number): LyricsParseResult {
  if (!rawLyrics || !rawLyrics.trim()) {
    return {
      isSynced: false,
      lines: [],
      plainLines: [],
      rawText: ""
    };
  }

  let text = rawLyrics.trim();

  // Normalize TTML / XML lyrics if raw XML was received
  if (text.startsWith("<?xml") || text.startsWith("<tt") || text.includes("<p begin=")) {
    const ttmlRegex = /<p[^>]*begin="([^"]+)"[^>]*>([\s\S]*?)<\/p>/gi;
    const convertedLines: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = ttmlRegex.exec(text)) !== null) {
      const begin = match[1];
      const content = match[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
      if (content) {
        convertedLines.push(`[${begin}]${content}`);
      }
    }
    if (convertedLines.length > 0) {
      text = convertedLines.join("\n");
    }
  }

  const rawLines = text.split(/\r?\n/);
  const syncedLines: LyricLine[] = [];
  const plainLines: LyricLine[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Ignore metadata header tags like [ar:...], [ti:...], [length:...], [offset:...]
    if (/^\[(ar|ti|al|by|length|offset|re|ve|tool|encoding):/i.test(trimmed)) {
      continue;
    }

    // Match all timestamp tags like [00:12.34], [0:12.345], [00:12], [00:00:12.34], <00:12.34>
    const tagRegex = /(?:\[|<)(\d{1,2}:\d{2}(?:[.:]\d{1,3})?|\d{1,2}:\d{2}:\d{2}(?:[.:]\d{1,3})?)(?:\]|>)/g;
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = tagRegex.exec(trimmed)) !== null) {
      matches.push(m[1]);
    }

    // Clean text by stripping all timestamp tags and inline brackets
    const cleanText = trimmed
      .replace(/(?:\[|<)(?:\d{1,2}:\d{2}(?:[.:]\d{1,3})?|\d{1,2}:\d{2}:\d{2}(?:[.:]\d{1,3})?)(?:\]|>)/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (cleanText.length > 0) {
      plainLines.push({
        time: -1,
        text: cleanText
      });
    }

    if (matches.length > 0 && cleanText.length > 0) {
      for (const timeStr of matches) {
        const timeSec = parseTimeToSeconds(timeStr);
        if (timeSec !== null && timeSec >= 0) {
          syncedLines.push({
            time: timeSec,
            text: cleanText
          });
        }
      }
    }
  }

  // Sort synced lines chronologically
  syncedLines.sort((a, b) => a.time - b.time);

  // If we found any valid synced lines with timestamps, mark as synced!
  const isSynced = syncedLines.length >= 1;

  return {
    isSynced,
    lines: isSynced ? syncedLines : plainLines,
    plainLines: plainLines.length > 0 ? plainLines : syncedLines.map(l => ({ time: -1, text: l.text })),
    rawText: rawLyrics
  };
}
