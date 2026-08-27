import { useState, useEffect, useRef } from "react";
import { Music } from "lucide-react";
import { getCachedThumbnail, setCachedThumbnail } from "./thumbnailCache";

const QUALITY_TRANSFORMS = [
  (url: string) => url.replace(/=w\d+-h\d+/, "=w600-h600").replace(/=s\d+/, "=s600").replace("/default.jpg", "/hqdefault.jpg"),
  (url: string) => url.replace(/=w\d+-h\d+/, "=w300-h300").replace(/=s\d+/, "=s300"),
];

const stringToColor = (s: string) => {
  let hash = 0;
  for (let i = 0; i < (s?.length || 0); i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 30%, 20%)`;
};

interface SafeImageProps {
  trackId?: string;
  src: string;
  alt?: string;
  className?: string;
  size?: number;
}

export default function SafeImage({ trackId, src, alt, className = "", size }: SafeImageProps) {
  const [state, setState] = useState<"loading" | "cache" | "network" | "placeholder">("loading");
  const [qualityIndex, setQualityIndex] = useState(0);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!src) {
      setState("placeholder");
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (trackId) {
        const cached = await getCachedThumbnail(trackId);
        if (cancelled) return;
        if (cached) {
          objectUrlRef.current = cached;
          if (mountedRef.current) {
            setDisplaySrc(cached);
            setState("cache");
          }
          return;
        }
      }

      if (mountedRef.current) {
        setQualityIndex(0);
        setDisplaySrc(QUALITY_TRANSFORMS[0](src));
        setState("network");
      }
    };

    load();

    return () => { cancelled = true; };
  }, [src, trackId]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleImageError = () => {
    const next = qualityIndex + 1;
    if (next >= QUALITY_TRANSFORMS.length) {
      setState("placeholder");
    } else {
      setQualityIndex(next);
      setDisplaySrc(QUALITY_TRANSFORMS[next](src));
    }
  };

  const handleImageLoad = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (state === "network" && qualityIndex === 0 && trackId && src) {
      try {
        const img = e.currentTarget;
        const resp = await fetch(img.src);
        const blob = await resp.blob();
        await setCachedThumbnail(trackId, blob);
      } catch {
        // cache best-effort
      }
    }
  };

  if (state === "placeholder") {
    const color = stringToColor(alt || trackId || "");
    const s = size || 48;
    return (
      <div
        className={className}
        style={{ width: s, height: s, background: color, minWidth: s, minHeight: s }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Music className="text-white/40" style={{ width: s * 0.35, height: s * 0.35 }} />
        </div>
      </div>
    );
  }

  return (
    <img
      src={displaySrc || src}
      alt={alt || ""}
      className={className}
      onError={handleImageError}
      onLoad={handleImageLoad}
      draggable={false}
    />
  );
}
