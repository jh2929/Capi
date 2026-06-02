import { useState, useRef, useEffect, useCallback } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { 
  Play, Pause, SkipForward, SkipBack, Search, Music, Volume2, 
  ListMusic, Heart, Loader2, Sparkles, ChevronLeft,
  Trash2, Home, Library, Download, Shuffle, 
  MoreVertical, X, Sparkle, GripVertical, Copy, RefreshCw,
  User, Radio, Mic2, LayoutGrid, List, Plus
} from "lucide-react";
import "./App.css";

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  thumbnail: string;
  explicit: boolean;
  artistId?: string;
}

const getHighQualityThumbnail = (url: string) => {
  if (!url) return url;
  let hq = url;
  hq = hq.replace(/=w\d+-h\d+/, "=w600-h600");
  hq = hq.replace(/=s\d+/, "=s600");
  hq = hq.replace("/default.jpg", "/hqdefault.jpg");
  return hq;
};

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300";
};

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

interface LyricLine {
  time: number;
  text: string;
}

// Static genre grid for Explore (no API call)
const EXPLORE_GENRES = [
  { name: "Pop", color: "#e91e63" },
  { name: "Rock", color: "#9c27b0" },
  { name: "Hip Hop", color: "#ff9800" },
  { name: "R&B", color: "#3f51b5" },
  { name: "Reggaeton", color: "#4caf50" },
  { name: "Electrónica", color: "#00bcd4" },
  { name: "Jazz", color: "#795548" },
  { name: "Clásica", color: "#607d8b" },
  { name: "Country", color: "#ff5722" },
  { name: "Metal", color: "#424242" },
  { name: "Indie", color: "#8bc34a" },
  { name: "K-Pop", color: "#e040fb" },
  { name: "Latin", color: "#ff6f00" },
  { name: "Blues", color: "#1a237e" },
  { name: "Soul", color: "#6d4c41" },
  { name: "Funk", color: "#d500f9" },
  { name: "Punk", color: "#b71c1c" },
  { name: "Trap", color: "#263238" },
  { name: "Lo-Fi", color: "#5c6bc0" },
  { name: "Acoustic", color: "#a1887f" },
  { name: "Reggae", color: "#2e7d32" },
  { name: "Salsa", color: "#ef6c00" },
  { name: "Bachata", color: "#c62828" },
  { name: "Cumbia", color: "#00897b" },
];

// Home fallback genre queries without emojis (English & Spanish)
const HOME_FALLBACK_QUERIES = [
  { title: "Pop Hits", query: "pop hits 2025" },
  { title: "Reggaeton", query: "reggaeton éxitos 2025" },
  { title: "Rock Clásico", query: "classic rock greatest hits" },
  { title: "Hip Hop", query: "hip hop trending 2025" },
  { title: "Electrónica", query: "electronic dance music hits" },
  { title: "Baladas en Español", query: "baladas en español románticas" },
  { title: "R&B Soul", query: "r&b soul hits" },
  { title: "Indie", query: "indie alternative 2025" },
];

const convertYTItemToTrack = (item: any): Track => ({
  id: item.id || item.browseId,
  title: item.title,
  artist: item.artists ? item.artists.join(", ") : (item.author && item.author !== "YT Music" ? item.author : "Artista Desconocido"),
  album: item.album || "",
  duration: item.duration || 0,
  thumbnail: item.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300",
  explicit: item.explicit || false
});

const getSectionIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("pop")) return <Sparkles className="w-4 h-4 text-brand-primary" />;
  if (t.includes("reggaeton") || t.includes("urbano")) return <Sparkle className="w-4 h-4 text-brand-primary animate-pulse" />;
  if (t.includes("rock") || t.includes("metal")) return <Music className="w-4 h-4 text-brand-primary" />;
  if (t.includes("hip hop") || t.includes("rap") || t.includes("trap")) return <Mic2 className="w-4 h-4 text-brand-primary" />;
  if (t.includes("electro") || t.includes("dance")) return <Radio className="w-4 h-4 text-brand-primary" />;
  if (t.includes("balada") || t.includes("románt")) return <Heart className="w-4 h-4 text-brand-primary fill-brand-primary/20" />;
  if (t.includes("indie")) return <Sparkles className="w-4 h-4 text-brand-primary" />;
  return <Music className="w-4 h-4 text-brand-primary" />;
};

function App() {
  const [activeTab, setActiveTab] = useState<"home" | "explore" | "buscar" | "biblioteca" | "playlists" | "favoritos" | "artist">("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("opentune_sidebar_collapsed") === "true";
  });
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [activeQueue, setActiveQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [searchViewMode, setSearchViewMode] = useState<"grid" | "list">("grid");
  const [artistCardData, setArtistCardData] = useState<{ id: string; name: string; thumbnail: string; banner: string } | null>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const streamCacheRef = useRef<Record<string, string>>({});
  const nextRandomIndexRef = useRef<number | null>(null);
  
  // Dynamic recommendations & Explore state
  const [homeSections, setHomeSections] = useState<any[]>([]);
  const [artistData, setArtistData] = useState<any>(null);
  const [loadingArtist, setLoadingArtist] = useState(false);
  
  // Persisted state
  const [favorites, setFavorites] = useState<Track[]>(() => {
    const saved = localStorage.getItem("opentune_favorites");
    return saved ? JSON.parse(saved) : [];
  });
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem("opentune_playlists");
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState<Track[]>(() => {
    const saved = localStorage.getItem("opentune_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [downloads, setDownloads] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("opentune_downloads");
    return saved ? JSON.parse(saved) : {};
  });
  const [downloadedMetadata, setDownloadedMetadata] = useState<Track[]>(() => {
    const saved = localStorage.getItem("opentune_downloaded_metadata");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Library views
  const [libTab, setLibTab] = useState<"downloads" | "history">("downloads");
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [showSelectionMode, setShowSelectionMode] = useState(false);

  // Player expansions and context menus
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [contextMenuTrack, setContextMenuTrack] = useState<Track | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState<Track | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Live lyrics state
  const [lyricsText, setLyricsText] = useState<string>("");
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Player tabs: queue, lyrics, related
  const [playerTab, setPlayerTab] = useState<"queue" | "lyrics" | "related">("lyrics");
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const [lyricsMenuOpen, setLyricsMenuOpen] = useState(false);

  // Swipe Gestures on Player Cover
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Audio controls state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("opentune_volume");
    return saved ? parseFloat(saved) : 0.8;
  });
  const [buffering, setBuffering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [localPort, setLocalPort] = useState<number | null>(null);

  // Fetch local server port on mount
  useEffect(() => {
    invoke<number>("obtener_local_port").then(port => {
      setLocalPort(port);
    }).catch(err => {
      console.error("Error al obtener el puerto del servidor local:", err);
    });
  }, []);

  // Search suggestions & history
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("opentune_search_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const suggestTimerRef = useRef<any>(null);

  // Drag and drop for queue
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Listen to download progress events from Rust
  useEffect(() => {
    const unlisten = listen<{ track_id: string; progress: number }>("download-progress", (event) => {
      setDownloadProgress(prev => ({
        ...prev,
        [event.payload.track_id]: Math.round(event.payload.progress)
      }));
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Sync to LocalStorage
  useEffect(() => { localStorage.setItem("opentune_favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("opentune_playlists", JSON.stringify(playlists)); }, [playlists]);
  useEffect(() => { localStorage.setItem("opentune_history", JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem("opentune_downloads", JSON.stringify(downloads)); }, [downloads]);
  useEffect(() => { localStorage.setItem("opentune_downloaded_metadata", JSON.stringify(downloadedMetadata)); }, [downloadedMetadata]);
  useEffect(() => { localStorage.setItem("opentune_sidebar_collapsed", String(sidebarCollapsed)); }, [sidebarCollapsed]);
  useEffect(() => { localStorage.setItem("opentune_search_history", JSON.stringify(searchHistory)); }, [searchHistory]);
  useEffect(() => {
    localStorage.setItem("opentune_volume", String(volume));
    if (audioRef.current) { audioRef.current.volume = volume; }
  }, [volume]);

  // ESC key to close expanded player
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPlayerExpanded) {
        setIsPlayerExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPlayerExpanded]);

  const getNextTrackToPlay = useCallback((): Track | null => {
    if (activeQueue.length === 0) return null;
    
    if (isShuffle) {
      if (nextRandomIndexRef.current === null || nextRandomIndexRef.current >= activeQueue.length) {
        nextRandomIndexRef.current = Math.floor(Math.random() * activeQueue.length);
      }
      return activeQueue[nextRandomIndexRef.current];
    }

    const currentIndex = activeQueue.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex !== -1 && currentIndex < activeQueue.length - 1) {
      return activeQueue[currentIndex + 1];
    } else {
      return activeQueue[0];
    }
  }, [activeQueue, currentTrack, isShuffle]);

  // Preload the next track's stream URL in background
  useEffect(() => {
    if (!currentTrack) return;
    const nextTrack = getNextTrackToPlay();
    if (nextTrack && !downloads[nextTrack.id] && !streamCacheRef.current[nextTrack.id]) {
      invoke<string>("obtener_stream", { id: nextTrack.id }).then(resultJson => {
        let stream = resultJson;
        try {
          const parsed = JSON.parse(resultJson);
          if (parsed.streamUrl) stream = parsed.streamUrl;
          else if (parsed.url) stream = parsed.url;
        } catch {}
        if (stream.startsWith('"') && stream.endsWith('"')) {
          stream = stream.substring(1, stream.length - 1);
        }
        streamCacheRef.current[nextTrack.id] = stream;
        console.log(`[PRELOAD] Cache hit preloaded for next track: ${nextTrack.title}`);
      }).catch(err => {
        console.error("[PRELOAD] Failed preloading track stream:", err);
      });
    }
  }, [currentTrack?.id, activeQueue, isShuffle, getNextTrackToPlay, downloads]);

  // Load Homepage dynamic recommendations
  useEffect(() => { fetchHomeData(); }, []);

  // Synchronized lyrics updater
  useEffect(() => {
    if (parsedLyrics.length === 0) return;
    const index = parsedLyrics.findIndex((line, i) => {
      const nextLine = parsedLyrics[i + 1];
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });
    if (index !== -1 && index !== currentLyricIndex) {
      setCurrentLyricIndex(index);
      const activeEl = document.getElementById(`lyric-line-${index}`);
      if (activeEl && lyricsContainerRef.current) {
        lyricsContainerRef.current.scrollTo({
          top: activeEl.offsetTop - lyricsContainerRef.current.clientHeight / 2 + activeEl.clientHeight / 2,
          behavior: "smooth"
        });
      }
    }
  }, [currentTime, parsedLyrics]);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (currentTrack) {
      fetchLyrics(currentTrack);
      fetchRelatedTracks(currentTrack.artist);
    }
  }, [currentTrack?.id]);



  // Load artist card data in background when search results change
  useEffect(() => {
    const card = getArtistCardFromResults();
    const firstTrack = tracks[0];
    if (card && firstTrack && firstTrack.artistId) {
      invoke<string>("obtener_artista", { id: firstTrack.artistId }).then(res => {
        const data = JSON.parse(res);
        setArtistCardData({
          id: firstTrack.artistId!,
          name: data.name || card.name,
          thumbnail: getHighQualityThumbnail(data.thumbnail || card.thumbnail),
          banner: getHighQualityThumbnail(data.thumbnail || "")
        });
      }).catch(e => {
        console.error("Error fetching artist details for card:", e);
        setArtistCardData({
          id: firstTrack.artistId!,
          name: card.name,
          thumbnail: getHighQualityThumbnail(card.thumbnail),
          banner: ""
        });
      });
    } else {
      setArtistCardData(null);
    }
  }, [tracks]);

  const fetchHomeData = async () => {
    try {
      const response = await invoke<string>("obtener_home", { continuation: null });
      const parsed = JSON.parse(response);
      if (parsed && parsed.sections && parsed.sections.length > 0) {
        setHomeSections(parsed.sections);
        return;
      }
    } catch (e) {
      console.error("Failed to load dynamic home data:", e);
    }
    // Fallback: fetch multiple genre searches
    loadHomeFallback();
  };

  const loadHomeFallback = async () => {
    const sections: any[] = [];
    for (const genre of HOME_FALLBACK_QUERIES) {
      try {
        const res = await invoke<string>("buscar_cancion", { query: genre.query });
        const data = JSON.parse(res);
        const items = (Array.isArray(data) ? data : data.tracks || data.results || []).slice(0, 8);
        if (items.length > 0) {
          sections.push({ title: genre.title, items });
        }
      } catch (e) {
        console.error(`Failed to load fallback genre ${genre.title}:`, e);
      }
    }
    setHomeSections(sections);
  };

  const loadArtistProfile = async (artistId: string) => {
    setActiveTab("artist");
    setLoadingArtist(true);
    setArtistData(null);
    try {
      const response = await invoke<string>("obtener_artista", { id: artistId });
      const parsed = JSON.parse(response);
      setArtistData(parsed);
    } catch (e) {
      console.error("Failed to fetch artist profile:", e);
    } finally {
      setLoadingArtist(false);
    }
  };

  const fetchRelatedTracks = async (artist: string) => {
    try {
      const res = await invoke<string>("buscar_cancion", { query: artist });
      const data = JSON.parse(res);
      const items: Track[] = (Array.isArray(data) ? data : data.tracks || data.results || []).map((t: any) => ({
        id: t.id, title: t.title, artist: (t.artist && t.artist !== "YT Music") ? t.artist : "Artista Desconocido",
        album: t.album || "", duration: t.duration || 0,
        thumbnail: t.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300",
        explicit: t.explicit || false
      }));
      setRelatedTracks(items.slice(0, 20));
    } catch (e) {
      setRelatedTracks([]);
    }
  };

  const fetchLyrics = async (track: Track) => {
    setLyricsText("Cargando letras...");
    setParsedLyrics([]);
    setCurrentLyricIndex(-1);
    try {
      const response = await invoke<string>("obtener_letras", {
        artist: track.artist,
        title: track.title,
        duration: Math.round(track.duration)
      });
      const parsed = JSON.parse(response);
      if (parsed && parsed.lyrics) {
        const text = parsed.lyrics;
        setLyricsText(text);
        const lines = text.split("\n");
        const lrcLines: LyricLine[] = [];
        const timeReg = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;
        lines.forEach((line: string) => {
          timeReg.lastIndex = 0;
          const match = timeReg.exec(line);
          if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = match[3] ? parseInt(match[3]) : 0;
            const time = min * 60 + sec + ms / 100;
            const rawText = line.replace(timeReg, "").trim();
            lrcLines.push({ time, text: rawText });
          } else {
            lrcLines.push({ time: -1, text: line.trim() });
          }
        });
        const syncedLines = lrcLines.filter(l => l.time >= 0);
        if (syncedLines.length > 0) {
          setParsedLyrics(syncedLines.sort((a, b) => a.time - b.time));
        } else {
          setParsedLyrics(lrcLines.map((l, i) => ({ time: i * 5, text: l.text })));
        }
      } else {
        setLyricsText("Letras no disponibles.");
      }
    } catch (e) {
      setLyricsText("No se pudieron cargar las letras.");
      console.error(e);
    }
  };

  const playTrack = async (track: Track, queueList: Track[] = []) => {
    try {
      const isCachedOrLocal = !!(downloads[track.id] || streamCacheRef.current[track.id]);
      if (!isCachedOrLocal) {
        setLoading(true);
        setBuffering(true);
      }
      setCurrentTrack(track);
      setIsPlaying(false);
      setStreamUrl(null);
      setCurrentTime(0);
      setDuration(0);

      if (queueList.length > 0) {
        setActiveQueue(queueList);
      } else if (!activeQueue.some(t => t.id === track.id)) {
        setActiveQueue(prev => [track, ...prev]);
      }

      setHistory(prev => {
        const filtered = prev.filter(t => t.id !== track.id);
        return [track, ...filtered].slice(0, 50);
      });
      
      let stream: string;
      if (downloads[track.id]) {
        const path = downloads[track.id];
        stream = `http://127.0.0.1:${localPort}/play?path=${encodeURIComponent(path)}`;
      } else if (streamCacheRef.current[track.id]) {
        stream = streamCacheRef.current[track.id];
      } else {
        const resultJson = await invoke<string>("obtener_stream", { id: track.id });
        stream = resultJson;
        try {
          const parsed = JSON.parse(resultJson);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.streamUrl) stream = parsed.streamUrl;
          else if (parsed.url) stream = parsed.url;
        } catch (err: any) {
          if (err.message && !err.message.includes("Unexpected token")) {
            throw err;
          }
          if (stream.startsWith('"') && stream.endsWith('"')) {
            stream = stream.substring(1, stream.length - 1);
          }
        }
        streamCacheRef.current[track.id] = stream;
      }

      setStreamUrl(stream);
      
      if (audioRef.current) {
        audioRef.current.src = stream;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setBuffering(false);
          setLoading(false);
        }).catch(err => {
          console.error("Playback error:", err, "for stream:", stream);
          // If local src fails, show error popup for testing clarity
          if (stream.startsWith("http://127.0.0.1")) {
            alert("No se pudo reproducir el archivo local: " + err.message);
          }
          setBuffering(false);
          setLoading(false);
        });
      }
    } catch (error) {
      console.error("Stream acquisition failed:", error);
      alert("Error al cargar la canción.");
      setLoading(false);
      setBuffering(false);
    }
  };

  const playShuffleQueue = (tracksToPlay: Track[]) => {
    if (tracksToPlay.length === 0) return;
    setIsShuffle(true);
    const shuffled = [...tracksToPlay].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], tracksToPlay);
  };

  const downloadTrack = async (track: Track) => {
    if (downloads[track.id]) return;
    try {
      let stream = "";
      const resultJson = await invoke<string>("obtener_stream", { id: track.id });
      stream = resultJson;
      try {
        const parsed = JSON.parse(resultJson);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.streamUrl) stream = parsed.streamUrl;
        else if (parsed.url) stream = parsed.url;
      } catch (err: any) {
        if (err.message && !err.message.includes("Unexpected token")) {
          throw err;
        }
        if (stream.startsWith('"') && stream.endsWith('"')) {
          stream = stream.substring(1, stream.length - 1);
        }
      }

      setDownloadProgress(prev => ({ ...prev, [track.id]: 0 }));

      const localPath = await invoke<string>("descargar_cancion", {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        url: stream
      });

      setDownloads(prev => ({ ...prev, [track.id]: localPath }));
      setDownloadedMetadata(prev => {
        if (prev.some(t => t.id === track.id)) return prev;
        return [...prev, track];
      });
    } catch (error) {
      console.error("Download failed:", error);
      alert("Error al descargar.");
    } finally {
      setDownloadProgress(prev => {
        const copy = { ...prev };
        delete copy[track.id];
        return copy;
      });
    }
  };

  const deleteLocalTrack = async (trackId: string) => {
    const path = downloads[trackId];
    if (!path) return;
    try {
      await invoke("borrar_cancion", { path });
      setDownloads(prev => {
        const copy = { ...prev };
        delete copy[trackId];
        return copy;
      });
      setDownloadedMetadata(prev => prev.filter(t => t.id !== trackId));
    } catch (e) {
      alert("No se pudo borrar el archivo: " + e);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setActiveTab("buscar");
    setLoading(true);
    setShowSearchDropdown(false);
    // Save to search history
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h !== query.trim());
      return [query.trim(), ...filtered].slice(0, 15);
    });
    try {
      const responseJson = await invoke<string>("buscar_cancion", { query });
      const data = JSON.parse(responseJson);
      
      let parsedTracks: Track[] = (Array.isArray(data) ? data : data.tracks || data.results || []).map((t: any) => ({
        id: t.id, title: t.title, artist: (t.artist && t.artist !== "YT Music") ? t.artist : "Artista Desconocido",
        album: t.album || "", duration: t.duration || 0,
        thumbnail: t.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300",
        explicit: t.explicit || false,
        artistId: t.artistId || undefined
      }));

      // Sort: first 10 from same artist as first result, then rest
      if (parsedTracks.length > 1) {
        const mainArtist = parsedTracks[0].artist.toLowerCase();
        const sameArtist = parsedTracks.filter(t => t.artist.toLowerCase() === mainArtist);
        const others = parsedTracks.filter(t => t.artist.toLowerCase() !== mainArtist);
        parsedTracks = [...sameArtist.slice(0, 10), ...others, ...sameArtist.slice(10)];
      }

      setTracks(parsedTracks);
    } catch (error: any) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch search suggestions with debounce
  const fetchSuggestions = useCallback((q: string) => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!q.trim()) { setSearchSuggestions([]); return; }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await invoke<string>("obtener_sugerencias", { query: q });
        const suggestions = JSON.parse(res);
        if (Array.isArray(suggestions)) {
          setSearchSuggestions(suggestions.slice(0, 8));
        }
      } catch (e) {
        console.error("Suggestions error:", e);
      }
    }, 300);
  }, []);

  useEffect(() => {
    fetchSuggestions(query);
  }, [query, fetchSuggestions]);

  const togglePlay = () => {
    if (!audioRef.current || !streamUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => { setIsPlaying(true); });
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) { setCurrentTime(audioRef.current.currentTime); }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) { setDuration(audioRef.current.duration); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) { audioRef.current.currentTime = val; }
  };

  const playNext = () => {
    if (activeQueue.length === 0) return;
    const nextTrack = getNextTrackToPlay();
    if (nextTrack) {
      if (isShuffle) {
        nextRandomIndexRef.current = null;
      }
      playTrack(nextTrack);
    }
  };

  const playPrev = () => {
    if (activeQueue.length === 0) return;
    const currentIndex = activeQueue.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex > 0) {
      playTrack(activeQueue[currentIndex - 1]);
    } else {
      playTrack(activeQueue[activeQueue.length - 1]);
    }
  };

  const isFavorite = (track: Track) => favorites.some(t => t.id === track.id);
  const toggleFavorite = (track: Track) => {
    if (isFavorite(track)) {
      setFavorites(prev => prev.filter(t => t.id !== track.id));
    } else {
      setFavorites(prev => [...prev, track]);
    }
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = { id: Math.random().toString(36).substring(2, 9), name: newPlaylistName.trim(), tracks: [] };
    setPlaylists(prev => [...prev, newPl]);
    setNewPlaylistName("");
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
  };

  const addTrackToPlaylist = (track: Track, playlistId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        if (p.tracks.some(t => t.id === track.id)) return p;
        return { ...p, tracks: [...p.tracks, track] };
      }
      return p;
    }));
    setShowAddToPlaylistModal(null);
  };

  const removeTrackFromPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
      }
      return p;
    }));
  };

  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedTrackIds);
    for (const id of ids) { await deleteLocalTrack(id); }
    setSelectedTrackIds(new Set());
  };

  const handleBatchAddToPlaylist = (playlistId: string) => {
    const listToInsert: Track[] = [];
    selectedTrackIds.forEach(id => {
      const match = downloadedMetadata.find(t => t.id === id) || history.find(t => t.id === id) || tracks.find(t => t.id === id);
      if (match) listToInsert.push(match);
    });
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const uniqueTracks = [...p.tracks];
        listToInsert.forEach(t => { if (!uniqueTracks.some(ut => ut.id === t.id)) uniqueTracks.push(t); });
        return { ...p, tracks: uniqueTracks };
      }
      return p;
    }));
    setSelectedTrackIds(new Set());
  };

  const handleToggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    localStorage.setItem("opentune_sidebar_collapsed", String(nextVal));
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) playNext();
    else if (distance < -50) playPrev();
  };

  // Context Menu (modal) - open/close
  const openContextMenu = (e: React.MouseEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const track = findTrackById(trackId);
    if (track) setContextMenuTrack(track);
  };

  const findTrackById = (trackId: string): Track | null => {
    return downloadedMetadata.find(t => t.id === trackId) ||
           history.find(t => t.id === trackId) ||
           tracks.find(t => t.id === trackId) ||
           activeQueue.find(t => t.id === trackId) ||
           relatedTracks.find(t => t.id === trackId) ||
           favorites.find(t => t.id === trackId) ||
           (currentTrack?.id === trackId ? currentTrack : null) ||
           homeSections.flatMap((s: any) => (s.items || []).map(convertYTItemToTrack)).find((t: Track) => t.id === trackId) ||
           null;
  };

  // Queue drag and drop handlers
  const handleDragStart = (idx: number) => { setDragIndex(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIndex(idx); };
  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setDragOverIndex(null); return; }
    const newQueue = [...activeQueue];
    const [removed] = newQueue.splice(dragIndex, 1);
    newQueue.splice(idx, 0, removed);
    setActiveQueue(newQueue);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Copy all lyrics text
  const copyLyrics = () => {
    const plain = parsedLyrics.length > 0 ? parsedLyrics.map(l => l.text).join("\n") : lyricsText;
    navigator.clipboard.writeText(plain);
    setLyricsMenuOpen(false);
  };

  // Detect artist search - show artist card if most results share same artist
  function getArtistCardFromResults(): { name: string; thumbnail: string } | null {
    if (tracks.length < 3) return null;
    const firstArtist = tracks[0].artist.toLowerCase();
    const sameCount = tracks.filter(t => t.artist.toLowerCase() === firstArtist).length;
    if (sameCount >= 3) {
      return { name: tracks[0].artist, thumbnail: tracks[0].thumbnail };
    }
    return null;
  }

  // Genre search from Explore
  const searchGenre = async (genre: string) => {
    setQuery(genre);
    setActiveTab("buscar");
    setLoading(true);
    try {
      const res = await invoke<string>("buscar_cancion", { query: genre });
      const parsed = JSON.parse(res);
      const mapped: Track[] = (Array.isArray(parsed) ? parsed : parsed.tracks || []).map((t: any) => ({
        id: t.id, title: t.title, artist: (t.artist && t.artist !== "YT Music") ? t.artist : "Artista Desconocido",
        album: t.album || "", duration: t.duration || 0,
        thumbnail: t.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300",
        explicit: t.explicit || false
      }));
      setTracks(mapped);
    } catch (e) {
      console.error("Genre search error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-bg-dark text-text-primary overflow-hidden font-sans">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onEnded={playNext}
      />

      {/* Sidebar Navigation */}
      <aside className={`${sidebarCollapsed ? "w-[72px]" : "w-64"} glass flex flex-col justify-between border-r border-white/5 transition-all duration-300 z-20`}>
        <div className="p-4">
          <div className={`flex items-center mb-8 ${sidebarCollapsed ? "justify-center" : "justify-between px-2"}`}>
            {sidebarCollapsed ? (
              /* When collapsed: logo is the expand button */
              <button
                onClick={handleToggleSidebar}
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-tertiary flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:scale-105 transition"
              >
                <Sparkles className="w-5 h-5 text-bg-dark" />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 min-w-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-tertiary flex items-center justify-center shadow-lg shadow-brand-primary/20">
                    <Sparkles className="w-5 h-5 text-bg-dark" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-primary to-brand-tertiary bg-clip-text text-transparent">
                    Opentune
                  </h1>
                </div>
                <button 
                  onClick={handleToggleSidebar}
                  className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-white/5 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <nav className="space-y-1">
            {[
              { tab: "home" as const, icon: <Home className="w-5 h-5 min-w-5" />, label: "Home" },
              { tab: "explore" as const, icon: <Sparkle className="w-5 h-5 min-w-5" />, label: "Explorar" },
              { tab: "buscar" as const, icon: <Search className="w-5 h-5 min-w-5" />, label: "Buscar" },
              { tab: "biblioteca" as const, icon: <Library className="w-5 h-5 min-w-5" />, label: "Biblioteca" },
              { tab: "playlists" as const, icon: <ListMusic className="w-5 h-5 min-w-5" />, label: "Playlists" },
              { tab: "favoritos" as const, icon: <Heart className="w-5 h-5 min-w-5" />, label: "Favoritos" },
            ].map(({ tab, icon, label }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-xl transition duration-200 ${
                  activeTab === tab ? "bg-white/5 text-brand-primary font-medium" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                }`}
                title={sidebarCollapsed ? label : undefined}
              >
                {icon}
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-surface-dark/40 to-bg-dark z-10 relative">
        <header className="h-20 flex items-center px-8 justify-between border-b border-white/5">
          <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSearchDropdown(true); }}
                onFocus={() => { setSearchFocused(true); setShowSearchDropdown(true); }}
                onBlur={() => { setTimeout(() => { setSearchFocused(false); setShowSearchDropdown(false); }, 200); }}
                placeholder="Buscar música, artistas o álbumes..."
                className="w-full bg-surface-dark border border-white/10 rounded-full py-2.5 pl-11 pr-10 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200"
              />
              <Search className="w-5 h-5 text-text-secondary absolute left-4 top-3" />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-2.5 p-0.5 text-text-secondary hover:text-text-primary transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Search dropdown: suggestions + history */}
            {showSearchDropdown && searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-white/10 rounded-2xl shadow-2xl z-50 suggestions-dropdown overflow-hidden max-h-80 overflow-y-auto">
                {query.trim() === "" && searchHistory.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs text-text-secondary font-semibold uppercase tracking-wider">Historial</div>
                    {searchHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-white/5 cursor-pointer transition">
                        <span
                          className="text-sm text-text-primary flex-1"
                          onClick={() => { setQuery(h); setShowSearchDropdown(false); searchInputRef.current?.focus(); }}
                        >{h}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSearchHistory(prev => prev.filter((_, idx) => idx !== i)); }}
                          className="p-1 text-text-secondary hover:text-red-400 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {query.trim() !== "" && searchSuggestions.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs text-text-secondary font-semibold uppercase tracking-wider">Sugerencias</div>
                    {searchSuggestions.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition"
                        onClick={() => { setQuery(s); setShowSearchDropdown(false); 
                          // Auto-submit search
                          setTimeout(() => {
                            const form = searchInputRef.current?.closest("form");
                            if (form) form.requestSubmit();
                          }, 50);
                        }}
                      >
                        <Search className="w-3.5 h-3.5 text-text-secondary" />
                        <span className="text-sm text-text-primary">{s}</span>
                      </div>
                    ))}
                  </>
                )}
                {query.trim() !== "" && searchSuggestions.length === 0 && searchHistory.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs text-text-secondary font-semibold uppercase tracking-wider">Historial</div>
                    {searchHistory.filter(h => h.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition"
                        onClick={() => { setQuery(h); setShowSearchDropdown(false); }}
                      >
                        <span className="text-sm text-text-primary">{h}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </form>
        </header>

        <section className="flex-1 overflow-y-auto p-8 pb-32">
          {loading && tracks.length === 0 && activeTab === "buscar" && (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              <p className="text-sm text-text-secondary">Cargando...</p>
            </div>
          )}

          {/* HOME VIEW */}
          {activeTab === "home" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">Música Recomendada</h2>
                  <p className="text-sm text-text-secondary">Personalizada según tus tendencias e historial.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      setHomeSections([]);
                      await fetchHomeData();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-xl text-sm font-semibold hover:bg-white/10 transition"
                  >
                    <RefreshCw className="w-4 h-4" /> Recargar
                  </button>
                  {homeSections.length > 0 && (
                    <button 
                      onClick={() => {
                        const allTracks = homeSections.flatMap(s => s.items.map(convertYTItemToTrack));
                        playShuffleQueue(allTracks);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-bg-dark rounded-xl text-sm font-semibold hover:scale-105 transition"
                    >
                      <Shuffle className="w-4 h-4" /> Reproducción Aleatoria
                    </button>
                  )}
                </div>
              </div>

              {homeSections.length > 0 ? (
                homeSections.map((section, idx) => (
                  <div key={idx} className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-bold text-text-primary border-l-4 border-brand-primary pl-2 flex items-center gap-2">
                      {getSectionIcon(section.title)} {section.title}
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                      {section.items.map((item: any, i: number) => {
                        const track = convertYTItemToTrack(item);
                        return (
                          <div 
                            key={i} 
                            onContextMenu={(e) => openContextMenu(e, track.id)}
                            className="min-w-[200px] w-[200px] p-4 bg-surface-dark/40 hover:bg-surface-dark rounded-2xl transition border border-white/5 flex flex-col justify-between group relative"
                          >
                            <div>
                              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black/20 shadow-md">
                                <img src={getHighQualityThumbnail(track.thumbnail)} alt={track.title} onError={handleImageError} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                  <button 
                                    onClick={() => playTrack(track, section.items.map(convertYTItemToTrack))}
                                    className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow hover:scale-105 transition"
                                  >
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  </button>
                                </div>
                              </div>
                              <h4 className="font-semibold text-sm truncate">{track.title}</h4>
                              <p 
                                onClick={() => item.artists?.[0]?.id && loadArtistProfile(item.artists[0].id)} 
                                className="text-xs text-text-secondary truncate mt-0.5 cursor-pointer hover:underline"
                              >
                                {track.artist}
                              </p>
                            </div>
                            <div className="flex justify-end items-center mt-3 pt-2 border-t border-white/5">
                              <button onClick={(e) => openContextMenu(e, track.id)} className="p-1.5 text-text-secondary hover:text-brand-primary rounded-lg transition">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                  <p className="text-sm text-text-secondary">Cargando recomendaciones...</p>
                </div>
              )}
            </div>
          )}

          {/* EXPLORE VIEW - Static genre grid */}
          {activeTab === "explore" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Explorar Géneros</h2>
                <p className="text-sm text-text-secondary">Descubre nueva música por categorías.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {EXPLORE_GENRES.map((genre, idx) => (
                  <div
                    key={idx}
                    onClick={() => searchGenre(genre.name)}
                    style={{
                      background: `linear-gradient(135deg, ${genre.color}88, ${genre.color})`,
                      borderLeft: `4px solid ${genre.color}`
                    }}
                    className="p-5 rounded-2xl h-28 flex items-end cursor-pointer hover:scale-[1.02] active:scale-95 shadow transition"
                  >
                    <span className="font-bold text-base text-white tracking-tight drop-shadow-md">{genre.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH VIEW */}
          {activeTab === "buscar" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Resultados de Búsqueda</h2>
                <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setSearchViewMode("grid")}
                    className={`p-1.5 rounded-lg transition ${searchViewMode === "grid" ? "bg-brand-primary text-bg-dark" : "text-text-secondary hover:text-text-primary"}`}
                    title="Cuadrícula"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSearchViewMode("list")}
                    className={`p-1.5 rounded-lg transition ${searchViewMode === "list" ? "bg-brand-primary text-bg-dark" : "text-text-secondary hover:text-text-primary"}`}
                    title="Lista"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Artist card at top if loaded */}
              {artistCardData && (
                <div 
                  onClick={() => loadArtistProfile(artistCardData.id)}
                  className="relative flex items-center gap-5 p-6 bg-surface-dark/40 hover:bg-surface-dark/80 rounded-2xl border border-white/5 cursor-pointer overflow-hidden transition group"
                >
                  {/* Subtle background banner */}
                  {artistCardData.banner && (
                    <div className="absolute inset-0 z-0 opacity-20 filter blur-md pointer-events-none scale-105">
                      <img src={artistCardData.banner} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <img src={artistCardData.thumbnail} alt={artistCardData.name} className="relative z-10 w-20 h-20 rounded-full object-cover border-2 border-white/10 shadow-lg group-hover:scale-105 transition flex-shrink-0" />
                  <div className="relative z-10 min-w-0">
                    <p className="text-xs text-brand-primary uppercase font-semibold tracking-wider">Artista</p>
                    <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-brand-primary transition truncate">{artistCardData.name}</h3>
                    <p className="text-xs text-text-secondary mt-1 flex items-center gap-1"><User className="w-3 h-3" /> Ver perfil completo</p>
                  </div>
                </div>
              )}

              {tracks.length > 0 ? (
                searchViewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                    {tracks.map((track) => (
                      <div
                        key={track.id}
                        onContextMenu={(e) => openContextMenu(e, track.id)}
                        className={`group p-4 rounded-2xl transition duration-300 bg-surface-dark/50 hover:bg-surface-dark border border-transparent hover:border-white/10 flex flex-col justify-between h-72 ${
                          currentTrack?.id === track.id ? "bg-brand-primary/10 border-brand-primary/20" : ""
                        }`}
                      >
                        <div>
                          <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-black/40 shadow-sm">
                            <img src={getHighQualityThumbnail(track.thumbnail)} alt={track.title} onError={handleImageError} className="w-full h-full object-cover group-hover:scale-105 transition" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <button 
                                onClick={() => playTrack(track, tracks)}
                                className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow-lg hover:scale-105 transition"
                              >
                                <Play className="w-5 h-5 fill-current ml-1" />
                              </button>
                            </div>
                            {downloadProgress[track.id] !== undefined && (
                              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                                <span className="text-xs font-semibold">{downloadProgress[track.id]}%</span>
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                          <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                          <span className="text-xs text-text-secondary">{formatTime(track.duration)}</span>
                          <button onClick={(e) => openContextMenu(e, track.id)} className="p-1.5 text-text-secondary hover:text-brand-primary rounded-lg transition">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full animate-fade-in">
                    {tracks.map((track, idx) => (
                      <div
                        key={track.id}
                        onContextMenu={(e) => openContextMenu(e, track.id)}
                        className={`flex items-center gap-4 p-3 rounded-xl transition duration-200 bg-surface-dark/30 hover:bg-surface-dark/70 border border-white/5 cursor-pointer group ${
                          currentTrack?.id === track.id ? "bg-brand-primary/10 border-brand-primary/20" : "border-transparent"
                        }`}
                        onClick={() => playTrack(track, tracks)}
                      >
                        <span className="text-xs text-text-secondary w-5 text-right font-medium">{idx + 1}</span>
                        <img src={getHighQualityThumbnail(track.thumbnail)} onError={handleImageError} className="w-11 h-11 rounded-lg object-cover shadow-md flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-sm truncate ${currentTrack?.id === track.id ? "text-brand-primary" : "text-white"}`}>{track.title}</p>
                          <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                        </div>
                        <div className="text-xs text-text-secondary hidden md:block w-1/4 truncate">
                          {track.album || "Sencillo"}
                        </div>
                        <span className="text-xs text-text-secondary hidden sm:block w-16 text-right mr-2">{formatTime(track.duration)}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); playTrack(track, tracks); }} className="p-2 bg-brand-primary text-bg-dark rounded-full opacity-0 group-hover:opacity-100 transition shadow hover:scale-105">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openContextMenu(e, track.id); }} 
                            className="p-2 text-text-secondary hover:text-brand-primary transition rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                !loading && (
                  <div className="h-64 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <Music className="w-12 h-12 text-text-secondary mb-4 opacity-40" />
                    <p className="text-text-secondary text-sm">Prueba ingresando una búsqueda arriba o seleccionando una categoría.</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* ARTIST VIEW */}
          {activeTab === "artist" && (
            <div className="space-y-6 animate-fade-in">
              {loadingArtist ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                </div>
              ) : artistData ? (
                <div className="space-y-8">
                  <div className="relative rounded-3xl overflow-hidden h-64 bg-surface-dark border border-white/5 flex items-end p-8">
                    {artistData.thumbnail && (
                      <>
                        <div className="absolute inset-0 z-0 opacity-50 filter blur-md scale-105">
                          <img src={getHighQualityThumbnail(artistData.thumbnail)} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent z-0" />
                      </>
                    )}
                    <div className="relative z-10 flex items-center gap-6">
                      {artistData.thumbnail && (
                        <img src={getHighQualityThumbnail(artistData.thumbnail)} className="w-24 h-24 rounded-full object-cover border-2 border-white/20 shadow-xl" />
                      )}
                      <div>
                        <h2 className="text-4xl font-extrabold tracking-tight">{artistData.name}</h2>
                        {artistData.description && (
                          <p className="text-sm text-text-secondary mt-2 max-w-2xl line-clamp-2">{artistData.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {artistData.sections && artistData.sections.map((section: any, idx: number) => {
                    const mappedTracks = section.items.filter((item: any) => item.type === "song").map(convertYTItemToTrack);
                    return (
                      <div key={idx} className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-bold text-brand-primary">{section.title}</h3>
                          {mappedTracks.length > 0 && (
                            <button 
                              onClick={() => playShuffleQueue(mappedTracks)}
                              className="text-xs font-semibold px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-1"
                            >
                              <Shuffle className="w-3 h-3" /> Reproducir Aleatorio
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {section.items.map((item: any, i: number) => {
                            if (item.type === "song") {
                              const track = convertYTItemToTrack(item);
                              return (
                                <div 
                                  key={i}
                                  onContextMenu={(e) => openContextMenu(e, track.id)}
                                  className="p-3 bg-surface-dark/30 hover:bg-surface-dark/70 rounded-xl transition border border-white/5 flex items-center justify-between group"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <img src={track.thumbnail} onError={handleImageError} className="w-10 h-10 rounded-lg object-cover bg-black/40" />
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm truncate">{track.title}</p>
                                      <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => playTrack(track, mappedTracks)} className="p-1.5 bg-brand-primary text-bg-dark rounded-full">
                                      <Play className="w-3 h-3 fill-current ml-0.5" />
                                    </button>
                                    <button onClick={(e) => openContextMenu(e, track.id)} className="p-1.5 text-text-secondary hover:text-brand-primary">
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div 
                                  key={i}
                                  onClick={() => {
                                    setQuery(item.title);
                                    setActiveTab("buscar");
                                    // Trigger query
                                    setTimeout(() => {
                                      const searchBtn = document.querySelector("form");
                                      if (searchBtn) searchBtn.requestSubmit();
                                    }, 100);
                                  }}
                                  className="p-3 bg-surface-dark/30 hover:bg-surface-dark/70 rounded-xl transition border border-white/5 flex flex-col justify-between group cursor-pointer"
                                >
                                  <div className="aspect-square w-full rounded-lg overflow-hidden mb-2 relative bg-black/20">
                                    <img src={item.thumbnail} onError={handleImageError} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <Search className="w-6 h-6 text-brand-primary" />
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate text-white">{item.title}</p>
                                    <p className="text-xs text-text-secondary truncate capitalize">{item.type === "album" ? `Álbum • ${item.year || ""}` : "Lista"}</p>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>No se pudo cargar el perfil del artista.</p>
              )}
            </div>
          )}

          {/* BIBLIOTECA VIEW */}
          {activeTab === "biblioteca" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Mi Biblioteca</h2>
                  <p className="text-sm text-text-secondary">Gestión de descargas y tu historial de reproducción.</p>
                </div>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => {
                      setShowSelectionMode(!showSelectionMode);
                      if (showSelectionMode) {
                        setSelectedTrackIds(new Set());
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                      showSelectionMode ? "bg-brand-primary text-bg-dark" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {showSelectionMode ? "Listo" : "Seleccionar"}
                  </button>
                  <div className="w-[1px] h-6 bg-white/10 mx-1" />
                  <button 
                    onClick={() => setLibTab("downloads")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      libTab === "downloads" ? "bg-brand-primary text-bg-dark" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    Descargas
                  </button>
                  <button 
                    onClick={() => { setLibTab("history"); }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      libTab === "history" ? "bg-brand-primary text-bg-dark" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    Historial
                  </button>
                </div>
              </div>

              {selectedTrackIds.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl animate-fade-in">
                  <span className="text-sm font-semibold text-brand-primary">{selectedTrackIds.size} elementos seleccionados</span>
                  <div className="flex gap-2">
                    {playlists.length > 0 && (
                      <select 
                        onChange={(e) => { if (e.target.value) { handleBatchAddToPlaylist(e.target.value); e.target.value = ""; } }}
                        className="bg-surface-dark border border-white/10 rounded-lg px-3 py-1.5 text-xs text-text-primary"
                      >
                        <option value="">Añadir a Playlist...</option>
                        {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                    {libTab === "downloads" && (
                      <button 
                        onClick={handleBatchDelete}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-lg flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Borrar Físicos
                      </button>
                    )}
                    <button onClick={() => setSelectedTrackIds(new Set())} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {libTab === "downloads" && (
                <div className="space-y-4">
                  {downloadedMetadata.length > 0 ? (
                    <div className="flex flex-col gap-2 w-full">
                      {downloadedMetadata.map((track) => (
                        <div 
                          key={track.id}
                          onContextMenu={(e) => openContextMenu(e, track.id)}
                          onClick={() => {
                            if (showSelectionMode) {
                              handleSelectTrack(track.id);
                            } else {
                              playTrack(track, downloadedMetadata);
                            }
                          }}
                          className={`p-3.5 bg-surface-dark/30 hover:bg-surface-dark/70 rounded-xl flex items-center justify-between border w-full transition duration-150 cursor-pointer ${
                            selectedTrackIds.has(track.id) ? "border-brand-primary/40 bg-brand-primary/5" : "border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {showSelectionMode && (
                              <div 
                                onClick={(e) => { e.stopPropagation(); handleSelectTrack(track.id); }}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer mr-2 flex-shrink-0 transition-all ${
                                  selectedTrackIds.has(track.id) 
                                    ? "bg-brand-primary border-brand-primary" 
                                    : "border-white/20 hover:border-brand-primary/60"
                                }`}
                              >
                                {selectedTrackIds.has(track.id) && (
                                  <div className="w-2 h-2 rounded-full bg-bg-dark" />
                                )}
                              </div>
                            )}
                            <img src={getHighQualityThumbnail(track.thumbnail)} onError={handleImageError} className="w-11 h-11 rounded-lg object-cover shadow flex-shrink-0" />
                            <div className="min-w-0 flex-1 ml-1">
                              <p className="font-semibold text-sm truncate text-white">{track.title}</p>
                              <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {!showSelectionMode && (
                              <button onClick={(e) => { e.stopPropagation(); playTrack(track, downloadedMetadata); }} className="p-2 bg-brand-primary text-bg-dark rounded-full shadow hover:scale-105 transition">
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); deleteLocalTrack(track.id); }} className="p-2 text-text-secondary hover:text-red-400 rounded-lg hover:bg-white/5 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-sm text-text-secondary">No tienes descargas locales.</p>
                    </div>
                  )}
                </div>
              )}

              {libTab === "history" && (
                <div className="space-y-4">
                  {history.length > 0 ? (
                    <div className="flex flex-col gap-2 w-full">
                      {history.map((track, idx) => (
                        <div 
                          key={track.id + idx}
                          onContextMenu={(e) => openContextMenu(e, track.id)}
                          onClick={() => {
                            if (showSelectionMode) {
                              handleSelectTrack(track.id);
                            } else {
                              playTrack(track, history);
                            }
                          }}
                          className={`p-3.5 bg-surface-dark/30 hover:bg-surface-dark/70 rounded-xl flex items-center justify-between border w-full transition duration-150 cursor-pointer ${
                            selectedTrackIds.has(track.id) ? "border-brand-primary/40 bg-brand-primary/5" : "border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {showSelectionMode && (
                              <div 
                                onClick={(e) => { e.stopPropagation(); handleSelectTrack(track.id); }}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer mr-2 flex-shrink-0 transition-all ${
                                  selectedTrackIds.has(track.id) 
                                    ? "bg-brand-primary border-brand-primary" 
                                    : "border-white/20 hover:border-brand-primary/60"
                                }`}
                              >
                                {selectedTrackIds.has(track.id) && (
                                  <div className="w-2 h-2 rounded-full bg-bg-dark" />
                                )}
                              </div>
                            )}
                            <img src={getHighQualityThumbnail(track.thumbnail)} onError={handleImageError} className="w-11 h-11 rounded-lg object-cover shadow flex-shrink-0" />
                            <div className="min-w-0 flex-1 ml-1">
                              <p className="font-semibold text-sm truncate text-white">{track.title}</p>
                              <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {!showSelectionMode && (
                              <button onClick={(e) => { e.stopPropagation(); playTrack(track, history); }} className="p-2 bg-brand-primary text-bg-dark rounded-full shadow hover:scale-105 transition">
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); openContextMenu(e, track.id); }} className="p-2 text-text-secondary hover:text-brand-primary rounded-lg hover:bg-white/5 transition">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-sm text-text-secondary">El historial de reproducción está vacío.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PLAYLISTS VIEW */}
          {activeTab === "playlists" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Mis Listas de Reproducción</h2>
                <p className="text-sm text-text-secondary mb-6">Organiza tus colecciones musicales.</p>
              </div>

              {selectedPlaylistId ? (
                <div className="space-y-6 animate-fade-in">
                  {(() => {
                    const playlist = playlists.find(p => p.id === selectedPlaylistId);
                    if (!playlist) return null;
                    return (
                      <>
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <div>
                            <button 
                              onClick={() => setSelectedPlaylistId(null)}
                              className="text-brand-primary text-xs font-semibold hover:underline mb-2 block"
                            >
                              &larr; Volver a todas
                            </button>
                            <h3 className="text-xl font-bold">{playlist.name}</h3>
                            <p className="text-xs text-text-secondary mt-1">{playlist.tracks.length} canciones</p>
                          </div>
                          <div className="flex gap-2">
                            {playlist.tracks.length > 0 && (
                              <button 
                                onClick={() => playShuffleQueue(playlist.tracks)}
                                className="px-4 py-2 bg-brand-primary text-bg-dark rounded-xl text-sm font-semibold flex items-center gap-1"
                              >
                                <Shuffle className="w-4 h-4" /> Reproducción Aleatoria
                              </button>
                            )}
                            <button
                              onClick={() => deletePlaylist(playlist.id)}
                              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition flex items-center gap-2 text-sm"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar Lista
                            </button>
                          </div>
                        </div>

                        {playlist.tracks.length > 0 ? (
                          <div className="space-y-2">
                            {playlist.tracks.map((track, idx) => (
                              <div 
                                key={track.id}
                                onContextMenu={(e) => openContextMenu(e, track.id)}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="text-xs text-text-secondary w-4 text-right">{idx + 1}</span>
                                  <img src={getHighQualityThumbnail(track.thumbnail)} className="w-10 h-10 rounded-lg object-cover" />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm truncate">{track.title}</p>
                                    <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => playTrack(track, playlist.tracks)} className="p-2 bg-brand-primary rounded-full text-bg-dark">
                                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                  </button>
                                  <button onClick={() => removeTrackFromPlaylist(track.id, playlist.id)} className="p-2 text-text-secondary hover:text-red-400">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-text-secondary py-8 text-center bg-white/5 rounded-2xl">
                            Esta lista está vacía. Añade canciones.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                  {/* Create Playlist dashed button card */}
                  <div 
                    onClick={() => setShowCreatePlaylistModal(true)}
                    className="p-5 rounded-2xl bg-surface-dark/20 hover:bg-surface-dark/50 border border-dashed border-white/20 hover:border-brand-primary/40 cursor-pointer transition flex flex-col items-center justify-center text-center group h-40"
                  >
                    <Plus className="w-8 h-8 text-brand-primary/60 group-hover:scale-110 group-hover:text-brand-primary transition duration-200 mb-2" />
                    <span className="font-bold text-sm text-text-secondary group-hover:text-text-primary transition">Crear Lista</span>
                  </div>

                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                      className="p-5 rounded-2xl bg-surface-dark/50 hover:bg-surface-dark border border-transparent hover:border-white/10 cursor-pointer transition flex flex-col justify-between group h-40"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                          <ListMusic className="w-5 h-5" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-base truncate">{playlist.name}</h3>
                        <p className="text-xs text-text-secondary mt-1">{playlist.tracks.length} canciones</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FAVORITOS VIEW */}
          {activeTab === "favoritos" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">Mis Favoritos</h2>
                  <p className="text-sm text-text-secondary">Tus canciones marcadas como favoritas.</p>
                </div>
                {favorites.length > 0 && (
                  <button 
                    onClick={() => playShuffleQueue(favorites)}
                    className="px-4 py-2 bg-brand-primary text-bg-dark rounded-xl text-sm font-semibold flex items-center gap-1"
                  >
                    <Shuffle className="w-4 h-4" /> Reproducción Aleatoria
                  </button>
                )}
              </div>

              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {favorites.map((track) => (
                    <div 
                      key={track.id}
                      onContextMenu={(e) => openContextMenu(e, track.id)}
                      className="p-4 bg-surface-dark/40 hover:bg-surface-dark rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img src={track.thumbnail} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{track.title}</p>
                          <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => playTrack(track, favorites)} className="p-2 bg-brand-primary text-bg-dark rounded-full">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                        <button onClick={() => toggleFavorite(track)} className="p-2 text-brand-primary">
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-sm text-text-secondary">No tienes favoritos añadidos.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* BOTTOM PLAYER BAR - full width */}
        <footer className="h-24 bg-surface-dark/80 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-8 absolute bottom-0 left-0 right-0 z-20 shadow-2xl">
          {/* Left: Info */}
          <div 
            onClick={() => currentTrack && setIsPlayerExpanded(true)} 
            className="w-1/3 flex items-center gap-3 min-w-0 cursor-pointer group"
          >
            {currentTrack ? (
              <>
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/5 shadow-md flex-shrink-0">
                  <img src={getHighQualityThumbnail(currentTrack.thumbnail)} alt={currentTrack.title} onError={handleImageError} className="w-full h-full object-cover group-hover:scale-105 transition" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate group-hover:text-brand-primary transition">{currentTrack.title}</h4>
                  <p className="text-xs text-text-secondary truncate mt-0.5">{currentTrack.artist}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                  <Music className="w-6 h-6 text-text-secondary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-secondary">Sin reproducción</h4>
                </div>
              </div>
            )}
          </div>

          {/* Center Controls & Seeker */}
          <div className="w-1/3 flex flex-col items-center gap-2">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`transition ${isShuffle ? "text-brand-primary" : "text-text-secondary hover:text-text-primary"}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={playPrev} disabled={activeQueue.length === 0} className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition duration-150">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!streamUrl || buffering}
                className="w-11 h-11 rounded-full bg-brand-primary text-bg-dark flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 transition duration-200"
              >
                {buffering ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button onClick={playNext} disabled={activeQueue.length === 0} className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition duration-150">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] text-text-secondary w-8 text-right">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} disabled={!streamUrl}
                className="flex-1 accent-brand-primary h-1 rounded-full bg-white/10 appearance-none cursor-pointer" />
              <span className="text-[10px] text-text-secondary w-8 text-left">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Volume + 3-dots */}
          <div className="w-1/3 flex items-center justify-end gap-3">
            {currentTrack && (
              <button 
                onClick={(e) => { e.stopPropagation(); setContextMenuTrack(currentTrack); }} 
                className="p-2 text-text-secondary hover:text-brand-primary transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
            <Volume2 className="w-4 h-4 text-text-secondary" />
            <input
              type="range" min="0" max="1" step="0.01" value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-brand-secondary h-1 rounded-full bg-white/10 appearance-none cursor-pointer"
            />
          </div>
        </footer>

        {/* EXPANDED FULLSCREEN PLAYER */}
        {isPlayerExpanded && currentTrack && (
          <div className="absolute inset-0 bg-bg-dark/95 z-30 flex flex-col md:flex-row p-8 gap-8 items-center justify-center animate-fade-in backdrop-blur-lg">
            <button 
              onClick={() => setIsPlayerExpanded(false)}
              className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Ambient Blurred Background Art */}
            <div className="absolute inset-0 z-0 overflow-hidden filter blur-3xl opacity-20 pointer-events-none scale-125">
              <img src={getHighQualityThumbnail(currentTrack.thumbnail)} className="w-full h-full object-cover" />
            </div>

            {/* Left Panel: Cover Art & Controls */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center z-10 max-w-md">
              <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative aspect-square w-full rounded-3xl overflow-hidden shadow-2xl bg-black/40 border border-white/10 cursor-grab active:cursor-grabbing mb-6 group"
              >
                <img src={getHighQualityThumbnail(currentTrack.thumbnail)} alt={currentTrack.title} onError={handleImageError} className="w-full h-full object-cover" />
              </div>
              <div className="text-center w-full px-4">
                <h2 className="text-2xl font-bold tracking-tight text-white line-clamp-1">{currentTrack.title}</h2>
                <p className="text-brand-primary font-semibold text-sm mt-1 truncate">{currentTrack.artist}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6 mt-8">
                <button onClick={() => setIsShuffle(!isShuffle)} className={`p-2 transition ${isShuffle ? "text-brand-primary" : "text-text-secondary hover:text-white"}`}>
                  <Shuffle className="w-5 h-5" />
                </button>
                <button onClick={playPrev} className="p-2 text-text-secondary hover:text-white transition">
                  <SkipBack className="w-6 h-6" />
                </button>
                <button onClick={togglePlay} className="w-14 h-14 bg-brand-primary text-bg-dark rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
                <button onClick={playNext} className="p-2 text-text-secondary hover:text-white transition">
                  <SkipForward className="w-6 h-6" />
                </button>
                <button onClick={() => toggleFavorite(currentTrack)} className="p-2 text-text-secondary hover:text-brand-primary transition">
                  <Heart className={`w-5 h-5 ${isFavorite(currentTrack) ? "fill-brand-primary text-brand-primary" : ""}`} />
                </button>
                {/* 3-dots in expanded player */}
                <button onClick={(e) => { e.stopPropagation(); setContextMenuTrack(currentTrack); }} className="p-2 text-text-secondary hover:text-brand-primary transition">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Time Slider */}
              <div className="w-full mt-6 flex items-center gap-3 px-4">
                <span className="text-xs text-text-secondary">{formatTime(currentTime)}</span>
                <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek}
                  className="flex-1 accent-brand-primary h-1 bg-white/10 rounded-full cursor-pointer" />
                <span className="text-xs text-text-secondary">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Panel: Tabs (Queue / Lyrics / Related) */}
            <div className="w-full md:w-1/2 h-[350px] md:h-[500px] flex flex-col z-10 max-w-lg border border-white/5 rounded-3xl bg-surface-dark/30 backdrop-blur-md overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-white/5">
                {[
                  { key: "queue" as const, label: "Siguiente", icon: <ListMusic className="w-3.5 h-3.5" /> },
                  { key: "lyrics" as const, label: "Letra", icon: <Mic2 className="w-3.5 h-3.5" /> },
                  { key: "related" as const, label: "Relacionado", icon: <Radio className="w-3.5 h-3.5" /> },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setPlayerTab(tab.key)}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                      playerTab === tab.key ? "text-brand-primary border-b-2 border-brand-primary" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {/* QUEUE TAB */}
                {playerTab === "queue" && (
                  <div className="p-4 space-y-1">
                    {activeQueue.length > 0 ? (
                      activeQueue.map((track, idx) => (
                        <div
                          key={track.id}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={() => handleDrop(idx)}
                          onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group ${
                            currentTrack?.id === track.id ? "bg-brand-primary/10 border border-brand-primary/20" : "hover:bg-white/5"
                          } ${dragIndex === idx ? "dragging-queue-item" : ""} ${dragOverIndex === idx ? "drag-over-queue-item" : ""}`}
                          onClick={() => playTrack(track)}
                        >
                          <GripVertical className="w-4 h-4 text-text-secondary/50 drag-handle flex-shrink-0" />
                          <img src={track.thumbnail} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${currentTrack?.id === track.id ? "text-brand-primary font-semibold" : "font-medium"}`}>{track.title}</p>
                            <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                          </div>
                          <span className="text-xs text-text-secondary">{formatTime(track.duration)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-text-secondary text-center py-12">La cola está vacía.</p>
                    )}
                  </div>
                )}

                {/* LYRICS TAB */}
                {playerTab === "lyrics" && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                      <span className="text-xs uppercase font-bold tracking-wider text-brand-primary">Letras de Canción</span>
                      <div className="relative">
                        <button onClick={() => setLyricsMenuOpen(!lyricsMenuOpen)} className="p-1.5 text-text-secondary hover:text-brand-primary transition">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {lyricsMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 bg-surface-dark border border-white/10 rounded-xl shadow-2xl z-10 w-44 py-1 modal-content">
                            <button onClick={copyLyrics} className="w-full text-left px-3 py-2 text-xs hover:bg-brand-primary hover:text-bg-dark rounded-lg transition flex items-center gap-2">
                              <Copy className="w-3.5 h-3.5" /> Copiar toda la letra
                            </button>
                            <button onClick={() => { if (currentTrack) fetchLyrics(currentTrack); setLyricsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-brand-primary hover:text-bg-dark rounded-lg transition flex items-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5" /> Recargar letras
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div 
                      ref={lyricsContainerRef} 
                      className="flex-1 overflow-y-auto p-6 scroll-smooth space-y-6 text-center text-text-secondary"
                    >
                      {parsedLyrics.length > 0 ? (
                        parsedLyrics.map((line, idx) => (
                          <p
                            key={idx}
                            id={`lyric-line-${idx}`}
                            className={`text-lg font-bold transition duration-300 ${
                              idx === currentLyricIndex 
                                ? "text-brand-primary scale-105 font-extrabold" 
                                : "opacity-40 hover:opacity-80 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (line.time >= 0 && audioRef.current) {
                                audioRef.current.currentTime = line.time;
                                setCurrentTime(line.time);
                              }
                            }}
                          >
                            {line.text || "•••"}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm py-12">{lyricsText}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* RELATED TAB */}
                {playerTab === "related" && (
                  <div className="p-4 space-y-1">
                    {relatedTracks.length > 0 ? (
                      relatedTracks.map((track, idx) => (
                        <div
                          key={track.id + idx}
                          className={`flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer hover:bg-white/5 group ${
                            currentTrack?.id === track.id ? "bg-brand-primary/10" : ""
                          }`}
                          onClick={() => playTrack(track, relatedTracks)}
                        >
                          <img src={track.thumbnail} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{track.title}</p>
                            <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openContextMenu(e, track.id); }}
                            className="p-1.5 text-text-secondary hover:text-brand-primary opacity-0 group-hover:opacity-100 transition"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-text-secondary text-center py-12">Cargando canciones relacionadas...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CONTEXT MENU MODAL */}
      {contextMenuTrack && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] modal-overlay" onClick={() => setContextMenuTrack(null)}>
          <div className="glass p-5 rounded-2xl max-w-xs w-full border border-white/10 shadow-2xl mx-4 modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Track info header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
              <img src={contextMenuTrack.thumbnail} className="w-12 h-12 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{contextMenuTrack.title}</p>
                <p className="text-xs text-text-secondary truncate">{contextMenuTrack.artist}</p>
              </div>
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => { playTrack(contextMenuTrack); setContextMenuTrack(null); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Play className="w-4 h-4" /> Reproducir ahora
              </button>
              <button 
                onClick={() => { toggleFavorite(contextMenuTrack); setContextMenuTrack(null); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Heart className={`w-4 h-4 ${isFavorite(contextMenuTrack) ? "fill-current" : ""}`} />
                {isFavorite(contextMenuTrack) ? "Quitar de favoritos" : "Añadir a favoritos"}
              </button>
              <button 
                onClick={() => { downloadTrack(contextMenuTrack); setContextMenuTrack(null); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Download className="w-4 h-4" /> Descargar en disco
              </button>
              <button 
                onClick={() => { setShowAddToPlaylistModal(contextMenuTrack); setContextMenuTrack(null); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <ListMusic className="w-4 h-4" /> Añadir a playlist
              </button>
              {downloads[contextMenuTrack.id] && (
                <button 
                  onClick={() => { deleteLocalTrack(contextMenuTrack.id); setContextMenuTrack(null); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-red-500 hover:text-white rounded-xl transition text-red-300 flex items-center gap-3"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar archivo físico
                </button>
              )}
            </div>
            <button
              onClick={() => setContextMenuTrack(null)}
              className="w-full mt-3 pt-3 border-t border-white/5 text-center text-xs text-text-secondary hover:text-text-primary transition py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Playlist modal */}
      {showAddToPlaylistModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
          <div className="glass p-6 rounded-2xl max-w-sm w-full border border-white/10 shadow-2xl mx-4">
            <h3 className="text-lg font-bold mb-4">Añadir a lista de reproducción</h3>
            {playlists.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto mb-6 pr-1">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => addTrackToPlaylist(showAddToPlaylistModal, playlist.id)}
                    className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-brand-primary hover:text-bg-dark transition duration-200 text-sm font-semibold truncate block"
                  >
                    {playlist.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 bg-white/5 rounded-xl border border-white/5 mb-6">
                <p className="text-xs text-text-secondary mb-3">No tienes listas de reproducción.</p>
                <button
                  onClick={() => { setActiveTab("playlists"); setShowAddToPlaylistModal(null); }}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-bg-dark font-bold text-xs"
                >
                  Crear una
                </button>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddToPlaylistModal(null)}
                className="px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary text-sm font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in" onClick={() => setShowCreatePlaylistModal(false)}>
          <div className="glass p-6 rounded-2xl max-w-sm w-full border border-white/10 shadow-2xl mx-4 modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Crear Nueva Lista</h3>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Nombre de la lista de reproducción..."
              autoFocus
              className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary mb-6 transition duration-200"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createPlaylist();
                  setShowCreatePlaylistModal(false);
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreatePlaylistModal(false);
                  setNewPlaylistName("");
                }}
                className="px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  createPlaylist();
                  setShowCreatePlaylistModal(false);
                }}
                disabled={!newPlaylistName.trim()}
                className="px-4 py-2 rounded-xl bg-brand-primary text-bg-dark font-bold text-sm transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
