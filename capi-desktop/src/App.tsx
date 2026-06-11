import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Logo from "./assets/Logo.png";
import { 
  Play, Pause, SkipForward, SkipBack, Search, Music, Volume2, VolumeX,
  ListMusic, Heart, Loader2, Sparkles, ChevronLeft, ChevronDown, ChevronUp,
  Trash2, Home, Library, Download, Shuffle, ListPlus, Disc3, FolderOpen,
  MoreVertical, X, Sparkle, GripVertical, Copy, RefreshCw,
  User, Radio, Mic2, LayoutGrid, List, Plus, Bell,
  Moon, Timer, BarChart3, Languages, Palette, RotateCcw, Trophy, Users, Repeat, Repeat1, Lock, Unlock, Upload, Pencil
} from "lucide-react";
import "./App.css";
import { t, Locale, LOCALE_NAMES, TranslationKeys } from "./i18n";
import SafeImage from "./SafeImage";
import { recordPlayEvent, getRecommendationQueries, getTopArtistsFromDB, getTopTracksFromDB, ArtistAffinity, getPersonalizedHomeSections, addListenedTime } from "./recommendations";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

interface NavState {
  tab: "home" | "explore" | "buscar" | "biblioteca" | "playlists" | "favoritos" | "artist" | "album_view" | "settings" | "perfil" | "lanzamientos" | "download_manager" | "stats";
  artistId?: string;
  artistData?: any;
  currentAlbum?: any;
  currentAlbumTracks?: Track[];
}

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

export const ACCENT_COLORS = [
  { id: "purple", name: "Púrpura", dark: "#d0bcff", darkSec: "#ccc2dc", darkTert: "#efb8c8", light: "#7c3aed", lightSec: "#8b5cf6", lightTert: "#a78bfa" },
  { id: "blue", name: "Azul", dark: "#38bdf8", darkSec: "#7dd3fc", darkTert: "#0ea5e9", light: "#0284c7", lightSec: "#0ea5e9", lightTert: "#38bdf8" },
  { id: "green", name: "Verde", dark: "#34d399", darkSec: "#6ee7b7", darkTert: "#059669", light: "#059669", lightSec: "#10b981", lightTert: "#34d399" },
  { id: "rose", name: "Rosa", dark: "#f43f5e", darkSec: "#fda4af", darkTert: "#be123c", light: "#e11d48", lightSec: "#f43f5e", lightTert: "#fda4af" },
  { id: "orange", name: "Naranja", dark: "#fb923c", darkSec: "#ffedd5", darkTert: "#d97706", light: "#ea580c", lightSec: "#f97316", lightTert: "#fb923c" },
  { id: "teal", name: "Teal", dark: "#2dd4bf", darkSec: "#99f6e4", darkTert: "#0d9488", light: "#0d9488", lightSec: "#14b8a6", lightTert: "#2dd4bf" },
  { id: "red", name: "Rojo", dark: "#f87171", darkSec: "#fca5a5", darkTert: "#ef4444", light: "#dc2626", lightSec: "#ef4444", lightTert: "#fca5a5" },
  { id: "indigo", name: "Indigo", dark: "#818cf8", darkSec: "#a5b4fc", darkTert: "#6366f1", light: "#4f46e5", lightSec: "#6366f1", lightTert: "#a5b4fc" },
  { id: "violet", name: "Violeta", dark: "#c084fc", darkSec: "#d8b4fe", darkTert: "#a855f7", light: "#7c3aed", lightSec: "#8b5cf6", lightTert: "#d8b4fe" },
  { id: "cyan", name: "Cian", dark: "#22d3ee", darkSec: "#67e8f9", darkTert: "#06b6d4", light: "#0891b2", lightSec: "#06b6d4", lightTert: "#67e8f9" },
  { id: "emerald", name: "Esmeralda", dark: "#34d399", darkSec: "#6ee7b7", darkTert: "#10b981", light: "#059669", lightSec: "#10b981", lightTert: "#6ee7b7" },
  { id: "amber", name: "Ámbar", dark: "#fbbf24", darkSec: "#fde047", darkTert: "#f59e0b", light: "#d97706", lightSec: "#f59e0b", lightTert: "#fcd34d" },
  { id: "yellow", name: "Amarillo", dark: "#facc15", darkSec: "#fef08a", darkTert: "#eab308", light: "#ca8a04", lightSec: "#eab308", lightTert: "#fef08a" },
  { id: "lime", name: "Lima", dark: "#a3e635", darkSec: "#d9f99d", darkTert: "#84cc16", light: "#65a30d", lightSec: "#84cc16", lightTert: "#d9f99d" },
  { id: "celeste", name: "Celeste", dark: "#38bdf8", darkSec: "#bae6fd", darkTert: "#0ea5e9", light: "#0284c7", lightSec: "#38bdf8", lightTert: "#bae6fd" },
  { id: "fuchsia", name: "Fucsia", dark: "#f0abfc", darkSec: "#f5d0fe", darkTert: "#d946ef", light: "#c026d3", lightSec: "#d946ef", lightTert: "#f5d0fe" },
  { id: "clavel", name: "Clavel", dark: "#fb7185", darkSec: "#fecdd3", darkTert: "#f43f5e", light: "#e11d48", lightSec: "#fb7185", lightTert: "#fecdd3" }
];

// NEW_RELEASES state will be used instead of static constant

const convertYTItemToTrack = (item: any): Track => ({
  id: item.id || item.browseId,
  title: item.title,
  artist: item.artists
    ? (typeof item.artists[0] === 'object' ? item.artists.map((a: any) => a.name || a).join(", ") : item.artists.join(", "))
    : (item.author && item.author !== "YT Music" ? item.author : "Artista Desconocido"),
  album: item.album || "",
  duration: item.duration || 0,
  thumbnail: item.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300",
  explicit: item.explicit || false,
  artistId: item.artists?.[0]?.id || item.artistId || item.artists?.[0]?.browseId || ""
});

const getSectionIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("favoritos") || t.includes("favorite")) return <Heart className="w-4 h-4 text-brand-primary fill-brand-primary/20" />;
  if (t.includes("reciente") || t.includes("recientemente") || t.includes("recent")) return <Timer className="w-4 h-4 text-brand-primary" />;
  if (t.includes("pop")) return <Sparkles className="w-4 h-4 text-brand-primary" />;
  if (t.includes("reggaeton") || t.includes("urbano")) return <Sparkle className="w-4 h-4 text-brand-primary animate-pulse" />;
  if (t.includes("rock") || t.includes("metal")) return <Music className="w-4 h-4 text-brand-primary" />;
  if (t.includes("hip hop") || t.includes("rap") || t.includes("trap")) return <Mic2 className="w-4 h-4 text-brand-primary" />;
  if (t.includes("electro") || t.includes("dance")) return <Radio className="w-4 h-4 text-brand-primary" />;
  if (t.includes("balada") || t.includes("románt")) return <Heart className="w-4 h-4 text-brand-primary fill-brand-primary/20" />;
  if (t.includes("indie")) return <Sparkles className="w-4 h-4 text-brand-primary" />;
  return <Music className="w-4 h-4 text-brand-primary" />;
};

const SkeletonCard = () => (
  <div className="p-4 bg-surface-dark/30 rounded-2xl border border-white/5 flex flex-col justify-between group relative h-[250px] animate-pulse">
    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-white/5 skeleton-shimmer" />
    <div className="space-y-2 flex-1">
      <div className="h-4 w-3/4 rounded bg-white/5 skeleton-shimmer" />
      <div className="h-3 w-1/2 rounded bg-white/5 skeleton-shimmer" />
    </div>
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-surface-dark/30 animate-pulse w-full">
    <div className="w-11 h-11 rounded-lg bg-white/5 skeleton-shimmer flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="h-4 w-1/3 rounded bg-white/5 skeleton-shimmer" />
      <div className="h-3 w-1/4 rounded bg-white/5 skeleton-shimmer" />
    </div>
    <div className="w-12 h-3 rounded bg-white/5 skeleton-shimmer hidden sm:block" />
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<"home" | "explore" | "buscar" | "biblioteca" | "playlists" | "favoritos" | "artist" | "album_view" | "settings" | "perfil" | "lanzamientos" | "download_manager" | "stats">("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const savedDefault = localStorage.getItem("capi_default_sidebar_collapsed");
    if (savedDefault !== null) {
      return savedDefault === "true";
    }
    const old = localStorage.getItem("opentune_sidebar_collapsed");
    if (old !== null) {
      localStorage.setItem("capi_sidebar_collapsed", old);
      localStorage.removeItem("opentune_sidebar_collapsed");
    }
    return (old || localStorage.getItem("capi_sidebar_collapsed")) === "true";
  });
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [activeQueue, setActiveQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  
  const [searchViewMode, setSearchViewMode] = useState<"grid" | "list">(() => {
    let saved = localStorage.getItem("capi_default_search_view");
    if (!saved) {
      saved = localStorage.getItem("opentune_default_search_view");
      if (saved) {
        localStorage.setItem("capi_default_search_view", saved);
        localStorage.removeItem("opentune_default_search_view");
      }
    }
    return (saved === "grid" || saved === "list") ? saved : "list";
  });

  const [showSidebarSettings, setShowSidebarSettings] = useState<boolean>(() => {
    let saved = localStorage.getItem("capi_show_sidebar_settings");
    if (saved === null) {
      saved = localStorage.getItem("opentune_show_sidebar_settings");
      if (saved !== null) {
        localStorage.setItem("capi_show_sidebar_settings", saved);
        localStorage.removeItem("opentune_show_sidebar_settings");
      }
    }
    return saved !== "false";
  });

  const [autostartEnabled, setAutostartEnabled] = useState(false);

  useEffect(() => {
    isEnabled().then(setAutostartEnabled).catch(() => {});
  }, []);

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselTouchStart, setCarouselTouchStart] = useState<number | null>(null);
  const [carouselTouchEnd, setCarouselTouchEnd] = useState<number | null>(null);

  // Structured toast state
  type ToastData =
    | { kind: "text"; message: string }
    | { kind: "seek"; direction: "forward" | "backward"; seconds: number }
    | { kind: "volume"; level: number }; // 0..1

  const [toastData, setToastData] = useState<ToastData | null>(null);
  const toastDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastDismissRef.current) clearTimeout(toastDismissRef.current);
    setToastData({ kind: "text", message });
    toastDismissRef.current = setTimeout(() => setToastData(null), 3000);
  };



  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);

  const [currentAlbum, setCurrentAlbum] = useState<{ id: string; title: string; thumbnail: string; type: string; artist?: string } | null>(null);
  const [currentAlbumTracks, setCurrentAlbumTracks] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem("capi_locale") as Locale) || "es");
  const T = useCallback((key: keyof TranslationKeys) => t(key, locale), [locale]);
  const [topArtists, setTopArtists] = useState<ArtistAffinity[]>([]);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState("");

  const [navHistory, setNavHistory] = useState<NavState[]>([
    { tab: "home" }
  ]);
  const [navIndex, setNavIndex] = useState<number>(0);
  const scrollableSectionRef = useRef<HTMLElement | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  const [preMuteVolume, setPreMuteVolume] = useState<number>(0.8);
  const [contextMenuPlaylist, setContextMenuPlaylist] = useState<Playlist | null>(null);
  const [contextMenuArtist, setContextMenuArtist] = useState<ArtistAffinity | null>(null);
  const [hiddenArtists, setHiddenArtists] = useState<string[]>(() => {
    const saved = localStorage.getItem("capi_hidden_artists");
    return saved ? JSON.parse(saved) : [];
  });
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [accentColor, setAccentColor] = useState<string>(() => localStorage.getItem("capi_accent_color") || "purple");
  const [showAccentDropdown, setShowAccentDropdown] = useState(false);
  const [accentSearchQuery, setAccentSearchQuery] = useState("");
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const applyNavState = (state: NavState) => {
    setActiveTab(state.tab);
    if (state.tab !== "buscar") {
      setQuery("");
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
      setActiveSuggestionIndex(-1);
    }
    if (state.artistData) {
      setArtistData(state.artistData);
    }
    if (state.currentAlbum) {
      setCurrentAlbum(state.currentAlbum);
      setCurrentAlbumTracks(state.currentAlbumTracks || []);
    }
  };

  const navigateTo = useCallback((tab: NavState["tab"], extra: Partial<NavState> = {}) => {
    setIsPlayerExpanded(false);
    if (tab === "explore") {
      setTracks([]);
    }
    const newState: NavState = {
      tab,
      artistId: extra.artistId,
      artistData: extra.artistData,
      currentAlbum: extra.currentAlbum,
      currentAlbumTracks: extra.currentAlbumTracks,
    };
    setNavHistory(prev => {
      const updated = prev.slice(0, navIndex + 1);
      const currentState = updated[navIndex];
      if (currentState && 
          currentState.tab === newState.tab && 
          currentState.artistId === newState.artistId &&
          currentState.currentAlbum?.id === newState.currentAlbum?.id) {
        return prev;
      }
      const nextHist = [...updated, newState];
      setNavIndex(nextHist.length - 1);
      return nextHist;
    });
    applyNavState(newState);
  }, [navIndex, setIsPlayerExpanded]);

  const goBack = () => {
    if (navIndex > 0) {
      const nextIndex = navIndex - 1;
      setNavIndex(nextIndex);
      applyNavState(navHistory[nextIndex]);
    }
  };

  const goForward = () => {
    if (navIndex < navHistory.length - 1) {
      const nextIndex = navIndex + 1;
      setNavIndex(nextIndex);
      applyNavState(navHistory[nextIndex]);
    }
  };

  const [artistCardData, setArtistCardData] = useState<{ id: string; name: string; thumbnail: string; banner: string } | null>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showImportPlaylistModal, setShowImportPlaylistModal] = useState(false);
  const [importPlaylistUrl, setImportPlaylistUrl] = useState("");
  const streamCacheRef = useRef<Record<string, string>>({});
  // const playCountCacheRef = useRef<Record<string, number>>({});
  const nextRandomIndexRef = useRef<number | null>(null);
  
  // Dynamic recommendations & Explore state
  const [homeSections, setHomeSections] = useState<any[]>([]);
  const [artistData, setArtistData] = useState<any>(null);
  const [loadingArtist, setLoadingArtist] = useState(false);
  
  // Persisted state
  const migrateKey = (oldKey: string, newKey: string) => {
    const oldVal = localStorage.getItem(oldKey);
    if (oldVal) {
      localStorage.setItem(newKey, oldVal);
      localStorage.removeItem(oldKey);
      return oldVal;
    }
    return null;
  };

  const [favorites, setFavorites] = useState<Track[]>(() => {
    migrateKey("opentune_favorites", "capi_favorites");
    const saved = localStorage.getItem("capi_favorites");
    return saved ? JSON.parse(saved) : [];
  });
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    migrateKey("opentune_playlists", "capi_playlists");
    const saved = localStorage.getItem("capi_playlists");
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState<Track[]>(() => {
    migrateKey("opentune_history", "capi_history");
    const saved = localStorage.getItem("capi_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [downloads, setDownloads] = useState<Record<string, string>>(() => {
    migrateKey("opentune_downloads", "capi_downloads");
    const saved = localStorage.getItem("capi_downloads");
    if (!saved) return {};
    const parsed: Record<string, string> = JSON.parse(saved);
    // Migrate old paths from Opentune/ to Capi/
    for (const key of Object.keys(parsed)) {
      parsed[key] = parsed[key].replace("/Opentune/", "/Capi/");
    }
    localStorage.setItem("capi_downloads", JSON.stringify(parsed));
    return parsed;
  });
  const [downloadedMetadata, setDownloadedMetadata] = useState<Track[]>(() => {
    migrateKey("opentune_downloaded_metadata", "capi_downloaded_metadata");
    const saved = localStorage.getItem("capi_downloaded_metadata");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Library views
  const [libTab, setLibTab] = useState<"downloads" | "history" | "local">("downloads");
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [showSelectionMode, setShowSelectionMode] = useState(false);

  // Player expansions and context menus
  const [contextMenuTrack, setContextMenuTrack] = useState<Track | null>(null);
  const [contextMenuAlbumOrPlaylist, setContextMenuAlbumOrPlaylist] = useState<any | null>(null);
  const [loadingTracksForMenu, setLoadingTracksForMenu] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [capiUsername, setCapiUsername] = useState<string>(() => localStorage.getItem("capi_username") || "");
  const [capiAvatar, setCapiAvatar] = useState<string>(() => localStorage.getItem("capi_user_avatar") || "");
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("capi_theme") || "capi-default");
  const [activeDownloads, setActiveDownloads] = useState<Record<string, Track>>({});
  const activeDownloadsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-ultra-dark", "theme-light-mode", "theme-midnight-blue", "theme-forest-green");
    if (theme !== "capi-default") {
      root.classList.add(`theme-${theme}`);
    }

    // Apply custom accent color overrides
    if (accentColor === "custom") {
      const customColor = localStorage.getItem("capi_custom_accent_color") || "#7c3aed";
      root.style.setProperty('--brand-primary', customColor);
      root.style.setProperty('--brand-secondary', customColor + "dd");
      root.style.setProperty('--brand-tertiary', customColor + "aa");
    } else {
      const isLight = theme === "light-mode";
      const colorObj = ACCENT_COLORS.find(c => c.id === accentColor) || ACCENT_COLORS[0];
      const pri = isLight ? colorObj.light : colorObj.dark;
      const sec = isLight ? colorObj.lightSec : colorObj.darkSec;
      const tert = isLight ? colorObj.lightTert : colorObj.darkTert;

      root.style.setProperty('--brand-primary', pri);
      root.style.setProperty('--brand-secondary', sec);
      root.style.setProperty('--brand-tertiary', tert);
    }
  }, [theme, accentColor]);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState<Track | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isRenamingPlaylist, setIsRenamingPlaylist] = useState(false);
  const [renamePlaylistName, setRenamePlaylistName] = useState("");

  useEffect(() => {
    scrollableSectionRef.current?.scrollTo(0, 0);
  }, [activeTab, selectedPlaylistId, currentAlbum]);

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
    const migrated = migrateKey("opentune_volume", "capi_volume");
    const saved = migrated || localStorage.getItem("capi_volume");
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
    migrateKey("opentune_search_history", "capi_search_history");
    const saved = localStorage.getItem("capi_search_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const suggestTimerRef = useRef<any>(null);

  // Drag and drop for queue
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Seek/Volume accumulation refs for arrow-key toasts
  const seekAccumRef = useRef<number>(0);
  const seekAccumTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Netflix-style section scroll refs
  const sectionScrollRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 4: Sleep Timer
  // ═══════════════════════════════════════════════════════════════
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [showSleepTimerMenu, setShowSleepTimerMenu] = useState(false);
  const [sleepMode, setSleepMode] = useState<"time" | "endOfTrack" | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 5: Dynamic Themes from album art
  // ═══════════════════════════════════════════════════════════════
  const [dynamicThemeEnabled, setDynamicThemeEnabled] = useState<boolean>(() =>
    localStorage.getItem("capi_dynamic_theme") === "true"
  );
  const [extractedColors, setExtractedColors] = useState<{primary: string; secondary: string; tertiary: string} | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 11: Usage Statistics / Wrapped
  // ═══════════════════════════════════════════════════════════════
  const [listeningStats, setListeningStats] = useState<{
    totalMinutes: number;
    trackPlays: Record<string, { track: Track; plays: number }>;
    artistMinutes: Record<string, number>;
    dailyMinutes: Record<string, number>;
  }>(() => {
    const saved = localStorage.getItem("capi_listening_stats");
    return saved ? JSON.parse(saved) : { totalMinutes: 0, trackPlays: {}, artistMinutes: {}, dailyMinutes: {} };
  });
  const statsTrackingRef = useRef<{ trackId: string | null; startTime: number | null; counted: boolean }>({ trackId: null, startTime: null, counted: false });

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 15: Lyrics Translation
  // ═══════════════════════════════════════════════════════════════
  const [translatedLyrics, setTranslatedLyrics] = useState<LyricLine[] | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationLang, setTranslationLang] = useState<string>(() =>
    localStorage.getItem("capi_translation_lang") || "es"
  );
  const [translating, setTranslating] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 9: Discord Rich Presence
  // ═══════════════════════════════════════════════════════════════
  const [discordEnabled, setDiscordEnabled] = useState<boolean>(() =>
    localStorage.getItem("capi_discord_rpc") === "true"
  );
  const [discordConnected, setDiscordConnected] = useState(false);

  // Repeat mode and manual lyrics scroll states
  const [repeatMode, setRepeatMode] = useState<"none" | "one" | "all">("none");
  const [settingsCategory, setSettingsCategory] = useState<string>("apariencia");
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [carouselTracks, setCarouselTracks] = useState<Track[]>([]);
  const ignoreNextScrollRef = useRef(false);
  const [lyricsScrollLocked, setLyricsScrollLocked] = useState(true);
  const [downloadDragIndex, setDownloadDragIndex] = useState<number | null>(null);
  const [downloadDragOverIndex, setDownloadDragOverIndex] = useState<number | null>(null);
  const downloadDragIndexRef = useRef<number | null>(null);
  const [playlistDragIndex, setPlaylistDragIndex] = useState<number | null>(null);
  const [playlistDragOverIndex, setPlaylistDragOverIndex] = useState<number | null>(null);
  const playlistDragRef = useRef<number | null>(null);

  // Global Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, doubleConfirm = false, doubleConfirmMessage = "") => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        if (doubleConfirm) {
          setConfirmDialog({
            isOpen: true,
            title: "Confirmación Definitiva",
            message: doubleConfirmMessage || "¿Estás completamente seguro? Esta acción no se puede deshacer.",
            onConfirm: () => {
              onConfirm();
              setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
          });
        } else {
          onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Local folder music states
  const [localFolder, setLocalFolder] = useState<string>(() => localStorage.getItem("capi_local_music_folder") || "");
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const loadLocalTracks = useCallback(async (folderPath: string) => {
    if (!folderPath) return;
    setLocalLoading(true);
    try {
      const filesJson = await invoke<Track[]>("listar_archivos_locales", { ruta: folderPath });
      setLocalTracks(filesJson);
    } catch (err: any) {
      console.error("Error al cargar archivos locales:", err);
      showToast("Error al cargar la carpeta local: " + err);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const selectLocalFolder = async () => {
    try {
      const selected = await invoke<string | null>("seleccionar_carpeta");
      if (selected) {
        setLocalFolder(selected);
        localStorage.setItem("capi_local_music_folder", selected);
        showToast("Carpeta local seleccionada");
      }
    } catch (err: any) {
      console.error("Error al seleccionar carpeta:", err);
      showToast("Error al seleccionar carpeta: " + err);
    }
  };

  useEffect(() => {
    if (localFolder) {
      loadLocalTracks(localFolder);
    }
  }, [localFolder, loadLocalTracks]);

  // Export / Import Stats helpers
  const exportStats = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(listeningStats, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", `capi_stats_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Estadísticas exportadas correctamente");
  };

  const importStats = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed.totalMinutes === 'number' && parsed.trackPlays && parsed.artistMinutes && parsed.dailyMinutes) {
          setListeningStats(parsed);
          localStorage.setItem("capi_listening_stats", JSON.stringify(parsed));
          showToast("Estadísticas importadas correctamente");
        } else {
          showToast("Error: El archivo no tiene el formato de estadísticas válido");
        }
      } catch (err) {
        showToast("Error al procesar el archivo JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportGlobalBackup = () => {
    const payload: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("capi_")) {
        payload[key] = localStorage.getItem(key)!;
      }
    }
    const data = { version: 1, exportedAt: new Date().toISOString(), data: payload };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capi_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Copia de seguridad exportada correctamente");
  };

  const importGlobalBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.data) {
          showToast("Error: Archivo de copia no válido");
          return;
        }

        let tracksToDownload: Track[] = [];
        if (parsed.data["capi_downloaded_metadata"]) {
          try { tracksToDownload = JSON.parse(parsed.data["capi_downloaded_metadata"]) as Track[]; } catch (e) {}
        }

        for (const [key, value] of Object.entries(parsed.data)) {
          localStorage.setItem(key as string, value as string);
        }

        if (parsed.data["capi_favorites"]) {
          try { setFavorites(JSON.parse(parsed.data["capi_favorites"])); } catch (e) {}
        }
        if (parsed.data["capi_playlists"]) {
          try { setPlaylists(JSON.parse(parsed.data["capi_playlists"])); } catch (e) {}
        }
        if (parsed.data["capi_history"]) {
          try { setHistory(JSON.parse(parsed.data["capi_history"])); } catch (e) {}
        }
        if (parsed.data["capi_listening_stats"]) {
          try { setListeningStats(JSON.parse(parsed.data["capi_listening_stats"])); } catch (e) {}
        }
        if (parsed.data["capi_downloaded_metadata"]) {
          try { setDownloadedMetadata(JSON.parse(parsed.data["capi_downloaded_metadata"])); } catch (e) {}
        }
        if (parsed.data["capi_theme"]) {
          setTheme(parsed.data["capi_theme"] as string);
        }
        if (parsed.data["capi_locale"]) {
          setLocale(parsed.data["capi_locale"] as Locale);
        }
        if (parsed.data["capi_accent_color"]) {
          setAccentColor(parsed.data["capi_accent_color"] as string);
        }
        if (parsed.data["capi_username"]) {
          setCapiUsername(parsed.data["capi_username"] as string);
        }
        if (parsed.data["capi_user_avatar"]) {
          setCapiAvatar(parsed.data["capi_user_avatar"] as string);
        }

        setDownloads({});
        setDownloadedMetadata(tracksToDownload);

        if (tracksToDownload.length > 0) {
          showToast(`Restaurando copia. Re-descargando ${tracksToDownload.length} canciones...`);
          for (let i = 0; i < tracksToDownload.length; i++) {
            await downloadTrack(tracksToDownload[i]);
          }
          showToast("Copia restaurada y descargas completadas");
        } else {
          showToast("Copia de seguridad restaurada correctamente");
        }
      } catch (err) {
        showToast("Error al procesar el archivo JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  useEffect(() => {
    const unlisten = listen<{ track_id: string; progress: number }>("download-progress", (event) => {
      const trackId = event.payload.track_id;
      if (!activeDownloadsRef.current[trackId]) return;
      setDownloadProgress(prev => ({
        ...prev,
        [trackId]: Math.round(event.payload.progress)
      }));
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  // Sync to LocalStorage
  useEffect(() => { localStorage.setItem("capi_favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("capi_playlists", JSON.stringify(playlists)); }, [playlists]);
  useEffect(() => { localStorage.setItem("capi_history", JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem("capi_downloads", JSON.stringify(downloads)); }, [downloads]);
  useEffect(() => { localStorage.setItem("capi_downloaded_metadata", JSON.stringify(downloadedMetadata)); }, [downloadedMetadata]);
  useEffect(() => { localStorage.setItem("capi_sidebar_collapsed", String(sidebarCollapsed)); }, [sidebarCollapsed]);
  useEffect(() => { localStorage.setItem("capi_search_history", JSON.stringify(searchHistory)); }, [searchHistory]);
  useEffect(() => { localStorage.setItem("capi_show_sidebar_settings", String(showSidebarSettings)); }, [showSidebarSettings]);
  useEffect(() => { localStorage.setItem("capi_hidden_artists", JSON.stringify(hiddenArtists)); }, [hiddenArtists]);
  useEffect(() => {
    localStorage.setItem("capi_volume", String(volume));
    if (audioRef.current) { audioRef.current.volume = volume; }
  }, [volume]);

  // Close playlist dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (playlistDropdownRef.current && !playlistDropdownRef.current.contains(e.target as Node)) {
        setShowPlaylistDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Carousel auto-scroll timer (4 seconds)
  useEffect(() => {
    if (activeTab !== "home") return;
    const n = carouselTracks.length;
    if (n === 0) return;
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % n);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, carouselTracks.length]);

  // ESC, Space, and Arrow shortcuts
  useEffect(() => {
    const dismissArrow = () => {
      if (toastDismissRef.current) clearTimeout(toastDismissRef.current);
      toastDismissRef.current = setTimeout(() => setToastData(null), 1500);
    };

    const handleKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.getAttribute("contenteditable") === "true")) {
        return;
      }

      if (e.key === "Escape") {
        if (isPlayerExpanded) {
          setIsPlayerExpanded(false);
        } else {
          setCurrentTrack(null);
          setStreamUrl(null);
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
          }
        }
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }

      if (e.shiftKey && e.key === "ArrowUp") {
        e.preventDefault();
        setIsPlayerExpanded(true);
      } else if (e.shiftKey && e.key === "ArrowRight") {
        e.preventDefault();
        playNext();
      } else if (e.shiftKey && e.key === "ArrowLeft") {
        e.preventDefault();
        playPrev();
      }

      if (isPlayerExpanded) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (audioRef.current) {
            const STEP = 5;
            const newTime = Math.min(audioRef.current.currentTime + STEP, audioRef.current.duration || 0);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            seekAccumRef.current = Math.max(seekAccumRef.current, 0) + STEP;
            if (seekAccumTimerRef.current) clearTimeout(seekAccumTimerRef.current);
            setToastData({ kind: "seek", direction: "forward", seconds: seekAccumRef.current });
            seekAccumTimerRef.current = setTimeout(() => { seekAccumRef.current = 0; }, 1500);
            dismissArrow();
          }
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (audioRef.current) {
            const STEP = 5;
            const newTime = Math.max(audioRef.current.currentTime - STEP, 0);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            seekAccumRef.current = Math.min(seekAccumRef.current, 0) - STEP;
            if (seekAccumTimerRef.current) clearTimeout(seekAccumTimerRef.current);
            setToastData({ kind: "seek", direction: "backward", seconds: Math.abs(seekAccumRef.current) });
            seekAccumTimerRef.current = setTimeout(() => { seekAccumRef.current = 0; }, 1500);
            dismissArrow();
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.min(prev + 0.05, 1);
            if (audioRef.current) audioRef.current.volume = newVol;
            if (volumeToastTimerRef.current) clearTimeout(volumeToastTimerRef.current);
            setToastData({ kind: "volume", level: newVol });
            dismissArrow();
            return newVol;
          });
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.max(prev - 0.05, 0);
            if (audioRef.current) audioRef.current.volume = newVol;
            if (volumeToastTimerRef.current) clearTimeout(volumeToastTimerRef.current);
            setToastData({ kind: "volume", level: newVol });
            dismissArrow();
            return newVol;
          });
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPlayerExpanded, isPlaying, streamUrl]);

  const getNextTrackToPlay = useCallback((): Track | null => {
    if (activeQueue.length === 0) return null;
    
    if (repeatMode === "one" && currentTrack) {
      return currentTrack;
    }

    if (isShuffle) {
      if (nextRandomIndexRef.current === null || nextRandomIndexRef.current >= activeQueue.length) {
        nextRandomIndexRef.current = Math.floor(Math.random() * activeQueue.length);
      }
      return activeQueue[nextRandomIndexRef.current];
    }

    const currentIndex = activeQueue.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex !== -1 && currentIndex < activeQueue.length - 1) {
      return activeQueue[currentIndex + 1];
    } else if (repeatMode === "all") {
      return activeQueue[0];
    }
    return null;
  }, [activeQueue, currentTrack, isShuffle, repeatMode]);

  // Preload the next track's stream URL in background
  useEffect(() => {
    if (!currentTrack) return;
    const nextTrack = getNextTrackToPlay();
    // Skip preload for playlist/radio IDs - they need playlist resolution first
    const isPlaylistId = nextTrack && (nextTrack.id.startsWith('RDCLAK') || nextTrack.id.startsWith('OLAK') || nextTrack.id.startsWith('PL') || nextTrack.id.startsWith('local://'));
    if (nextTrack && !isPlaylistId && !downloads[nextTrack.id] && !streamCacheRef.current[nextTrack.id]) {
      invoke<string>("obtener_stream", { id: nextTrack.id }).then(resultJson => {
        let stream = resultJson;
        try {
          const parsed = JSON.parse(resultJson);
          if (parsed.error) return; // Don't cache errors
          if (parsed.streamUrl) stream = parsed.streamUrl;
          else if (parsed.url) stream = parsed.url;
        } catch {}
        if (stream.startsWith('"') && stream.endsWith('"')) {
          stream = stream.substring(1, stream.length - 1);
        }
        // Wrap in proxy for consistency
        stream = `http://127.0.0.1:${localPort}/play?url=${encodeURIComponent(stream)}`;
        streamCacheRef.current[nextTrack.id] = stream;
        console.log(`[PRELOAD] Preloaded next track: ${nextTrack.title}`);
      }).catch(err => {
        console.error("[PRELOAD] Failed preloading track stream:", err);
      });
    }
  }, [currentTrack?.id, activeQueue, isShuffle, getNextTrackToPlay, downloads]);

  // Load Homepage dynamic recommendations
  useEffect(() => { fetchHomeData(); }, []);

  // Fetch new releases on-demand when activeTab is "lanzamientos"
  useEffect(() => {
    if (activeTab === "lanzamientos" && newReleases.length === 0) {
      fetchNewReleases();
    }
  }, [activeTab, newReleases.length]);

  const autoScrollTimeoutRef = useRef<number | null>(null);
  const listenedAccumRef = useRef<{ trackId: string; ms: number }>({ trackId: "", ms: 0 });
  const listenedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const parsedLyricsRef = useRef(parsedLyrics);
  parsedLyricsRef.current = parsedLyrics;

  const syncLyricsScroll = useCallback((force = false) => {
    const curLyrics = parsedLyricsRef.current;
    const curTime = currentTimeRef.current;
    if (curLyrics.length === 0) return;
    const index = curLyrics.findIndex((line, i) => {
      const nextLine = curLyrics[i + 1];
      return curTime >= line.time && (!nextLine || curTime < nextLine.time);
    });
    if (index !== -1) {
      setCurrentLyricIndex(index);
      if (lyricsScrollLocked || force) {
        const activeEl = document.getElementById(`lyric-line-${index}`);
        if (activeEl && lyricsContainerRef.current) {
          ignoreNextScrollRef.current = true;
          if (autoScrollTimeoutRef.current) {
            window.clearTimeout(autoScrollTimeoutRef.current);
          }
          autoScrollTimeoutRef.current = window.setTimeout(() => {
            ignoreNextScrollRef.current = false;
          }, 800);

          lyricsContainerRef.current.scrollTo({
            top: activeEl.offsetTop - lyricsContainerRef.current.clientHeight / 2 + activeEl.clientHeight / 2,
            behavior: "smooth"
          });
        }
      }
    }
  }, [lyricsScrollLocked]);

  // Synchronized lyrics updater
  useEffect(() => {
    syncLyricsScroll(false);
  }, [currentTime, parsedLyrics, syncLyricsScroll]);

  // Auto-sync lyrics scroll when player is expanded or tab is set to lyrics
  useEffect(() => {
    if (isPlayerExpanded && playerTab === "lyrics" && lyricsScrollLocked) {
      const timer = setTimeout(() => {
        syncLyricsScroll(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPlayerExpanded, playerTab, lyricsScrollLocked, syncLyricsScroll]);

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
      const top = await getTopArtistsFromDB(10);
      setTopArtists(top);
    } catch (e) {
      console.error("Failed to load top artists for home circular section:", e);
    }

    // TIER 1: Personalized sections from local data
    try {
      const personalSections = await getPersonalizedHomeSections(async (query) => {
        const res = await invoke<string>("buscar_cancion", { query });
        const data = JSON.parse(res);
        const items = Array.isArray(data) ? data : data.tracks || data.results || [];
        return items.slice(0, 8);
      });
      if (personalSections.length >= 2) {
        setHomeSections(personalSections);
        return;
      }
    } catch (e) {
      console.error("Failed to load personalized home sections:", e);
    }

    // TIER 2: YouTube Music curated content
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

    // TIER 3: Recommendation queries via search
    try {
      const recQueries = await getRecommendationQueries(20);
      if (recQueries.length > 0) {
        const sections: any[] = [];
        for (const query of recQueries) {
          try {
            const res = await invoke<string>("buscar_cancion", { query });
            const data = JSON.parse(res);
            const items = (Array.isArray(data) ? data : data.tracks || data.results || []).slice(0, 8);
            if (items.length > 0) {
              const title = query.charAt(0).toUpperCase() + query.slice(1);
              sections.push({ title, items });
            }
          } catch (err) {
            console.error(`Failed to load rec query ${query}:`, err);
          }
        }
        if (sections.length > 0) {
          setHomeSections(sections);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to generate recommendation queries:", err);
    }

    // TIER 4: Fallback genre searches
    loadHomeFallback();
  };

  const fetchNewReleases = async () => {
    try {
      const response = await invoke<string>("obtener_home", { continuation: null });
      const parsed = JSON.parse(response);
      const sections = Array.isArray(parsed) ? parsed : (parsed.sections || []);
      const newReleasesSection = sections.find((s: any) => 
        s.title?.toLowerCase().includes("new releases") || 
        s.title?.toLowerCase().includes("novedades") ||
        s.title?.toLowerCase().includes("lanzamientos")
      );
      if (newReleasesSection && newReleasesSection.items?.length > 0) {
        setNewReleases(newReleasesSection.items.map(convertYTItemToTrack));
      } else {
        const searchRes = await invoke<string>("buscar_cancion", { query: "new music releases" });
        const parsedSearch = JSON.parse(searchRes);
        const tracks = Array.isArray(parsedSearch) ? parsedSearch : (parsedSearch.tracks || parsedSearch.results || []);
        setNewReleases(tracks.map(convertYTItemToTrack).slice(0, 12));
      }
    } catch (e) {
      console.error("Failed to fetch new releases:", e);
      try {
        const searchRes = await invoke<string>("buscar_cancion", { query: "trending music" });
        const parsedSearch = JSON.parse(searchRes);
        const tracks = Array.isArray(parsedSearch) ? parsedSearch : (parsedSearch.tracks || parsedSearch.results || []);
        setNewReleases(tracks.map(convertYTItemToTrack).slice(0, 12));
      } catch (err2) {
        console.error("All fallback release fetches failed:", err2);
      }
    }
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
    setLoadingArtist(true);
    setArtistData(null);
    try {
      const response = await invoke<string>("obtener_artista", { id: artistId });
      const parsed = JSON.parse(response);
      setArtistData(parsed);
      navigateTo("artist", { artistId, artistData: parsed });
    } catch (e) {
      console.error("Failed to fetch artist profile:", e);
    } finally {
      setLoadingArtist(false);
    }
  };

  const playTrackNext = (track: Track) => {
    setActiveQueue(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const currentIndex = filtered.findIndex(t => t.id === currentTrack?.id);
      if (currentIndex === -1) {
        return [track, ...filtered];
      }
      const newQueue = [...filtered];
      newQueue.splice(currentIndex + 1, 0, track);
      return newQueue;
    });
    showToast(`"${track.title}" se reproducirá a continuación`);
  };

  const addToQueue = (track: Track) => {
    setActiveQueue(prev => {
      if (prev.some(t => t.id === track.id)) {
        showToast(`"${track.title}" ya está en la cola`);
        return prev;
      }
      showToast(`"${track.title}" añadida a la cola`);
      return [...prev, track];
    });
  };

  const viewAlbumFromTrack = async (track: Track) => {
    if (!track.album) return;
    setLoading(true);
    try {
      const query = `${track.album} ${track.artist}`;
      const searchRes = await invoke<string>("buscar_cancion", { query });
      const parsed = JSON.parse(searchRes);
      const items = Array.isArray(parsed) ? parsed : (parsed.albums || parsed.results || []);
      const albumItem = items.find((item: any) => item.type === "album" || item.type?.toLowerCase().includes("album")) || items[0];
      if (albumItem && (albumItem.id || albumItem.browseId)) {
        loadAlbumProfile(
          albumItem.id || albumItem.browseId,
          albumItem.title || track.album,
          albumItem.thumbnail || track.thumbnail,
          "album",
          track.artist
        );
      } else {
        showToast("No se pudo encontrar el álbum");
      }
    } catch (e) {
      console.error("Error finding album:", e);
      showToast("Error al buscar el álbum");
    } finally {
      setLoading(false);
    }
  };

  const loadAlbumProfile = async (id: string, title: string, thumbnail: string, type: string, artistName?: string) => {
    setCurrentAlbum({ id, title, thumbnail, type, artist: artistName });
    setCurrentAlbumTracks([]);
    navigateTo("album_view", {
      currentAlbum: { id, title, thumbnail, type, artist: artistName },
      currentAlbumTracks: []
    });
    let playlistJson = "";
    try {
      playlistJson = await invoke<string>("obtener_playlist", { id });
    } catch (err) {
      console.warn("obtener_playlist failed, attempting fallback search for album/playlist", err);
      try {
        const searchQuery = `${title} ${artistName || ""}`;
        const searchRes = await invoke<string>("buscar_cancion", { query: searchQuery });
        const parsedSearch = JSON.parse(searchRes);
        const items = Array.isArray(parsedSearch) ? parsedSearch : (parsedSearch.albums || parsedSearch.playlists || parsedSearch.results || []);
        const matchedItem = items.find((item: any) => 
          (item.type === "album" || item.type === "playlist") && 
          item.title?.toLowerCase() === title.toLowerCase()
        ) || items[0];
        
        if (matchedItem && (matchedItem.id || matchedItem.browseId)) {
          const fallbackId = matchedItem.id || matchedItem.browseId;
          playlistJson = await invoke<string>("obtener_playlist", { id: fallbackId });
        } else {
          throw new Error("No matching album/playlist found in fallback search");
        }
      } catch (fallbackErr) {
        console.error("Failed fallback search for album:", fallbackErr);
        playlistJson = "[]";
      }
    }

    try {
      const songs: Track[] = JSON.parse(playlistJson);
      setCurrentAlbumTracks(songs);
      
      setNavHistory(prev => {
        const copy = [...prev];
        if (copy[navIndex]) {
          copy[navIndex] = {
            ...copy[navIndex],
            currentAlbumTracks: songs
          };
        }
        return copy;
      });
    } catch (err) {
      console.error("Failed to parse album tracks:", err);
      alert("Error al cargar las canciones del álbum.");
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

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 4: Sleep Timer Logic
  // ═══════════════════════════════════════════════════════════════
  const startSleepTimer = (minutes: number) => {
    cancelSleepTimer();
    setSleepMode("time");
    setSleepTimerSeconds(minutes * 60);
    showToast(`Sleep Timer: ${minutes} minutos`);
    setShowSleepTimerMenu(false);
  };

  const startSleepEndOfTrack = () => {
    cancelSleepTimer();
    setSleepMode("endOfTrack");
    setSleepTimerSeconds(null);
    showToast("Sleep Timer: Fin de canción actual");
    setShowSleepTimerMenu(false);
  };

  const cancelSleepTimer = () => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerSeconds(null);
    setSleepMode(null);
  };

  // Sleep timer countdown effect
  useEffect(() => {
    if (sleepMode === "time" && sleepTimerSeconds !== null && sleepTimerSeconds > 0) {
      sleepTimerRef.current = setInterval(() => {
        setSleepTimerSeconds(prev => {
          if (prev === null || prev <= 1) {
            // Time's up, pause music
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
            cancelSleepTimer();
            showToast("Sleep Timer finalizado — música pausada");
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      };
    }
  }, [sleepMode]);

  const formatSleepTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 5: Dynamic Theme Color Extraction
  // ═══════════════════════════════════════════════════════════════
  const extractColorsFromImage = useCallback((imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        
        // Simple dominant color extraction using color bucketing
        const colorBuckets: Record<string, { r: number; g: number; b: number; count: number }> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          // Skip very dark and very light colors
          const brightness = (r + g + b) / 3;
          if (brightness < 30 || brightness > 230) continue;
          // Skip very gray colors
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          if (maxC - minC < 20) continue;
          
          const key = `${r}-${g}-${b}`;
          if (!colorBuckets[key]) {
            colorBuckets[key] = { r, g, b, count: 0 };
          }
          colorBuckets[key].count++;
        }
        
        const sorted = Object.values(colorBuckets).sort((a, b) => b.count - a.count);
        if (sorted.length === 0) return;
        
        const toHex = (c: { r: number; g: number; b: number }) =>
          `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`;
        
        // Pick 3 distinct colors
        const primary = sorted[0];
        const secondary = sorted.length > 1 ? sorted[1] : primary;
        const tertiary = sorted.length > 2 ? sorted[2] : secondary;
        
        setExtractedColors({
          primary: toHex(primary),
          secondary: toHex(secondary),
          tertiary: toHex(tertiary),
        });
      } catch {
        // CORS or canvas error — silently ignore
      }
    };
    img.onerror = () => {
      // Can't load image, keep current colors
    };
    img.src = imageUrl;
  }, []);



  // Extract colors when track changes
  useEffect(() => {
    if (dynamicThemeEnabled && currentTrack) {
      extractColorsFromImage(getHighQualityThumbnail(currentTrack.thumbnail));
    }
  }, [currentTrack?.id, dynamicThemeEnabled]);

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 11: Usage Statistics Tracking
  // ═══════════════════════════════════════════════════════════════
  // Track play counts & listening time
  useEffect(() => {
    if (currentTrack && isPlaying) {
      const ref = statsTrackingRef.current;
      if (ref.trackId !== currentTrack.id) {
        ref.trackId = currentTrack.id;
        ref.startTime = Date.now();
        ref.counted = false;
      }
    }
  }, [currentTrack?.id, isPlaying]);

  // Record stats after 30s of playback
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const interval = setInterval(() => {
      const ref = statsTrackingRef.current;
      if (ref.trackId === currentTrack.id && ref.startTime && !ref.counted) {
        const elapsed = (Date.now() - ref.startTime) / 1000;
        if (elapsed >= 30) {
          ref.counted = true;
          setListeningStats(prev => {
            const today = new Date().toISOString().split('T')[0];
            const trackDuration = currentTrack.duration || 180;
            const minutesPlayed = Math.round(trackDuration / 60);
            const newStats = {
              ...prev,
              totalMinutes: prev.totalMinutes + minutesPlayed,
              trackPlays: {
                ...prev.trackPlays,
                [currentTrack.id]: {
                  track: currentTrack,
                  plays: (prev.trackPlays[currentTrack.id]?.plays || 0) + 1,
                },
              },
              artistMinutes: {
                ...prev.artistMinutes,
                [currentTrack.artist]: (prev.artistMinutes[currentTrack.artist] || 0) + minutesPlayed,
              },
              dailyMinutes: {
                ...prev.dailyMinutes,
                [today]: (prev.dailyMinutes[today] || 0) + minutesPlayed,
              },
            };
            localStorage.setItem("capi_listening_stats", JSON.stringify(newStats));
            return newStats;
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.id]);

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 9: Discord Rich Presence Logic
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    localStorage.setItem("capi_discord_rpc", String(discordEnabled));
    if (discordEnabled) {
      invoke("discord_connect")
        .then(() => {
          setDiscordConnected(true);
        })
        .catch((err) => {
          console.error("Error connecting to Discord:", err);
          setDiscordConnected(false);
        });
    } else {
      invoke("discord_disconnect")
        .then(() => {
          setDiscordConnected(false);
        })
        .catch((err) => {
          console.error("Error disconnecting from Discord:", err);
        });
    }
    return () => {
      invoke("discord_disconnect").catch(() => {});
    };
  }, [discordEnabled]);

  // Update Discord activity when song changes or plays/pauses
  useEffect(() => {
    if (!discordEnabled || !discordConnected) return;
    const title = currentTrack ? currentTrack.title : "";
    const artist = currentTrack ? currentTrack.artist : "";
    const thumbnail = currentTrack ? getHighQualityThumbnail(currentTrack.thumbnail) : "";
    const duration = currentTrack ? (currentTrack.duration || 0) : 0;
    const elapsed = audioRef.current ? Math.round(audioRef.current.currentTime) : 0;

    invoke("discord_update", {
      title,
      artist,
      thumbnail,
      elapsed,
      duration,
      isPlaying: isPlaying && !!currentTrack,
    }).catch((err) => {
      console.error("Error updating Discord status:", err);
    });
  }, [currentTrack?.id, isPlaying, discordEnabled, discordConnected]);

  // Periodically update progress/elapsed time on Discord
  useEffect(() => {
    if (!discordEnabled || !discordConnected || !isPlaying || !currentTrack) return;
    const interval = setInterval(() => {
      const title = currentTrack.title;
      const artist = currentTrack.artist;
      const thumbnail = getHighQualityThumbnail(currentTrack.thumbnail);
      const duration = currentTrack.duration || 0;
      const elapsed = audioRef.current ? Math.round(audioRef.current.currentTime) : 0;

      invoke("discord_update", {
        title,
        artist,
        thumbnail,
        elapsed,
        duration,
        isPlaying: true,
      }).catch((err) => {
        console.error("Error periodic updating Discord status:", err);
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [currentTrack?.id, isPlaying, discordEnabled, discordConnected]);

  const getTopTracks = () => {
    return Object.values(listeningStats.trackPlays)
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);
  };

  const getTopArtists = () => {
    return Object.entries(listeningStats.artistMinutes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, minutes]) => ({ name, minutes }));
  };

  const getWeeklyActivity = () => {
    const days: { label: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      days.push({ label: dayNames[d.getDay()], minutes: listeningStats.dailyMinutes[key] || 0 });
    }
    return days;
  };

  const getStreakDays = () => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().split('T')[0];
      if (listeningStats.dailyMinutes[key] && listeningStats.dailyMinutes[key] > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const resetStats = () => {
    const emptyStats = { totalMinutes: 0, trackPlays: {}, artistMinutes: {}, dailyMinutes: {} };
    setListeningStats(emptyStats);
    localStorage.setItem("capi_listening_stats", JSON.stringify(emptyStats));
    showToast("Estadísticas reiniciadas");
  };

  // ═══════════════════════════════════════════════════════════════
  // FEATURE 15: Lyrics Translation
  // ═══════════════════════════════════════════════════════════════
  const TRANSLATION_LANGS = [
    { code: "es", name: "Español" },
    { code: "en", name: "English" },
    { code: "pt", name: "Português" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "it", name: "Italiano" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
  ];

  const translateLyrics = async (targetLang: string = translationLang) => {
    if (parsedLyrics.length === 0 && !lyricsText) return;
    setTranslating(true);
    setLyricsMenuOpen(false);
    try {
      const lines = parsedLyrics.length > 0
        ? parsedLyrics.map(l => l.text).filter(t => t.trim())
        : lyricsText.split("\n").filter(l => l.trim());
      
      // Translate in chunks of 10 lines to avoid API limits
      const translatedLines: string[] = [];
      for (let i = 0; i < lines.length; i += 10) {
        const chunk = lines.slice(i, i + 10).join("\n");
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=autodetect|${targetLang}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.responseData?.translatedText) {
          translatedLines.push(...data.responseData.translatedText.split("\n"));
        } else {
          translatedLines.push(...lines.slice(i, i + 10));
        }
      }

      // Map back to LyricLine with original timestamps
      if (parsedLyrics.length > 0) {
        const mapped: LyricLine[] = [];
        let tIdx = 0;
        for (const original of parsedLyrics) {
          if (original.text.trim()) {
            mapped.push({ time: original.time, text: translatedLines[tIdx] || original.text });
            tIdx++;
          } else {
            mapped.push(original);
          }
        }
        setTranslatedLyrics(mapped);
      } else {
        setTranslatedLyrics(translatedLines.map((t, i) => ({ time: i * 5, text: t })));
      }
      setShowTranslation(true);
      showToast(`Letras traducidas a ${TRANSLATION_LANGS.find(l => l.code === targetLang)?.name || targetLang}`);
    } catch (e) {
      console.error("Translation error:", e);
      showToast("Error al traducir las letras");
    }
    setTranslating(false);
  };

  // Reset translation when track changes
  useEffect(() => {
    setTranslatedLyrics(null);
    setShowTranslation(false);
  }, [currentTrack?.id]);

  const playTrack = async (track: Track, queueList: Track[] = []) => {
    // Immediately stop current playback before doing anything else
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    setIsPlaying(false);
    setStreamUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setBuffering(false);
    // Track play count for cache threshold — DISABLED
    // playCountCacheRef.current[track.id] = (playCountCacheRef.current[track.id] || 0) + 1;

    // Flush listened time for previous track before starting new one
    if (listenedAccumRef.current.trackId && listenedAccumRef.current.ms > 0) {
      addListenedTime(listenedAccumRef.current.trackId, listenedAccumRef.current.ms);
      listenedAccumRef.current = { trackId: "", ms: 0 };
    }
    if (listenedIntervalRef.current) {
      clearInterval(listenedIntervalRef.current);
      listenedIntervalRef.current = null;
    }

    try {
      // Detect playlist/radio IDs and resolve them into actual songs first
      const isPlaylistId = track.id.startsWith('RDCLAK') || track.id.startsWith('OLAK') || track.id.startsWith('PL');
      if (isPlaylistId) {
        console.log(`[PLAY] Detected playlist ID: ${track.id}, resolving songs...`);
        setLoading(true);
        setBuffering(true);
        try {
          const playlistJson = await invoke<string>("obtener_playlist", { id: track.id });
          const songs: Track[] = JSON.parse(playlistJson);
          if (songs.length > 0) {
            console.log(`[PLAY] Resolved ${songs.length} songs from playlist, playing first: ${songs[0].title}`);
            setLoading(false);
            setBuffering(false);
            return playTrack(songs[0], songs);
          } else {
            throw new Error("Playlist vacía");
          }
        } catch (err: any) {
          console.error("[PLAY] Failed to resolve playlist:", err);
          alert("Error al cargar la playlist: " + (err.message || err));
          setLoading(false);
          setBuffering(false);
          return;
        }
      }

      console.time(`[PLAY-TIMING] ${track.title}`);
      const isCachedOrLocal = !!(downloads[track.id] || streamCacheRef.current[track.id]);
      if (!isCachedOrLocal) {
        setLoading(true);
        setBuffering(true);
      }
      setCurrentTrack(track);
      console.timeLog(`[PLAY-TIMING] ${track.title}`, 'state updates done');

      if (queueList.length > 0) {
        setActiveQueue(queueList);
      } else if (!activeQueue.some(t => t.id === track.id)) {
        setActiveQueue(prev => [track, ...prev]);
      }

      setHistory(prev => {
        const filtered = prev.filter(t => t.id !== track.id);
        return [track, ...filtered].slice(0, 50);
      });

      recordPlayEvent(track, 0).catch(err => console.error("recordPlayEvent failed:", err));
      
      let stream: string;
      if (track.id.startsWith("local://")) {
        const path = track.id.replace("local://", "");
        stream = `http://127.0.0.1:${localPort}/play?path=${encodeURIComponent(path)}`;
        console.timeLog(`[PLAY-TIMING] ${track.title}`, 'using local custom folder file');
      } else if (downloads[track.id]) {
        const path = downloads[track.id];
        stream = `http://127.0.0.1:${localPort}/play?path=${encodeURIComponent(path)}`;
        console.timeLog(`[PLAY-TIMING] ${track.title}`, 'using downloaded file');
      } else if (streamCacheRef.current[track.id]) {
        stream = streamCacheRef.current[track.id];
        console.timeLog(`[PLAY-TIMING] ${track.title}`, 'using cached stream URL');
      } else {
        console.timeLog(`[PLAY-TIMING] ${track.title}`, 'calling obtener_stream...');
        const resultJson = await invoke<string>("obtener_stream", { id: track.id });
        console.timeLog(`[PLAY-TIMING] ${track.title}`, 'obtener_stream returned');
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

        // Wrap the YouTube stream URL in our local HTTP server
        stream = `http://127.0.0.1:${localPort}/play?url=${encodeURIComponent(stream)}`;
        streamCacheRef.current[track.id] = stream;
        console.timeLog(`[PLAY-TIMING] ${track.title}`, 'stream URL wrapped in proxy');

        // Cache after 2+ plays (fire-and-forget, never blocks playback) — DISABLED
        // if (playCountCacheRef.current[track.id] >= 2) {
        //   setCacheDownloadsProgress(prev => ({ ...prev, [track.id]: 0 }));
        //   invoke("cache_audio", { trackId: track.id, url: originalStreamUrl, title: track.title, artist: track.artist, thumbnail: track.thumbnail })
        //     .then(() => setCacheDownloadsProgress(prev => ({ ...prev, [track.id]: 100 })))
        //     .catch(() => setCacheDownloadsProgress(prev => {
        //       const copy = { ...prev };
        //       delete copy[track.id];
        //       return copy;
        //     }));
        // }
      }

      setStreamUrl(stream);
      console.timeLog(`[PLAY-TIMING] ${track.title}`, 'setting audio.src...');
      
      if (audioRef.current) {
        audioRef.current.src = stream;
        console.timeLog(`[PLAY-TIMING] ${track.title}`, 'calling audio.play()...');
        audioRef.current.play().then(() => {
          console.timeEnd(`[PLAY-TIMING] ${track.title}`);
          console.log(`[PLAY-TIMING] ✅ Playback started for: ${track.title}`);
          setIsPlaying(true);
          setBuffering(false);
          setLoading(false);
          // Start listening time accumulator
          listenedAccumRef.current = { trackId: track.id, ms: 0 };
          if (listenedIntervalRef.current) clearInterval(listenedIntervalRef.current);
          listenedIntervalRef.current = setInterval(() => {
            listenedAccumRef.current.ms += 10000;
          }, 10000);
        }).catch(err => {
          console.timeEnd(`[PLAY-TIMING] ${track.title}`);
          console.error("Playback error:", err, "for stream:", stream);
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
    playTrack(shuffled[0], shuffled);
  };

  const handleCustomColorChange = (color: string) => {
    setAccentColor("custom");
    localStorage.setItem("capi_accent_color", "custom");
    localStorage.setItem("capi_custom_accent_color", color);
    
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', color);
    root.style.setProperty('--brand-secondary', color + "dd");
    root.style.setProperty('--brand-tertiary', color + "aa");
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPreMuteVolume(volume);
      setVolume(0);
    } else {
      setVolume(preMuteVolume > 0 ? preMuteVolume : 0.8);
    }
  };

  const downloadAllTracks = (playlistTracks: Track[]) => {
    showToast(`Iniciando descarga de ${playlistTracks.length} canciones en paralelo...`);
    playlistTracks.forEach(async (t) => {
      if (!downloads[t.id]) {
        try {
          await downloadTrack(t);
        } catch (e) {
          console.error("Error downloading track in playlist:", e);
        }
      }
    });
  };

  const openPlaylistContextMenu = (e: React.MouseEvent, playlist: Playlist) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPlaylist(playlist);
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

      setActiveDownloads(prev => ({ ...prev, [track.id]: track }));
      activeDownloadsRef.current[track.id] = true;
      setDownloadProgress(prev => ({ ...prev, [track.id]: 0 }));

      const localPath = await invoke<string>("descargar_cancion", {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        url: stream
      });

      if (!activeDownloadsRef.current[track.id]) {
        // Download was cancelled, do not save
        return;
      }

      setDownloads(prev => ({ ...prev, [track.id]: localPath }));
      setDownloadedMetadata(prev => {
        if (prev.some(t => t.id === track.id)) return prev;
        return [...prev, track];
      });
    } catch (error) {
      if (activeDownloadsRef.current[track.id]) {
        console.error("Download failed:", error);
        alert("Error al descargar.");
      }
    } finally {
      setActiveDownloads(prev => {
        const copy = { ...prev };
        delete copy[track.id];
        return copy;
      });
      activeDownloadsRef.current[track.id] = false;
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

  const performSearchWithQuery = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    navigateTo("buscar");
    setLoading(true);
    setShowSearchDropdown(false);
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h !== searchQuery.trim());
      return [searchQuery.trim(), ...filtered].slice(0, 15);
    });
    try {
      const responseJson = await invoke<string>("buscar_cancion", { query: searchQuery });
      const data = JSON.parse(responseJson);
      
      let parsedTracks: Track[] = (Array.isArray(data) ? data : data.tracks || data.results || []).map((t: any) => ({
        id: t.id, title: t.title, artist: (t.artist && t.artist !== "YT Music") ? t.artist : "Artista Desconocido",
        album: t.album || "", duration: t.duration || 0,
        thumbnail: t.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300",
        explicit: t.explicit || false,
        artistId: t.artistId || undefined
      }));

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearchWithQuery(query);
  };

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

  const getVisibleSuggestions = useCallback(() => {
    if (query.trim() === "") {
      return searchHistory;
    } else if (searchSuggestions.length > 0) {
      return searchSuggestions;
    } else {
      return searchHistory.filter(h => h.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
    }
  }, [query, searchSuggestions, searchHistory]);

  const visibleSuggestions = getVisibleSuggestions();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchDropdown || visibleSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % visibleSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + visibleSuggestions.length) % visibleSuggestions.length);
    } else if (e.key === "Tab") {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % visibleSuggestions.length);
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < visibleSuggestions.length) {
        e.preventDefault();
        const selected = visibleSuggestions[activeSuggestionIndex];
        setQuery(selected);
        setShowSearchDropdown(false);
        performSearchWithQuery(selected);
      }
    }
  };

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

  const renamePlaylist = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
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

  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const playlistDropdownRef = useRef<HTMLDivElement | null>(null);

  const handleSelectAll = () => {
    const currentList = libTab === "downloads" ? downloadedMetadata : libTab === "history" ? history : localTracks;
    if (selectedTrackIds.size === currentList.length) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(currentList.map(t => t.id)));
    }
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
    localStorage.setItem("capi_sidebar_collapsed", String(nextVal));
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

  const openAlbumOrPlaylistContextMenu = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuAlbumOrPlaylist(item);
  };

  const fetchTracksForAlbumOrPlaylist = async (item: any): Promise<Track[]> => {
    const id = item.playlistId || item.id || item.browseId;
    if (!id) return [];
    
    // Check if it's a local playlist first
    const local = playlists.find(p => p.id === (item.id || item.browseId));
    if (local) return local.tracks;

    // Otherwise, fetch from backend daemon
    setLoadingTracksForMenu(true);
    try {
      const response = await invoke<string>("obtener_playlist", { id });
      const songs: Track[] = JSON.parse(response);
      return songs;
    } catch (err) {
      console.error("Error fetching album/playlist tracks:", err);
      showToast("Error al obtener canciones");
      return [];
    } finally {
      setLoadingTracksForMenu(false);
    }
  };

  const playTracksNext = (tracksToInsert: Track[]) => {
    if (tracksToInsert.length === 0) return;
    setActiveQueue(prev => {
      const toInsertIds = new Set(tracksToInsert.map(t => t.id));
      const filtered = prev.filter(t => !toInsertIds.has(t.id));
      const currentIndex = filtered.findIndex(t => t.id === currentTrack?.id);
      const newQueue = [...filtered];
      if (currentIndex === -1) {
        newQueue.unshift(...tracksToInsert);
      } else {
        newQueue.splice(currentIndex + 1, 0, ...tracksToInsert);
      }
      return newQueue;
    });
    showToast(T("toast_play_next") || "Reproduciendo a continuación");
  };

  const addTracksToQueue = (tracksToAppend: Track[]) => {
    if (tracksToAppend.length === 0) return;
    setActiveQueue(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd = tracksToAppend.filter(t => !existingIds.has(t.id));
      if (toAdd.length === 0) {
        showToast("Ya en la cola");
        return prev;
      }
      showToast("Agregado a la cola");
      return [...prev, ...toAdd];
    });
  };

  const addTracksToFavorites = (tracksToAppend: Track[]) => {
    if (tracksToAppend.length === 0) return;
    setFavorites(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd = tracksToAppend.filter(t => !existingIds.has(t.id));
      if (toAdd.length === 0) return prev;
      showToast("Agregado a favoritos");
      return [...prev, ...toAdd];
    });
  };

  const saveAlbumOrPlaylistAsLocal = async (item: any) => {
    setContextMenuAlbumOrPlaylist(null);
    const resolvedTracks = await fetchTracksForAlbumOrPlaylist(item);
    if (resolvedTracks.length === 0) return;
    const playlistName = item.title || item.name || "Nueva Playlist";
    const newPl: Playlist = {
      id: Math.random().toString(36).substring(2, 9),
      name: playlistName.trim(),
      tracks: resolvedTracks
    };
    setPlaylists(prev => [...prev, newPl]);
    showToast("Playlist guardada");
  };

  const extractPlaylistIdFromUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    // Direct ID (no URL)
    if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) return trimmed;
    // YouTube / YouTube Music playlist URL
    try {
      const u = new URL(trimmed);
      const list = u.searchParams.get("list");
      if (list) return list;
    } catch {}
    return null;
  };

  const importPlaylistFromUrl = async () => {
    const id = extractPlaylistIdFromUrl(importPlaylistUrl);
    if (!id) {
      showToast("URL de playlist no válida");
      return;
    }
    setShowImportPlaylistModal(false);
    setImportPlaylistUrl("");
    try {
      const response = await invoke<string>("obtener_playlist", { id });
      const tracks: Track[] = JSON.parse(response);
      if (tracks.length === 0) {
        showToast("No se encontraron canciones en esa playlist");
        return;
      }
      const newPl: Playlist = {
        id: Math.random().toString(36).substring(2, 9),
        name: "Playlist Importada",
        tracks,
      };
      setPlaylists(prev => [...prev, newPl]);
      showToast(`Playlist importada (${tracks.length} canciones)`);
    } catch (err) {
      console.error("Error importing playlist:", err);
      showToast("Error al importar la playlist");
    }
  };

  const downloadAlbumOrPlaylist = async (item: any) => {
    setContextMenuAlbumOrPlaylist(null);
    const resolvedTracks = await fetchTracksForAlbumOrPlaylist(item);
    if (resolvedTracks.length === 0) return;
    downloadAllTracks(resolvedTracks);
  };

  const playAlbumOrPlaylistAll = async (item: any) => {
    setContextMenuAlbumOrPlaylist(null);
    const resolvedTracks = await fetchTracksForAlbumOrPlaylist(item);
    if (resolvedTracks.length === 0) return;
    playTrack(resolvedTracks[0], resolvedTracks);
  };

  const playAlbumOrPlaylistShuffle = async (item: any) => {
    setContextMenuAlbumOrPlaylist(null);
    const resolvedTracks = await fetchTracksForAlbumOrPlaylist(item);
    if (resolvedTracks.length === 0) return;
    playShuffleQueue(resolvedTracks);
  };

  const playAlbumOrPlaylistNext = async (item: any) => {
    setContextMenuAlbumOrPlaylist(null);
    const resolvedTracks = await fetchTracksForAlbumOrPlaylist(item);
    if (resolvedTracks.length === 0) return;
    playTracksNext(resolvedTracks);
  };

  const addAlbumOrPlaylistToQueue = async (item: any) => {
    setContextMenuAlbumOrPlaylist(null);
    const resolvedTracks = await fetchTracksForAlbumOrPlaylist(item);
    if (resolvedTracks.length === 0) return;
    addTracksToQueue(resolvedTracks);
  };

  const addAlbumOrPlaylistToFavorites = async (item: any) => {
    setContextMenuAlbumOrPlaylist(null);
    const resolvedTracks = await fetchTracksForAlbumOrPlaylist(item);
    if (resolvedTracks.length === 0) return;
    addTracksToFavorites(resolvedTracks);
  };

  const copyAlbumOrPlaylistLink = (item: any) => {
    setContextMenuAlbumOrPlaylist(null);
    const id = item.playlistId || item.id || item.browseId;
    if (!id) return;
    let url = "";
    if (id.startsWith("OLAK") || id.startsWith("PL") || id.startsWith("RD")) {
      url = `https://music.youtube.com/playlist?list=${id}`;
    } else {
      url = `https://music.youtube.com/browse/${id}`;
    }
    navigator.clipboard.writeText(url);
    showToast("Enlace copiado al portapapeles");
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
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    setDragIndex(idx);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(idx);
  };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
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
    setTracks([]); // Reset search results immediately to avoid flash of old content
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

  // Build carousel from listeningStats + affinity data
  useEffect(() => {
    const build = async () => {
      const tracks: Track[] = [];

      // First 5: top played from listeningStats
      const sortedByPlays = Object.entries(listeningStats.trackPlays)
        .sort(([, a], [, b]) => b.plays - a.plays);
      for (const [, { track }] of sortedByPlays) {
        if (tracks.length >= 5) break;
        if (track && !tracks.some(t => t.id === track.id)) tracks.push(track);
      }

      // If no stats at all, fall back to homeSections[0]
      if (tracks.length === 0 && homeSections.length > 0 && homeSections[0].items) {
        setCarouselTracks(homeSections[0].items.map(convertYTItemToTrack).slice(0, 10));
        return;
      }

      // Fill remaining slots from affinity data (up to 10)
      try {
        const topTracks = await getTopTracksFromDB(20);
        for (const t of topTracks) {
          if (tracks.length >= 10) break;
          if (!tracks.some(ex => ex.id === t.trackId)) {
            tracks.push({
              id: t.trackId,
              title: t.title,
              artist: t.artist,
              duration: 0,
              thumbnail: t.thumbnail,
              explicit: false,
              artistId: t.artistId,
            });
          }
        }
      } catch {}

      // If still not enough, fill from homeSections content
      if (tracks.length < 10 && homeSections.length > 0) {
        const allItems = homeSections.flatMap(s => s.items || []).map(convertYTItemToTrack);
        for (const t of allItems) {
          if (tracks.length >= 10) break;
          if (!tracks.some(ex => ex.id === t.id)) {
            tracks.push(t);
          }
        }
      }

      setCarouselTracks(tracks.slice(0, 10));
    };
    build();
  }, [listeningStats, homeSections]);

  const getQuickPicksTracks = () => {
    if (homeSections.length > 0) {
      const list = homeSections.flatMap(s => s.items.map(convertYTItemToTrack));
      const carouselIds = new Set(carouselTracks.map((c: Track) => c.id));
      return list.filter(t => !carouselIds.has(t.id)).slice(0, 9);
    }
    return [];
  };
  const quickPicksTracks = getQuickPicksTracks();

  return (
    <div className="flex h-screen w-screen bg-bg-dark text-text-primary overflow-hidden font-sans">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          setBuffering(false);
          if (listenedAccumRef.current.trackId && listenedAccumRef.current.ms > 0) {
            addListenedTime(listenedAccumRef.current.trackId, listenedAccumRef.current.ms);
            listenedAccumRef.current = { trackId: "", ms: 0 };
          }
          if (listenedIntervalRef.current) {
            clearInterval(listenedIntervalRef.current);
            listenedIntervalRef.current = null;
          }
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onSeeking={() => setBuffering(true)}
        onSeeked={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onStalled={() => setBuffering(false)}
        onSuspend={() => setBuffering(false)}
        onEmptied={() => setBuffering(false)}
        onError={() => setBuffering(false)}
        onEnded={() => {
          if (sleepMode === "endOfTrack") {
            if (audioRef.current) { audioRef.current.pause(); }
            setIsPlaying(false);
            cancelSleepTimer();
            showToast("Sleep Timer finalizado — música pausada");
          } else if (repeatMode === "one") {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
          } else {
            playNext();
          }
        }}
      />

      {/* Sidebar Navigation */}
      <aside className={`${sidebarCollapsed ? "w-[72px]" : "w-64"} glass flex flex-col justify-between border-r border-white/5 transition-all duration-300 z-20`}>
        <div className="p-4">
          <div className={`flex items-center mb-8 ${sidebarCollapsed ? "justify-center" : "justify-between px-2"}`}>
            {sidebarCollapsed ? (
              /* When collapsed: logo is the expand button */
              <button
                onClick={handleToggleSidebar}
                className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:scale-105 transition bg-bg-dark"
              >
                <img src={Logo} alt="Logo" className="w-full h-full object-cover" />
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 min-w-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-brand-primary/20 bg-bg-dark">
                    <img src={Logo} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-primary to-brand-tertiary bg-clip-text text-transparent">
                    Capi
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
              { tab: "stats" as const, icon: <BarChart3 className="w-5 h-5 min-w-5" />, label: "Estadísticas" },
            ].map(({ tab, icon, label }) => (
              <button
                key={tab}
                onClick={() => navigateTo(tab)}
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
        {/* Bottom profile and settings section inside the sidebar */}
        <div className={`p-4 border-t border-white/5 flex flex-col gap-2 ${sidebarCollapsed ? "items-center" : ""}`}>
          {showSidebarSettings && (
            <button
              onClick={() => navigateTo("settings")}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-xl transition duration-200 ${
                activeTab === "settings" ? "bg-white/5 text-brand-primary font-medium" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
              title="Configuración"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings flex-shrink-0"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              {!sidebarCollapsed && <span className="text-sm">Configuración</span>}
              </button>
            )}
            <button
            onClick={() => navigateTo("perfil")}
            className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-xl transition duration-200 ${
              activeTab === "perfil" ? "bg-white/5 text-brand-primary font-medium" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            }`}
            title="Perfil"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 flex-shrink-0 flex items-center justify-center bg-surface-dark">
              <img 
                src={capiAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150"} 
                alt="Perfil" 
                className="w-full h-full object-cover" 
              />
            </div>
            {!sidebarCollapsed && (
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-none text-white">{capiUsername || "Usuario Capi"}</p>
                <p className="text-[10px] text-text-secondary truncate mt-1">Ver perfil</p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-surface-dark/40 to-bg-dark z-10 relative">
        <header className="h-20 flex items-center px-8 justify-between border-b border-white/5 gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSearchDropdown(true); setActiveSuggestionIndex(-1); }}
                onKeyDown={handleKeyDown}
                onFocus={() => { setSearchFocused(true); setShowSearchDropdown(true); }}
                onBlur={() => { setTimeout(() => { setSearchFocused(false); setShowSearchDropdown(false); }, 200); }}
                placeholder="Buscar música, artistas o álbumes..."
                className="w-full bg-surface-dark border border-white/10 rounded-full py-2.5 pl-11 pr-10 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200"
              />
              <Search className="w-5 h-5 text-text-secondary absolute left-4 top-3" />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setTracks([]);
                    setSearchSuggestions([]);
                    setActiveSuggestionIndex(-1);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-2.5 p-0.5 text-text-secondary hover:text-text-primary transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Search dropdown: suggestions + history */}
            {showSearchDropdown && searchFocused && visibleSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-white/10 rounded-2xl shadow-2xl z-50 suggestions-dropdown overflow-hidden flex flex-col max-h-80">
                <div className="px-4 py-2 text-xs text-text-secondary font-semibold uppercase tracking-wider flex-shrink-0">
                  {query.trim() === "" ? "Historial" : "Sugerencias"}
                </div>
                <div className="overflow-y-auto flex-1">
                  {visibleSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition ${
                        activeSuggestionIndex === idx ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        setQuery(item);
                        setShowSearchDropdown(false);
                        performSearchWithQuery(item);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Search className="w-3.5 h-3.5 text-text-secondary" />
                        <span className="text-sm text-text-primary truncate">{item}</span>
                      </div>
                      {query.trim() === "" && (
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchHistory(prev => prev.filter(h => h !== item));
                          }}
                          className="p-1 text-text-secondary hover:text-red-400 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {query.trim() === "" && searchHistory.length > 0 && (
                  <div className="border-t border-white/5 p-2 bg-surface-dark flex justify-end flex-shrink-0 sticky bottom-0">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerConfirm(
                          "Vaciar Historial de Búsquedas",
                          "¿Estás seguro de que quieres eliminar todo el historial de búsquedas recientes?",
                          () => setSearchHistory([])
                        );
                      }}
                      className="px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition flex items-center gap-1.5 w-full justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Vaciar historial de búsqueda
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>

          <div className="flex items-center gap-4 flex-shrink-0">
            {Object.keys(downloadProgress).length > 0 && (
              <button
                onClick={() => navigateTo("download_manager")}
                className="p-2.5 text-brand-primary hover:text-white rounded-xl hover:bg-white/5 transition relative animate-fade-in"
                title="Descargas activas"
              >
                {/* LineMdDownloadingLoop animate loop SVG */}
                <svg className="w-5 h-5 text-brand-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="32" d="M12 21c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="32;0"/></path><path stroke-dasharray="2 4" stroke-dashoffset="6" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.45s" to="1"/><animateTransform fill="freeze" attributeName="transform" begin="0.45s" dur="0.6s" type="rotate" values="-180 12 12;0 12 12"/><animate attributeName="stroke-dashoffset" begin="0.85s" dur="0.6s" repeatCount="indefinite" to="0"/></path><path stroke-dasharray="10" stroke-dashoffset="10" d="M12 8v7.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.85s" dur="0.2s" to="0"/></path><path stroke-dasharray="8" stroke-dashoffset="8" d="M12 15.5l3.5 -3.5M12 15.5l-3.5 -3.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.05s" dur="0.2s" to="0"/></path></g></svg>
              </button>
            )}
            <button
              onClick={() => navigateTo("lanzamientos")}
              className="p-2.5 text-text-secondary hover:text-white rounded-xl hover:bg-white/5 transition relative"
              title="Lanzamientos"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
            </button>
          </div>
        </header>

        <section ref={scrollableSectionRef} className="flex-1 overflow-y-auto p-8 pb-32">
          {loading && tracks.length === 0 && activeTab === "buscar" && (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              <p className="text-sm text-text-secondary">Cargando...</p>
            </div>
          )}

          {/* HOME VIEW */}
          {activeTab === "home" && (
            <div className="space-y-8 animate-fade-in">
              {homeSections.length > 0 ? (
                <>
                  {/* Carousel */}
                  {carouselTracks.length > 0 && (
                    <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-3xl bg-surface-dark/30 border border-white/5 shadow-xl group/carousel">
                      <div 
                        onTouchStart={(e) => {
                          setCarouselTouchEnd(null);
                          setCarouselTouchStart(e.targetTouches[0].clientX);
                        }}
                        onTouchMove={(e) => {
                          setCarouselTouchEnd(e.targetTouches[0].clientX);
                        }}
                        onTouchEnd={() => {
                          if (!carouselTouchStart || !carouselTouchEnd) return;
                          const distance = carouselTouchStart - carouselTouchEnd;
                          if (distance > 50) {
                            setCarouselIndex(prev => (prev + 1) % carouselTracks.length);
                          } else if (distance < -50) {
                            setCarouselIndex(prev => (prev - 1 + carouselTracks.length) % carouselTracks.length);
                          }
                        }}
                        onClick={() => playTrack(carouselTracks[carouselIndex])}
                        className="cursor-pointer relative h-64 md:h-80 w-full overflow-hidden group"
                      >
                        {/* Background blurred cover */}
                        <div className="absolute inset-0 scale-105 blur-lg opacity-40 transition-all duration-500">
                          <SafeImage src={carouselTracks[carouselIndex].thumbnail} className="w-full h-full object-cover" alt="" />
                        </div>
                        {/* Real content */}
                        <div className="absolute inset-0 flex items-center justify-between px-12 md:px-20 z-10 gap-6">
                          <div className="text-left max-w-md">
                            <span className="text-xs uppercase font-bold tracking-widest text-brand-primary">Destacado</span>
                            <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mt-1 line-clamp-2 group-hover:text-brand-primary transition">
                              {carouselTracks[carouselIndex].title}
                            </h2>
                            <p className="text-sm md:text-base text-text-secondary mt-2 truncate font-medium">
                              {carouselTracks[carouselIndex].artist}
                            </p>
                          </div>
                          <div className="w-36 h-36 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0 group-hover:scale-105 transition duration-300">
                            <SafeImage src={carouselTracks[carouselIndex].thumbnail} className="w-full h-full object-cover" alt={carouselTracks[carouselIndex].title} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Left Arrow Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCarouselIndex(prev => (prev - 1 + carouselTracks.length) % carouselTracks.length);
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all opacity-0 group-hover/carousel:opacity-100 border border-white/5"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      {/* Right Arrow Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCarouselIndex(prev => (prev + 1) % carouselTracks.length);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all opacity-0 group-hover/carousel:opacity-100 border border-white/5"
                      >
                        <ChevronLeft className="w-5 h-5 rotate-180" />
                      </button>

                      {/* Indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
                        {carouselTracks.map((_: Track, i: number) => (
                          <span 
                            key={i} 
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === carouselIndex ? "bg-brand-primary w-3.5" : "bg-white/30"}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick picks section */}
                  {quickPicksTracks.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-text-primary border-l-4 border-brand-primary pl-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-primary" /> Quick picks
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quickPicksTracks.map((track) => (
                          <div 
                            key={track.id}
                            onClick={() => playTrack(track, quickPicksTracks)}
                            onContextMenu={(e) => openContextMenu(e, track.id)}
                            className="p-3 bg-surface-dark/30 hover:bg-surface-dark/70 rounded-xl transition border border-white/5 flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
<SafeImage trackId={track.id} src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shadow flex-shrink-0" alt={track.title} />
                              <div className="min-w-0 flex-1 ml-1">
                                <p className="font-semibold text-sm truncate text-white">{track.title}</p>
                                <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                playTrack(track, quickPicksTracks);
                              }}
                              className="p-2 bg-brand-primary rounded-full text-bg-dark opacity-0 group-hover:opacity-100 transition shadow hover:scale-105"
                            >
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row: Tus Playlists */}
                  {playlists.length > 0 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="text-lg font-bold text-text-primary border-l-4 border-brand-primary pl-2 flex items-center gap-2">
                        <ListMusic className="w-4 h-4 text-brand-primary" /> {T("your_playlists")}
                      </h3>
                      <div className="relative group/section">
                        {/* Left arrow */}
                        <button
                          onClick={() => {
                            const el = sectionScrollRefs.current[1000];
                            if (el) el.scrollBy({ left: -440, behavior: "smooth" });
                          }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-surface-dark/90 border border-white/10 shadow-lg flex items-center justify-center text-white opacity-0 group-hover/section:opacity-100 transition-all hover:bg-brand-primary hover:border-brand-primary hover:text-bg-dark hover:scale-110"
                          aria-label="Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Scrollable container */}
                        <div
                          ref={(el) => { sectionScrollRefs.current[1000] = el; }}
                          className="flex gap-4 pb-2 overflow-x-auto"
                          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        >
                          {playlists.map((playlist) => {
                            const firstTrackThumb = playlist.tracks?.[0]?.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300";
                            return (
                              <div
                                key={playlist.id}
                                onClick={() => {
                                  setSelectedPlaylistId(playlist.id);
                                  navigateTo("playlists");
                                }}
                                onContextMenu={(e) => openPlaylistContextMenu(e, playlist)}
                                className="min-w-[200px] w-[200px] p-4 bg-surface-dark/40 hover:bg-surface-dark rounded-2xl transition border border-white/5 flex flex-col justify-between group relative cursor-pointer"
                              >
                                <div>
                                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black/20 shadow-md">
                                    <SafeImage src={firstTrackThumb} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <Play className="w-8 h-8 text-brand-primary fill-current" />
                                    </div>
                                  </div>
                                  <h4 className="font-semibold text-sm truncate text-white">{playlist.name}</h4>
                                  <p className="text-xs text-text-secondary truncate mt-0.5">{playlist.tracks?.length || 0} {T("tab_local").toLowerCase() === "local" ? "canciones" : "songs"}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Right arrow */}
                        <button
                          onClick={() => {
                            const el = sectionScrollRefs.current[1000];
                            if (el) el.scrollBy({ left: 440, behavior: "smooth" });
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-surface-dark/90 border border-white/10 shadow-lg flex items-center justify-center text-white opacity-0 group-hover/section:opacity-100 transition-all hover:bg-brand-primary hover:border-brand-primary hover:text-bg-dark hover:scale-110"
                          aria-label="Siguiente"
                        >
                          <ChevronLeft className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Row: Artistas que escuchas */}
                  {topArtists.filter(a => !hiddenArtists.includes(a.artistName)).length > 0 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="text-lg font-bold text-text-primary border-l-4 border-brand-primary pl-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-brand-primary" /> {T("artists_you_listen_to")}
                      </h3>
                      <div className="relative group/section">
                        {/* Left arrow */}
                        <button
                          onClick={() => {
                            const el = sectionScrollRefs.current[1001];
                            if (el) el.scrollBy({ left: -440, behavior: "smooth" });
                          }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-surface-dark/90 border border-white/10 shadow-lg flex items-center justify-center text-white opacity-0 group-hover/section:opacity-100 transition-all hover:bg-brand-primary hover:border-brand-primary hover:text-bg-dark hover:scale-110"
                          aria-label="Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Scrollable container */}
                        <div
                          ref={(el) => { sectionScrollRefs.current[1001] = el; }}
                          className="flex gap-6 pb-2 overflow-x-auto items-center"
                          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        >
                          {topArtists.filter(a => !hiddenArtists.includes(a.artistName)).map((artist) => (
                            <div
                              key={artist.artistName}
                              onClick={() => {
                                if (artist.artistId) {
                                  loadArtistProfile(artist.artistId);
                                } else {
                                  setQuery(artist.artistName);
                                  navigateTo("buscar");
                                  invoke<string>("buscar_cancion", { query: artist.artistName }).then((res) => {
                                    const parsed = JSON.parse(res);
                                    const items = Array.isArray(parsed) ? parsed : (parsed.results || parsed.tracks || []);
                                    const match = items.find((item: any) => item.type === "artist" || item.type?.toLowerCase().includes("artist"));
                                    if (match && (match.id || match.browseId)) {
                                      loadArtistProfile(match.id || match.browseId);
                                    }
                                  });
                                }
                              }}
                              onContextMenu={(e) => { e.preventDefault(); setContextMenuArtist(artist); }}
                              className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0 animate-fade-in"
                            >
                              <div className="w-24 h-24 rounded-full overflow-hidden object-cover border-2 border-white/10 group-hover:border-brand-primary group-hover:scale-105 transition-all duration-300 relative bg-black/20 shadow-lg">
                                <SafeImage src={artist.thumbnail || ""} alt={artist.artistName} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-xs font-semibold text-text-primary group-hover:text-brand-primary transition truncate w-24 text-center">
                                {artist.artistName}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Right arrow */}
                        <button
                          onClick={() => {
                            const el = sectionScrollRefs.current[1001];
                            if (el) el.scrollBy({ left: 440, behavior: "smooth" });
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-surface-dark/90 border border-white/10 shadow-lg flex items-center justify-center text-white opacity-0 group-hover/section:opacity-100 transition-all hover:bg-brand-primary hover:border-brand-primary hover:text-bg-dark hover:scale-110"
                          aria-label="Siguiente"
                        >
                          <ChevronLeft className="w-4 h-4 rotate-180" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remaining sections - Netflix-style arrow navigation */}
                  {homeSections.map((section, idx) => (
                  <div key={idx} className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-bold text-text-primary border-l-4 border-brand-primary pl-2 flex items-center gap-2">
                      {getSectionIcon(section.title)} {section.title}
                    </h3>
                    <div className="relative group/section">
                      {/* Left arrow */}
                      <button
                        onClick={() => {
                          const el = sectionScrollRefs.current[idx];
                          if (el) el.scrollBy({ left: -440, behavior: "smooth" });
                        }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-surface-dark/90 border border-white/10 shadow-lg flex items-center justify-center text-white opacity-0 group-hover/section:opacity-100 transition-all hover:bg-brand-primary hover:border-brand-primary hover:text-bg-dark hover:scale-110"
                        aria-label="Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Scrollable container (hidden scrollbar) */}
                      <div
                        ref={(el) => { sectionScrollRefs.current[idx] = el; }}
                        className="flex gap-4 pb-2 overflow-x-auto"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                      >
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
                                  <SafeImage trackId={track.id} src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <button 
                                      onClick={() => {
                                        if (currentTrack?.id === track.id) {
                                          togglePlay();
                                        } else {
                                          playTrack(track, section.items.map(convertYTItemToTrack));
                                        }
                                      }}
                                      className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow hover:scale-105 transition"
                                    >
                                      {currentTrack?.id === track.id && isPlaying ? (
                                        <Pause className="w-4 h-4 fill-current animate-fade-in" />
                                      ) : (
                                        <Play className="w-4 h-4 fill-current ml-0.5 animate-fade-in" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <h4 className="font-semibold text-sm truncate">{track.title}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                  <p 
                                    onClick={() => item.artists?.[0]?.id && loadArtistProfile(item.artists[0].id)} 
                                    className="text-xs text-text-secondary truncate cursor-pointer hover:underline"
                                  >
                                    {track.artist}
                                  </p>
                                  {downloads[track.id] && (
                                    <span className="flex-shrink-0 text-brand-primary" title="Descargado localmente">
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v8M12 15l-3-3M12 15l3-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" className="text-bg-dark"/></svg>
                                    </span>
                                  )}
                                </div>
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

                      {/* Right arrow */}
                      <button
                        onClick={() => {
                          const el = sectionScrollRefs.current[idx];
                          if (el) el.scrollBy({ left: 440, behavior: "smooth" });
                        }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-surface-dark/90 border border-white/10 shadow-lg flex items-center justify-center text-white opacity-0 group-hover/section:opacity-100 transition-all hover:bg-brand-primary hover:border-brand-primary hover:text-bg-dark hover:scale-110"
                        aria-label="Siguiente"
                      >
                        <ChevronLeft className="w-4 h-4 rotate-180" />
                      </button>
                    </div>
                  </div>
                  ))}
                </>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  {[1, 2].map((rowIdx) => (
                    <div key={rowIdx} className="space-y-4">
                      <div className="h-6 w-48 rounded bg-white/5 skeleton-shimmer" />
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((cardIdx) => (
                          <SkeletonCard key={cardIdx} />
                        ))}
                      </div>
                    </div>
                  ))}
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
                      <SafeImage src={artistCardData.banner} className="w-full h-full object-cover" alt="" />
                    </div>
                  )}
                  <SafeImage src={artistCardData.thumbnail} alt={artistCardData.name} className="relative z-10 w-20 h-20 rounded-full object-cover border-2 border-white/10 shadow-lg group-hover:scale-105 transition flex-shrink-0" />
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
                            <SafeImage trackId={track.id} src={track.thumbnail} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <button 
                                onClick={() => {
                                  if (currentTrack?.id === track.id) {
                                    togglePlay();
                                  } else {
                                    playTrack(track, tracks);
                                  }
                                }}
                                className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow-lg hover:scale-105 transition"
                              >
                                {currentTrack?.id === track.id && isPlaying ? (
                                  <Pause className="w-5 h-5 fill-current" />
                                ) : (
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                )}
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
                          <p className="text-xs text-black dark:text-neutral-300 font-semibold truncate mt-0.5">{track.artist}</p>
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
                        <SafeImage trackId={track.id} src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shadow-md flex-shrink-0" alt={track.title} />
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-sm truncate ${currentTrack?.id === track.id ? "text-brand-primary" : "text-text-primary"}`}>{track.title}</p>
                          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                            <p className="text-xs text-black dark:text-neutral-300 font-semibold truncate">{track.artist}</p>
                            {downloads[track.id] && (
                              <span className="flex-shrink-0 text-brand-primary" title="Descargado localmente">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v8M12 15l-3-3M12 15l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" className="text-bg-dark"/></svg>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-text-secondary hidden md:block w-1/4 truncate">
                          {track.album || "Sencillo"}
                        </div>
                        <span className="text-xs text-text-secondary hidden sm:block w-16 text-right mr-2">{formatTime(track.duration)}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (currentTrack?.id === track.id) {
                                togglePlay();
                              } else {
                                playTrack(track, tracks); 
                              }
                            }} 
                            className="p-2 bg-brand-primary text-bg-dark rounded-full opacity-0 group-hover:opacity-100 transition shadow hover:scale-105"
                          >
                            {currentTrack?.id === track.id && isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
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
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={goBack}
                  disabled={navIndex === 0}
                  className="p-2 bg-surface-dark border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:hover:border-white/10 rounded-full transition text-text-secondary hover:text-white"
                  title="Atrás"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goForward}
                  disabled={navIndex === navHistory.length - 1}
                  className="p-2 bg-surface-dark border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:hover:border-white/10 rounded-full transition text-text-secondary hover:text-white"
                  title="Adelante"
                >
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>
              {loadingArtist ? (
                <div className="space-y-8 animate-pulse">
                  {/* Banner Skeleton */}
                  <div className="relative rounded-3xl overflow-hidden h-64 bg-surface-dark/30 border border-white/5 flex items-end p-8">
                    <div className="absolute inset-0 skeleton-shimmer opacity-20" />
                    <div className="relative z-10 flex items-center gap-6 w-full">
                      <div className="w-24 h-24 rounded-full skeleton-shimmer flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-8 w-1/3 rounded bg-white/5 skeleton-shimmer" />
                        <div className="h-4 w-1/2 rounded bg-white/5 skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                  {/* Rows Skeleton */}
                  <div className="space-y-4">
                    <div className="h-6 w-36 rounded bg-white/5 skeleton-shimmer" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-3 bg-surface-dark/30 rounded-xl border border-white/5 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg skeleton-shimmer flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/3 rounded bg-white/5 skeleton-shimmer" />
                            <div className="h-3 w-1/2 rounded bg-white/5 skeleton-shimmer" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : artistData ? (
                <div className="space-y-8">
                  <div className="relative rounded-3xl overflow-hidden h-64 bg-surface-dark border border-white/5 flex items-end p-8">
                    {artistData.thumbnail && (
                      <>
                        <div className="absolute inset-0 z-0 opacity-50 filter blur-md scale-105">
                          <SafeImage src={artistData.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/60 to-transparent z-0" />
                      </>
                    )}
                    <div className="relative z-10 flex items-center gap-6">
                      {artistData.thumbnail && (
                        <SafeImage src={artistData.thumbnail} alt={artistData.name} className="w-24 h-24 rounded-full object-cover border-2 border-white/20 shadow-xl" />
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
                                    <SafeImage trackId={track.id} src={track.thumbnail} className="w-10 h-10 rounded-lg object-cover bg-black/40" alt={track.title} />
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
                                    loadAlbumProfile(
                                      item.playlistId || item.id || item.browseId,
                                      item.title,
                                      item.thumbnail,
                                      item.type || "album",
                                      artistData?.name
                                    );
                                  }}
                                  onContextMenu={(e) => openAlbumOrPlaylistContextMenu(e, item)}
                                  className="p-3 bg-surface-dark/30 hover:bg-surface-dark/70 rounded-xl transition border border-white/5 flex flex-col justify-between group cursor-pointer"
                                >
                                  <div className="aspect-square w-full rounded-lg overflow-hidden mb-2 relative bg-black/20">
                                    <SafeImage src={item.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition" alt={item.title} />
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
                  <button 
                    onClick={() => setLibTab("local")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      libTab === "local" ? "bg-brand-primary text-bg-dark" : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    Local
                  </button>
                  {libTab === "history" && history.length > 0 && (
                    <button
                      onClick={() => {
                        triggerConfirm(
                          "Vaciar Historial de Reproducción",
                          "¿Estás seguro de que quieres vaciar todo el historial de reproducción de Capi?",
                          () => {
                            setHistory([]);
                            localStorage.removeItem("capi_history");
                          }
                        );
                      }}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition hover:scale-105 active:scale-95 flex items-center justify-center relative group"
                      title="Vaciar historial"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="absolute bottom-full mb-2 hidden group-hover:block bg-black/80 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
                        Vaciar historial
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {selectedTrackIds.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl animate-fade-in">
                  <span className="text-sm font-semibold text-brand-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-primary text-bg-dark flex items-center justify-center text-xs font-bold">
                      {selectedTrackIds.size}
                    </span>
                    {selectedTrackIds.size === 1 ? "elemento seleccionado" : "elementos seleccionados"}
                  </span>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <polyline points="9 12 11 14 15 10"/>
                      </svg>
                      Seleccionar todo
                    </button>
                    {playlists.length > 0 && (
                      <div className="relative" ref={playlistDropdownRef}>
                        <button
                          onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-surface-dark/80 border border-white/10 rounded-xl text-xs font-medium text-text-primary hover:border-brand-primary/40 transition-all"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          Añadir a playlist
                          <svg className={`w-3 h-3 text-text-secondary transition-transform duration-200 ${showPlaylistDropdown ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        {showPlaylistDropdown && (
                          <div className="absolute top-full mt-1 right-0 min-w-[220px] bg-surface-dark border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50 animate-fade-in">
                            <div className="py-1">
                              <div className="px-3 py-1.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Añadir a playlist</div>
                              {playlists.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => { handleBatchAddToPlaylist(p.id); setShowPlaylistDropdown(false); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-primary hover:bg-white/5 transition text-left"
                                >
                                  <ListMusic className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                                  <span className="truncate">{p.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {libTab === "downloads" && (
                      <button 
                        onClick={handleBatchDelete}
                        className="px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition hover:scale-105 active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Borrar físicos
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedTrackIds(new Set())} 
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {libTab === "downloads" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                    <span className="text-xs font-semibold text-text-secondary">
                      {downloadedMetadata.length} canciones descargadas
                    </span>
                    {downloadedMetadata.length > 0 && (
                      <button 
                        onClick={() => invoke("abrir_carpeta_descargas")}
                        className="px-3.5 py-1.5 bg-brand-primary text-bg-dark rounded-xl text-xs font-bold hover:scale-105 transition flex items-center gap-1.5"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Abrir carpeta
                      </button>
                    )}
                  </div>
                  {downloadedMetadata.length > 0 ? (
                    <div className="flex flex-col gap-2 w-full">
                      {downloadedMetadata.map((track, idx) => (
                        <div 
                          key={track.id}
                          draggable={!showSelectionMode}
                          onDragStart={(e) => {
                            if (!showSelectionMode) {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', String(idx));
                              setDownloadDragIndex(idx);
                              downloadDragIndexRef.current = idx;
                            }
                          }}
                          onDragOver={(e) => {
                            if (!showSelectionMode) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              setDownloadDragOverIndex(idx);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const startIdx = downloadDragIndexRef.current;
                            if (showSelectionMode || startIdx === null || startIdx === idx) {
                              setDownloadDragIndex(null);
                              setDownloadDragOverIndex(null);
                              downloadDragIndexRef.current = null;
                              return;
                            }
                            const newMetadata = [...downloadedMetadata];
                            const [removed] = newMetadata.splice(startIdx, 1);
                            newMetadata.splice(idx, 0, removed);
                            setDownloadedMetadata(newMetadata);
                            localStorage.setItem("capi_downloaded_metadata", JSON.stringify(newMetadata));
                            setDownloadDragIndex(null);
                            setDownloadDragOverIndex(null);
                            downloadDragIndexRef.current = null;
                          }}
                          onDragEnd={() => {
                            setDownloadDragIndex(null);
                            setDownloadDragOverIndex(null);
                            downloadDragIndexRef.current = null;
                          }}
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
                          } ${!showSelectionMode && downloadDragIndex === idx ? "dragging-queue-item" : ""} ${!showSelectionMode && downloadDragOverIndex === idx ? "drag-over-queue-item" : ""}`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {!showSelectionMode && (
                              <GripVertical className="w-4 h-4 text-text-secondary/50 drag-handle flex-shrink-0" />
                            )}
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
                            <SafeImage trackId={track.id} src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shadow flex-shrink-0" alt={track.title} />
                            <div className="min-w-0 flex-1 ml-1">
                              <p className="font-semibold text-sm truncate text-text-primary">{track.title}</p>
                              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                                <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                                {downloads[track.id] && (
                                  <span className="flex-shrink-0 text-brand-primary" title="Descargado localmente">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v8M12 15l-3-3M12 15l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" className="text-bg-dark"/></svg>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {!showSelectionMode && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (currentTrack?.id === track.id) {
                                    togglePlay();
                                  } else {
                                    playTrack(track, downloadedMetadata); 
                                  }
                                }} 
                                className="p-2 bg-brand-primary text-bg-dark rounded-full shadow hover:scale-105 transition"
                              >
                                {currentTrack?.id === track.id && isPlaying ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                )}
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
                            <SafeImage trackId={track.id} src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shadow flex-shrink-0" alt={track.title} />
                            <div className="min-w-0 flex-1 ml-1">
                              <p className="font-semibold text-sm truncate text-text-primary">{track.title}</p>
                              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                                <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                                {downloads[track.id] && (
                                  <span className="flex-shrink-0 text-brand-primary" title="Descargado localmente">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v8M12 15l-3-3M12 15l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" className="text-bg-dark"/></svg>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {!showSelectionMode && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (currentTrack?.id === track.id) {
                                    togglePlay();
                                  } else {
                                    playTrack(track, history); 
                                  }
                                }} 
                                className="p-2 bg-brand-primary text-bg-dark rounded-full shadow hover:scale-105 transition"
                              >
                                {currentTrack?.id === track.id && isPlaying ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                )}
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

              {libTab === "local" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-dark/40 border border-white/5 p-5 rounded-2xl">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm text-text-primary">Música Local</h3>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {localFolder ? `Carpeta activa: ${localFolder}` : "Selecciona una carpeta del sistema para reproducir tus archivos locales en Capi."}
                      </p>
                    </div>
                    <button
                      onClick={selectLocalFolder}
                      className="px-4 py-2 bg-brand-primary text-bg-dark text-xs font-bold rounded-xl hover:scale-105 active:scale-95 transition whitespace-nowrap"
                    >
                      {localFolder ? "Cambiar Carpeta" : "Seleccionar Carpeta"}
                    </button>
                  </div>

                  {localLoading ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto" />
                      <p className="text-xs text-text-secondary mt-3">Escaneando archivos de audio...</p>
                    </div>
                  ) : localTracks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs text-text-secondary font-semibold">{localTracks.length} archivos de audio encontrados</span>
                        <button
                          onClick={() => playShuffleQueue(localTracks)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          Reproducir aleatorio
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 w-full">
                        {localTracks.map((track) => (
                          <div
                            key={track.id}
                            onContextMenu={(e) => openContextMenu(e, track.id)}
                            onClick={() => {
                              if (showSelectionMode) {
                                handleSelectTrack(track.id);
                              } else {
                                playTrack(track, localTracks);
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
                              <SafeImage trackId={track.id} src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shadow flex-shrink-0" alt={track.title} />
                              <div className="min-w-0 flex-1 ml-1">
                                <p className="font-semibold text-sm truncate text-text-primary">{track.title}</p>
                                <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    localFolder && (
                      <div className="p-12 text-center bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-sm text-text-secondary">No se encontraron archivos de audio compatibles (.mp3, .wav, .m4a, .ogg, .flac, .aac) en esta carpeta.</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* PLAYLISTS VIEW */}
          {activeTab === "playlists" && (
            <div className="space-y-6">
              {!selectedPlaylistId && (
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Mis Listas de Reproducción</h2>
                    <p className="text-sm text-text-secondary">Organiza tus colecciones musicales.</p>
                  </div>
                  <button
                    onClick={() => setShowImportPlaylistModal(true)}
                    className="p-2.5 bg-surface-dark/40 hover:bg-surface-dark/80 border border-white/10 hover:border-brand-primary/40 rounded-xl transition group cursor-pointer"
                    title="Importar playlist desde URL"
                  >
                    <svg className="w-5 h-5 text-text-secondary group-hover:text-brand-primary transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </button>
                </div>
              )}

              {selectedPlaylistId ? (
                <div className="space-y-6 animate-fade-in">
                  {(() => {
                    const playlist = playlists.find(p => p.id === selectedPlaylistId);
                    if (!playlist) return null;
                    return (
                      <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Left Panel: Playlist Info & Cover (sticky) */}
                        <div className="w-full lg:w-auto flex-shrink-0 lg:sticky lg:top-0 flex flex-col items-center gap-4 bg-surface-dark/20 p-6 rounded-2xl border border-white/5 shadow-xl">
                          <div className="flex items-center gap-2 self-start">
                            <button
                              onClick={() => setSelectedPlaylistId(null)}
                              className="p-2 bg-surface-dark border border-white/10 hover:border-white/20 rounded-full transition text-text-secondary hover:text-white cursor-pointer"
                              title="Volver a todas"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={goForward}
                              disabled={navIndex === navHistory.length - 1}
                              className="p-2 bg-surface-dark border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:hover:border-white/10 rounded-full transition text-text-secondary hover:text-white cursor-pointer"
                              title="Adelante"
                            >
                              <ChevronLeft className="w-5 h-5 rotate-180" />
                            </button>
                          </div>
                          <div className="w-44 h-44 lg:w-56 lg:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-surface-dark flex items-center justify-center relative self-center">
                            {playlist.tracks.length > 0 ? (
                              <SafeImage src={playlist.tracks[0].thumbnail} alt={playlist.name} className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-20 h-20 text-text-secondary" />
                            )}
                          </div>
                          <div className="w-full min-w-0 self-start text-center lg:text-left">
                            <p className="text-xs text-brand-primary uppercase font-bold tracking-wider mb-1">
                              Lista Personal
                            </p>
                            <h3 className="text-2xl font-extrabold tracking-tight mb-2 text-white break-words">{playlist.name}</h3>
                            <p className="text-xs text-text-secondary mt-1">{playlist.tracks.length} canciones</p>
                            
                            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mt-5 w-full">
                              {playlist.tracks.length > 0 && (
                                <>
                                  <button 
                                    onClick={() => playTrack(playlist.tracks[0], playlist.tracks)}
                                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-brand-primary text-bg-dark rounded-xl font-bold text-xs hover:scale-105 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Play className="w-4 h-4 fill-current" /> Reproducir
                                  </button>
                                  <button 
                                    onClick={() => playShuffleQueue(playlist.tracks)}
                                    className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl hover:scale-105 transition cursor-pointer group relative"
                                    title="Aleatorio"
                                  >
                                    <Shuffle className="w-4 h-4" />
                                    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-surface-dark px-2 py-0.5 rounded-md border border-white/10 shadow-lg pointer-events-none">
                                      Aleatorio
                                    </span>
                                  </button>
                                  <button 
                                    onClick={() => downloadAllTracks(playlist.tracks)}
                                    className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl hover:scale-105 transition cursor-pointer group relative"
                                    title="Descargar todo"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-surface-dark px-2 py-0.5 rounded-md border border-white/10 shadow-lg pointer-events-none">
                                      Descargar todo
                                    </span>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => deletePlaylist(playlist.id)}
                                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl hover:scale-105 transition cursor-pointer group relative"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-surface-dark px-2 py-0.5 rounded-md border border-white/10 shadow-lg pointer-events-none">
                                  Eliminar Lista
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right Panel: Tracks list */}
                        <div className="flex-1 min-w-0 w-full">
                          {playlist.tracks.length > 0 ? (
                            <div className="flex flex-col gap-2 w-full">
                              {playlist.tracks.map((track, idx) => (
                                <div 
                                  key={track.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', String(idx));
                                    playlistDragRef.current = idx;
                                    setPlaylistDragIndex(idx);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    setPlaylistDragOverIndex(idx);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const startIdx = playlistDragRef.current;
                                    if (startIdx === null || startIdx === idx) {
                                      setPlaylistDragIndex(null);
                                      setPlaylistDragOverIndex(null);
                                      playlistDragRef.current = null;
                                      return;
                                    }
                                    const currentPlaylist = playlists.find(p => p.id === selectedPlaylistId);
                                    if (!currentPlaylist) return;
                                    const newTracks = [...currentPlaylist.tracks];
                                    const [removed] = newTracks.splice(startIdx, 1);
                                    newTracks.splice(idx, 0, removed);
                                    setPlaylists(prev => prev.map(p =>
                                      p.id === selectedPlaylistId ? { ...p, tracks: newTracks } : p
                                    ));
                                    setPlaylistDragIndex(null);
                                    setPlaylistDragOverIndex(null);
                                    playlistDragRef.current = null;
                                  }}
                                  onDragEnd={() => {
                                    setPlaylistDragIndex(null);
                                    setPlaylistDragOverIndex(null);
                                    playlistDragRef.current = null;
                                  }}
                                  onContextMenu={(e) => openContextMenu(e, track.id)}
                                  onClick={() => {
                                    if (currentTrack?.id === track.id) {
                                      setIsPlayerExpanded(true);
                                    } else {
                                      playTrack(track, playlist.tracks);
                                    }
                                  }}
                                  className={`flex items-center gap-4 p-3 rounded-xl transition duration-200 bg-surface-dark/30 hover:bg-surface-dark/70 border cursor-pointer group ${
                                    currentTrack?.id === track.id ? "bg-brand-primary/10 border-brand-primary/20" : "border-white/5"
                                  } ${playlistDragIndex === idx ? "dragging-queue-item" : ""} ${playlistDragOverIndex === idx ? "drag-over-queue-item" : ""}`}
                                >
                                  <GripVertical className="w-4 h-4 text-text-secondary/30 drag-handle flex-shrink-0 cursor-grab" />
                                  <span className="text-xs text-text-secondary w-5 text-right font-medium">{idx + 1}</span>
<SafeImage trackId={track.id} src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shadow-md flex-shrink-0" alt={track.title} />
                                  <div className="min-w-0 flex-1">
                                    <p className={`font-semibold text-sm truncate ${currentTrack?.id === track.id ? "text-brand-primary" : "text-text-primary"}`}>{track.title}</p>
                                    <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                                      <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                                      {downloads[track.id] && (
                                        <span className="flex-shrink-0 text-brand-primary" title="Descargado localmente">
                                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v8M12 15l-3-3M12 15l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" className="text-bg-dark"/></svg>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-xs text-text-secondary hidden sm:block w-16 text-right mr-2">{formatTime(track.duration)}</span>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (currentTrack?.id === track.id) {
                                          togglePlay();
                                        } else {
                                          playTrack(track, playlist.tracks);
                                        }
                                      }} 
                                      className="p-2 bg-brand-primary text-bg-dark rounded-full opacity-0 group-hover:opacity-100 transition shadow hover:scale-105"
                                    >
                                      {currentTrack?.id === track.id && isPlaying ? (
                                        <Pause className="w-3.5 h-3.5 fill-current" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      )}
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); removeTrackFromPlaylist(track.id, playlist.id); }} 
                                      className="p-2 text-text-secondary hover:text-red-400 transition rounded-lg"
                                      title="Quitar de la lista"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-12 text-center bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-sm text-text-secondary">No hay canciones en esta lista de reproducción.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                  {/* Create Playlist dashed button card */}
                  <div 
                    onClick={() => setShowCreatePlaylistModal(true)}
                    className="p-5 rounded-2xl bg-surface-dark/20 hover:bg-surface-dark/40 border border-dashed border-white/20 hover:border-brand-primary/40 shadow-xl cursor-pointer transition flex flex-col items-center justify-center text-center gap-3 group"
                  >
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
                      <Plus className="w-8 h-8 text-brand-primary/60 group-hover:scale-110 group-hover:text-brand-primary transition duration-200" />
                    </div>
                    <div className="w-full min-w-0">
                      <p className="text-[10px] text-brand-primary uppercase font-bold tracking-wider">Nueva</p>
                      <h3 className="font-bold text-sm truncate mt-0.5 text-text-secondary group-hover:text-text-primary transition">Crear Lista</h3>
                    </div>
                  </div>

                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                      onContextMenu={(e) => openPlaylistContextMenu(e, playlist)}
                      className="p-5 rounded-2xl bg-surface-dark/20 hover:bg-surface-dark/40 border border-white/5 hover:border-white/10 shadow-xl cursor-pointer transition flex flex-col items-center text-center gap-3 group"
                    >
                      <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-surface-dark flex items-center justify-center flex-shrink-0">
                        {playlist.tracks.length > 0 ? (
                          <SafeImage src={playlist.tracks[0].thumbnail} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-8 h-8 text-text-secondary" />
                        )}
                      </div>
                      <div className="w-full min-w-0">
                        <p className="text-[10px] text-brand-primary uppercase font-bold tracking-wider">Lista Personal</p>
                        <h3 className="font-bold text-sm truncate mt-0.5 text-white">{playlist.name}</h3>
                        <p className="text-[10px] text-text-secondary mt-0.5">{playlist.tracks.length} canciones</p>
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
                <div className="flex flex-col gap-2 w-full animate-fade-in">
                  {favorites.map((track, idx) => (
                    <div 
                      key={track.id}
                      onContextMenu={(e) => openContextMenu(e, track.id)}
                      onClick={() => playTrack(track, favorites)}
                      className={`p-3.5 bg-surface-dark/30 hover:bg-surface-dark/70 rounded-xl flex items-center justify-between border border-white/5 w-full transition duration-150 cursor-pointer ${
                        currentTrack?.id === track.id ? "bg-brand-primary/10 border-brand-primary/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs text-text-secondary w-5 text-right font-medium">{idx + 1}</span>
                        <SafeImage trackId={track.id} src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shadow flex-shrink-0" alt={track.title} />
                        <div className="min-w-0 flex-1 ml-1">
                          <p className={`font-semibold text-sm truncate ${currentTrack?.id === track.id ? "text-brand-primary" : "text-text-primary"}`}>{track.title}</p>
                          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                            <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                            {downloads[track.id] && (
                              <span className="flex-shrink-0 text-brand-primary" title="Descargado localmente">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v8M12 15l-3-3M12 15l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" className="text-bg-dark"/></svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (currentTrack?.id === track.id) {
                              togglePlay();
                            } else {
                              playTrack(track, favorites); 
                            }
                          }} 
                          className="p-2 bg-brand-primary text-bg-dark rounded-full shadow hover:scale-105 transition"
                        >
                          {currentTrack?.id === track.id && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(track); }} 
                          className="p-2 text-brand-primary rounded-lg hover:bg-white/5 transition"
                        >
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

          {/* DEDICATED ALBUM/PLAYLIST VIEW */}
          {activeTab === "album_view" && currentAlbum && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => { goBack(); }}
                  disabled={navIndex === 0}
                  className="p-2 bg-surface-dark border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:hover:border-white/10 rounded-full transition text-text-secondary hover:text-white"
                  title="Volver"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goForward}
                  disabled={navIndex === navHistory.length - 1}
                  className="p-2 bg-surface-dark border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:hover:border-white/10 rounded-full transition text-text-secondary hover:text-white"
                  title="Adelante"
                >
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Left Panel: Cover & Info */}
                <div className="w-full lg:w-auto flex-shrink-0 lg:sticky lg:top-0 flex flex-col items-center lg:items-start text-center lg:text-left gap-4 bg-surface-dark/20 p-6 rounded-2xl border border-white/5 shadow-xl">
                  <SafeImage src={currentAlbum.thumbnail} alt={currentAlbum.title} className="w-44 h-44 lg:w-56 lg:h-56 rounded-2xl object-cover shadow-2xl border border-white/10" />
                  <div className="w-full min-w-0">
                    <p className="text-xs text-brand-primary uppercase font-bold tracking-wider mb-1">
                      {currentAlbum.type === "album" ? "Álbum" : "Lista de Reproducción"}
                    </p>
                    <h2 className="text-2xl font-extrabold tracking-tight mb-2 text-white break-words">{currentAlbum.title}</h2>
                    {currentAlbum.artist && (
                      <p className="text-sm text-text-secondary">De <span className="text-white font-semibold">{currentAlbum.artist}</span></p>
                    )}
                    <p className="text-xs text-text-secondary mt-1">{currentAlbumTracks.length} canciones</p>
                    
                    <div className="flex flex-wrap gap-2 justify-center lg:justify-start mt-5 w-full">
                      {currentAlbumTracks.length > 0 && (
                        <>
                          <button 
                            onClick={() => playTrack(currentAlbumTracks[0], currentAlbumTracks)}
                            className="flex-1 min-w-[120px] px-4 py-2.5 bg-brand-primary text-bg-dark rounded-xl font-bold text-xs hover:scale-105 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-current" /> Reproducir
                          </button>
                          <button 
                            onClick={() => playShuffleQueue(currentAlbumTracks)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl hover:scale-105 transition cursor-pointer group relative"
                            title="Aleatorio"
                          >
                            <Shuffle className="w-4 h-4" />
                            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-surface-dark px-2 py-0.5 rounded-md border border-white/10 shadow-lg pointer-events-none">
                              Aleatorio
                            </span>
                          </button>
                          <button 
                            onClick={() => downloadAllTracks(currentAlbumTracks)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl hover:scale-105 transition cursor-pointer group relative"
                            title="Descargar todo"
                          >
                            <Download className="w-4 h-4" />
                            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-surface-dark px-2 py-0.5 rounded-md border border-white/10 shadow-lg pointer-events-none">
                              Descargar todo
                            </span>
                          </button>
                          <button 
                            onClick={(e) => openAlbumOrPlaylistContextMenu(e, currentAlbum)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl hover:scale-105 transition flex items-center justify-center cursor-pointer group relative"
                            title="Más opciones"
                          >
                            <MoreVertical className="w-4 h-4" />
                            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-surface-dark px-2 py-0.5 rounded-md border border-white/10 shadow-lg pointer-events-none">
                              Más opciones
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel: Tracks list */}
                <div className="flex-1 min-w-0 max-w-3xl w-full">
                  {currentAlbumTracks.length > 0 ? (
                    <div className="flex flex-col gap-2 w-full">
                      {currentAlbumTracks.map((track, idx) => (
                        <div
                          key={track.id}
                          onContextMenu={(e) => openContextMenu(e, track.id)}
                          className={`flex items-center gap-4 p-3 rounded-xl transition duration-200 bg-surface-dark/30 hover:bg-surface-dark/70 border border-white/5 cursor-pointer group ${
                            currentTrack?.id === track.id ? "bg-brand-primary/10 border-brand-primary/20" : "border-transparent"
                          }`}
                          onClick={() => {
                            if (currentTrack?.id === track.id) {
                              setIsPlayerExpanded(true);
                            } else {
                              playTrack(track, currentAlbumTracks);
                            }
                          }}
                        >
                          <span className="text-xs text-text-secondary w-5 text-right font-medium">{idx + 1}</span>
                          <SafeImage trackId={track.id} src={track.thumbnail} className="w-11 h-11 rounded-lg object-cover shadow-md flex-shrink-0" alt={track.title} />
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold text-sm truncate ${currentTrack?.id === track.id ? "text-brand-primary" : "text-text-primary"}`}>{track.title}</p>
                            <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                              <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                              {downloads[track.id] && (
                                <span className="flex-shrink-0 text-brand-primary" title="Descargado localmente">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v8M12 15l-3-3M12 15l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" className="text-bg-dark"/></svg>
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-text-secondary hidden sm:block w-16 text-right mr-2">{formatTime(track.duration)}</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (currentTrack?.id === track.id) {
                                  togglePlay();
                                } else {
                                  playTrack(track, currentAlbumTracks);
                                }
                              }} 
                              className="p-2 bg-brand-primary text-bg-dark rounded-full opacity-0 group-hover:opacity-100 transition shadow hover:scale-105"
                            >
                              {currentTrack?.id === track.id && isPlaying ? (
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              )}
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
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <SkeletonRow key={i} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STATISTICS / WRAPPED VIEW */}
          {activeTab === "stats" && (
            <div className="space-y-6 w-full animate-fade-in text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">Estadísticas</h2>
                  <p className="text-sm text-text-secondary">Tu actividad musical en Capi</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const saved = localStorage.getItem("capi_listening_stats");
                      if (saved) {
                        setListeningStats(JSON.parse(saved));
                      }
                      showToast("Estadísticas actualizadas");
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary rounded-xl transition duration-150 hover:scale-105 active:scale-95 flex items-center justify-center relative group border border-white/5"
                    title="Actualizar estadísticas"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="absolute bottom-full mb-2 hidden group-hover:block bg-black/80 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
                      Actualizar estadísticas
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      triggerConfirm(
                        "Reiniciar Estadísticas",
                        "¿Estás seguro de que quieres borrar de forma permanente todas tus estadísticas de escucha?",
                        () => resetStats(),
                        true,
                        "¡ÚLTIMA ADVERTENCIA! Se eliminará toda tu actividad histórica de reproducción. ¿Confirmas el borrado definitivo?"
                      );
                    }}
                    className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition duration-150 hover:scale-105 active:scale-95 flex items-center justify-center relative group"
                    title="Reiniciar estadísticas"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="absolute bottom-full mb-2 hidden group-hover:block bg-black/80 text-white text-[10px] rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
                      Reiniciar estadísticas
                    </span>
                  </button>
                </div>
              </div>

              {/* Summary Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 border border-brand-primary/20 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-black text-brand-primary">{listeningStats.totalMinutes.toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary mt-1 font-bold">Minutos escuchados</p>
                </div>
                <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-black text-text-primary">{Object.keys(listeningStats.trackPlays).length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary mt-1 font-bold">Canciones únicas</p>
                </div>
                <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-black text-text-primary">{Object.keys(listeningStats.artistMinutes).length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary mt-1 font-bold">Artistas</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-black text-amber-400">{getStreakDays()}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary mt-1 font-bold">Días seguidos</p>
                </div>
              </div>

              {/* Weekly Activity */}
              <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs uppercase font-bold tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-primary" /> Actividad semanal
                </h3>
                <div className="flex items-end justify-between gap-2 h-32">
                  {getWeeklyActivity().map((day, i) => {
                    const maxMin = Math.max(...getWeeklyActivity().map(d => d.minutes), 1);
                    const height = (day.minutes / maxMin) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-[10px] text-text-secondary font-semibold">{day.minutes}m</span>
                        <div className="w-full rounded-t-lg bg-white/5 relative overflow-hidden" style={{ height: '100px' }}>
                          <div
                            className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-brand-primary to-brand-primary/60 transition-all duration-500"
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-text-secondary">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top 5 Tracks */}
                <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-brand-primary" /> Top canciones
                  </h3>
                  <div className="space-y-3">
                    {getTopTracks().length === 0 ? (
                      <p className="text-sm text-text-secondary text-center py-6">Escucha música para ver estadísticas</p>
                    ) : (
                      getTopTracks().map((item, i) => (
                        <div key={item.track.id} className="flex items-center gap-3">
                          <span className="text-xs font-black text-brand-primary w-5 text-center flex-shrink-0">{i + 1}</span>
                          <SafeImage trackId={item.track.id} src={item.track.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{item.track.title}</p>
                            <p className="text-xs text-text-secondary truncate">{item.track.artist}</p>
                          </div>
                          <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-full flex-shrink-0">{item.plays}×</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Top 5 Artists */}
                <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-primary" /> Top artistas
                  </h3>
                  <div className="space-y-3">
                    {getTopArtists().length === 0 ? (
                      <p className="text-sm text-text-secondary text-center py-6">Escucha música para ver estadísticas</p>
                    ) : (
                      getTopArtists().map((artist, i) => {
                        const maxArtMin = Math.max(...getTopArtists().map(a => a.minutes), 1);
                        // Scale the percentage so the top artist only fills up to 75%
                        const percentage = (artist.minutes / maxArtMin) * 75;
                        return (
                          <div key={artist.name} className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-xs font-black text-brand-primary w-5 text-center flex-shrink-0">{i + 1}</span>
                                <span className="text-sm font-semibold text-text-primary truncate">{artist.name}</span>
                              </div>
                              <span className="text-xs text-text-secondary font-medium flex-shrink-0">{artist.minutes} min</span>
                            </div>
                            <div className="pl-7 w-full">
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-brand-primary to-brand-tertiary rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Additional KPI metrics */}
              <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs uppercase font-bold tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-primary" /> Indicadores adicionales
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Artista Preferido</span>
                    <span className="text-sm font-semibold text-text-primary mt-1 truncate">{getTopArtists().length > 0 ? getTopArtists()[0].name : "Ninguno"}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Canción Preferida</span>
                    <span className="text-sm font-semibold text-text-primary mt-1 truncate">{getTopTracks().length > 0 ? getTopTracks()[0].track.title : "Ninguna"}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Horas Escuchadas</span>
                    <span className="text-sm font-semibold text-text-primary mt-1">{(listeningStats.totalMinutes / 60).toFixed(1)} h</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONFIGURATION / SETTINGS VIEW */}
          {activeTab === "settings" && (
            <div className="animate-fade-in text-left h-full flex flex-col">
              <div className="mb-6 flex-shrink-0">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Configuración</h2>
                <p className="text-sm text-text-secondary">Personaliza el comportamiento y visualización de la aplicación.</p>
              </div>

              <div className="flex-1 grid grid-cols-[200px_1fr] gap-6 overflow-hidden min-h-0">
                {/* Left sidebar — category navigation */}
                <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-2 space-y-1 h-fit sticky top-0">
                  {[
                    { id: "apariencia", label: "Apariencia" },
                    { id: "reproduccion", label: "Reproducción" },
                    { id: "general", label: "General" },
                    { id: "datos", label: "Datos" },
                    { id: "acerca-de", label: "Acerca de" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSettingsCategory(cat.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                        settingsCategory === cat.id
                          ? "bg-brand-primary/20 text-brand-primary"
                          : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Right panel — category content */}
                <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 space-y-6 overflow-y-auto">
                  {/* === APARIENCIA === */}
                  {settingsCategory === "apariencia" && (
                    <>
                      {/* Language */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                            <Languages className="w-4 h-4 text-brand-primary" /> {T("select_language")}
                          </h3>
                          <p className="text-xs text-text-secondary mt-1">Elige el idioma de la interfaz.</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className="glass px-4 py-2 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2 hover:scale-105 active:scale-95 transition border border-white/10"
                          >
                            <span>{LOCALE_NAMES[locale]}</span>
                            <ChevronLeft className={`w-3 h-3 transition-transform duration-200 ${showLangDropdown ? "-rotate-90" : "rotate-180"}`} />
                          </button>
                          {showLangDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => { setShowLangDropdown(false); setLangSearchQuery(""); }} />
                              <div className="absolute right-0 mt-2 w-56 glass rounded-2xl p-2 shadow-2xl z-20 flex flex-col border border-white/10">
                                <div className="p-1">
                                  <input 
                                    type="text" 
                                    placeholder="Buscar idioma..." 
                                    value={langSearchQuery} 
                                    onChange={(e) => setLangSearchQuery(e.target.value)} 
                                    className="w-full px-2.5 py-1.5 text-xs bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-primary"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-0.5 mt-1 pr-0.5">
                                  {Object.entries(LOCALE_NAMES)
                                    .filter(([, name]) => name.toLowerCase().includes(langSearchQuery.toLowerCase()))
                                    .map(([code, name]) => (
                                      <button
                                        key={code}
                                        onClick={() => {
                                          setLocale(code as Locale);
                                          localStorage.setItem("capi_locale", code);
                                          setShowLangDropdown(false);
                                          setLangSearchQuery("");
                                          showToast(`Idioma: ${name}`);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between ${
                                          locale === code ? "bg-brand-primary text-bg-dark font-bold" : "text-text-primary hover:bg-white/5"
                                        }`}
                                      >
                                        <span>{name}</span>
                                        {locale === code && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                                      </button>
                                    ))}
                                  {Object.entries(LOCALE_NAMES).filter(([, name]) => name.toLowerCase().includes(langSearchQuery.toLowerCase())).length === 0 && (
                                    <div className="text-[10px] text-text-secondary text-center py-2">Sin resultados</div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Theme */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Tema Visual</h3>
                          <p className="text-xs text-text-secondary mt-1">Elige el tema de colores para la interfaz de Capi.</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                            className="glass px-4 py-2 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2 hover:scale-105 active:scale-95 transition border border-white/10"
                          >
                            {theme === "capi-default" && "Capi Default"}
                            {theme === "ultra-dark" && "Ultra Dark"}
                            {theme === "light-mode" && "Light Mode"}
                            {theme === "midnight-blue" && "Midnight Blue"}
                            {theme === "forest-green" && "Forest Green"}
                            <ChevronLeft className={`w-3 h-3 transition-transform duration-200 ${showThemeDropdown ? "-rotate-90" : "rotate-180"}`} />
                          </button>
                          {showThemeDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowThemeDropdown(false)} />
                              <div className="absolute right-0 mt-2 w-48 glass rounded-2xl p-1.5 shadow-2xl z-20 space-y-0.5 border border-white/10">
                                {[
                                  { id: "capi-default", name: "Capi Default" },
                                  { id: "ultra-dark", name: "Ultra Dark" },
                                  { id: "light-mode", name: "Light Mode" },
                                  { id: "midnight-blue", name: "Midnight Blue" },
                                  { id: "forest-green", name: "Forest Green" }
                                ].map((t) => (
                                  <button
                                    key={t.id}
                                    onClick={() => {
                                      setTheme(t.id);
                                      localStorage.setItem("capi_theme", t.id);
                                      setShowThemeDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between ${
                                      theme === t.id ? "bg-brand-primary text-bg-dark font-bold" : "text-text-primary hover:bg-white/5"
                                    }`}
                                  >
                                    <span>{t.name}</span>
                                    {theme === t.id && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Accent Color */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Color de Acento</h3>
                          <p className="text-xs text-text-secondary mt-1">Elige un color de acento personalizado para la interfaz.</p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setShowAccentDropdown(!showAccentDropdown)}
                            className="glass px-4 py-2 rounded-xl text-xs font-semibold text-text-primary flex items-center gap-2 hover:scale-105 active:scale-95 transition border border-white/10"
                          >
                            <span 
                              className="w-3.5 h-3.5 rounded-full inline-block border border-white/10"
                              style={{ backgroundColor: accentColor === "custom" ? (localStorage.getItem("capi_custom_accent_color") || "#7c3aed") : (theme === "light-mode" ? 
                                (ACCENT_COLORS.find(c => c.id === accentColor)?.light || ACCENT_COLORS[0].light) : 
                                (ACCENT_COLORS.find(c => c.id === accentColor)?.dark || ACCENT_COLORS[0].dark) 
                              )}}
                            />
                            <span>{accentColor === "custom" ? "Custom" : (ACCENT_COLORS.find(c => c.id === accentColor)?.name || "Púrpura")}</span>
                            <ChevronLeft className={`w-3 h-3 transition-transform duration-200 ${showAccentDropdown ? "-rotate-90" : "rotate-180"}`} />
                          </button>
                          {showAccentDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => { setShowAccentDropdown(false); setAccentSearchQuery(""); }} />
                              <div className="absolute right-0 mt-2 w-56 glass rounded-2xl p-2 shadow-2xl z-20 flex flex-col border border-white/10">
                                <div className="p-1">
                                  <input 
                                    type="text" 
                                    placeholder="Buscar color..." 
                                    value={accentSearchQuery} 
                                    onChange={(e) => setAccentSearchQuery(e.target.value)} 
                                    className="w-full px-2.5 py-1.5 text-xs bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-primary"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-0.5 mt-1 pr-0.5">
                                  {ACCENT_COLORS.filter(c => c.name.toLowerCase().includes(accentSearchQuery.toLowerCase())).map((c) => (
                                    <button
                                      key={c.id}
                                      onClick={() => {
                                        setAccentColor(c.id);
                                        localStorage.setItem("capi_accent_color", c.id);
                                        setShowAccentDropdown(false);
                                        setAccentSearchQuery("");
                                      }}
                                      className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center gap-3 ${
                                        accentColor === c.id ? "bg-brand-primary text-bg-dark font-bold" : "text-text-primary hover:bg-white/5"
                                      }`}
                                    >
                                      <span 
                                        className="w-3.5 h-3.5 rounded-full border border-white/10 flex-shrink-0"
                                        style={{ backgroundColor: theme === "light-mode" ? c.light : c.dark }}
                                      />
                                      <span className="flex-1">{c.name}</span>
                                      {accentColor === c.id && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                                    </button>
                                  ))}
                                  {ACCENT_COLORS.filter(c => c.name.toLowerCase().includes(accentSearchQuery.toLowerCase())).length === 0 && (
                                    <div className="text-[10px] text-text-secondary text-center py-2">Sin resultados</div>
                                  )}
                                </div>
                                <div className="border-t border-white/10 mt-1.5 pt-1.5">
                                  <button
                                    onClick={() => {
                                      colorInputRef.current?.click();
                                      setShowAccentDropdown(false);
                                      setAccentSearchQuery("");
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center gap-3 ${
                                      accentColor === "custom" ? "bg-brand-primary text-bg-dark font-bold" : "text-text-primary hover:bg-white/5"
                                    }`}
                                  >
                                    <span 
                                      className="w-3.5 h-3.5 rounded-full border border-white/10 flex-shrink-0 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500"
                                    />
                                    <span className="flex-1">Elegir Custom...</span>
                                    {accentColor === "custom" && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                          <input 
                            type="color" 
                            ref={colorInputRef} 
                            className="absolute opacity-0 pointer-events-none w-0 h-0" 
                            onChange={(e) => handleCustomColorChange(e.target.value)} 
                          />
                        </div>
                      </div>

                      {/* Dynamic Theme */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                            <Palette className="w-4 h-4 text-brand-primary" /> Tema dinámico
                          </h3>
                          <p className="text-xs text-text-secondary mt-1">Extrae los colores dominantes de la portada del álbum y los aplica como tema automáticamente.</p>
                          {dynamicThemeEnabled && extractedColors && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] text-text-secondary uppercase tracking-wider">Colores activos:</span>
                              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: extractedColors.primary }} />
                              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: extractedColors.secondary }} />
                              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: extractedColors.tertiary }} />
                            </div>
                          )}
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={dynamicThemeEnabled} 
                            onChange={(e) => {
                              const val = e.target.checked;
                              setDynamicThemeEnabled(val);
                              localStorage.setItem("capi_dynamic_theme", String(val));
                              if (!val) {
                                setExtractedColors(null);
                                const root = document.documentElement;
                                if (accentColor === "custom") {
                                  const customColor = localStorage.getItem("capi_custom_accent_color") || "#7c3aed";
                                  root.style.setProperty('--brand-primary', customColor);
                                  root.style.setProperty('--brand-secondary', customColor + "dd");
                                  root.style.setProperty('--brand-tertiary', customColor + "aa");
                                } else {
                                  const isLight = theme === "light-mode";
                                  const colorObj = ACCENT_COLORS.find(c => c.id === accentColor) || ACCENT_COLORS[0];
                                  root.style.setProperty('--brand-primary', isLight ? colorObj.light : colorObj.dark);
                                  root.style.setProperty('--brand-secondary', isLight ? colorObj.lightSec : colorObj.darkSec);
                                  root.style.setProperty('--brand-tertiary', isLight ? colorObj.lightTert : colorObj.darkTert);
                                }
                              } else if (currentTrack) {
                                extractColorsFromImage(getHighQualityThumbnail(currentTrack.thumbnail));
                              }
                            }}
                            className="sr-only peer" 
                          />
                          <div className="relative w-11 h-6 bg-neutral-300 dark:bg-white/10 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>
                    </>
                  )}

                  {/* === REPRODUCCIÓN === */}
                  {settingsCategory === "reproduccion" && (
                    <>
                      {/* Search View Mode */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Modo de búsqueda por defecto</h3>
                          <p className="text-xs text-text-secondary mt-1">Elige cómo se muestran los resultados al realizar una búsqueda.</p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-xl">
                          <button
                            onClick={() => {
                              setSearchViewMode("list");
                              localStorage.setItem("capi_default_search_view", "list");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              searchViewMode === "list" ? "bg-brand-primary text-bg-dark" : "text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            Lista
                          </button>
                          <button
                            onClick={() => {
                              setSearchViewMode("grid");
                              localStorage.setItem("capi_default_search_view", "grid");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              searchViewMode === "grid" ? "bg-brand-primary text-bg-dark" : "text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            Cuadrícula
                          </button>
                        </div>
                      </div>

                      {/* Discord RPC */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary flex items-center gap-2">
                            Discord Rich Presence
                            {discordEnabled && (
                              <span className={`inline-block w-2 h-2 rounded-full ${discordConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={discordConnected ? "Conectado a Discord" : "Buscando/Cargando Discord"} />
                            )}
                          </h3>
                          <p className="text-xs text-text-secondary mt-1">Muestra la canción que estás escuchando en tu estado de Discord en tiempo real.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={discordEnabled} 
                            onChange={(e) => {
                              setDiscordEnabled(e.target.checked);
                            }}
                            className="sr-only peer" 
                          />
                          <div className="relative w-11 h-6 bg-neutral-300 dark:bg-white/10 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>
                    </>
                  )}

                  {/* === GENERAL === */}
                  {settingsCategory === "general" && (
                    <>
                      {/* Hide sidebar settings */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Ocultar acceso directo de ajustes de la barra lateral</h3>
                          <p className="text-xs text-text-secondary mt-1">Oculta el botón de configuración de la barra lateral, manteniendo el del perfil visible.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!showSidebarSettings} 
                            onChange={(e) => {
                              const val = !e.target.checked;
                              setShowSidebarSettings(val);
                              localStorage.setItem("capi_show_sidebar_settings", String(val));
                            }}
                            className="sr-only peer" 
                          />
                          <div className="relative w-11 h-6 bg-neutral-300 dark:bg-white/10 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>

                      {/* Sidebar collapse default */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Colapsar barra lateral por defecto</h3>
                          <p className="text-xs text-text-secondary mt-1">Si está activado, la barra lateral iniciará minimizada al abrir la aplicación.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={(() => {
                              const savedDefault = localStorage.getItem("capi_default_sidebar_collapsed");
                              return savedDefault === "true";
                            })()} 
                            onChange={(e) => {
                              const val = e.target.checked;
                              localStorage.setItem("capi_default_sidebar_collapsed", String(val));
                              showToast(`Preferencia guardada: Barra lateral ${val ? "colapsada" : "expandida"} por defecto`);
                            }}
                            className="sr-only peer" 
                          />
                          <div className="relative w-11 h-6 bg-neutral-300 dark:bg-white/10 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>

                      {/* Auto-start on boot */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Iniciar Capi al arrancar el sistema</h3>
                          <p className="text-xs text-text-secondary mt-1">Activa o desactiva que la aplicación se ejecute automáticamente al encender tu equipo.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={autostartEnabled}
                            onChange={(e) => {
                              const val = e.target.checked;
                              if (val) {
                                enable().then(() => setAutostartEnabled(true)).catch(console.error);
                              } else {
                                disable().then(() => setAutostartEnabled(false)).catch(console.error);
                              }
                              showToast(`Iniciar al arrancar: ${val ? "activado" : "desactivado"}`);
                            }}
                            className="sr-only peer" 
                          />
                          <div className="relative w-11 h-6 bg-neutral-300 dark:bg-white/10 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>
                    </>
                  )}

                  {/* === DATOS === */}
                  {settingsCategory === "datos" && (
                    <>
                      {/* Global Backup / Restore */}
                      <div className="flex flex-col gap-3 border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Copia de seguridad completa</h3>
                          <p className="text-xs text-text-secondary mt-1">Exporta o importa toda la configuración, estadísticas, historial, favoritos, listas y descargas de la aplicación. Al importar en un dispositivo nuevo, las descargas se restaurarán automáticamente.</p>
                        </div>
                        <div className="flex flex-wrap gap-3 pt-1">
                          <button
                            onClick={exportGlobalBackup}
                            className="px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold rounded-xl transition hover:scale-105 active:scale-95 flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Exportar copia completa
                          </button>
                          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-primary text-xs font-semibold rounded-xl transition hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" /> Importar copia completa
                            <input 
                              type="file" 
                              accept=".json" 
                              onChange={importGlobalBackup} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                      {/* Import / Export */}
                      <div className="flex flex-col gap-3 border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-semibold text-sm text-text-primary">Gestión de Datos y Estadísticas</h3>
                          <p className="text-xs text-text-secondary mt-1">Copia de seguridad y restauración de tus estadísticas de reproducción de Capi.</p>
                        </div>
                        <div className="flex flex-wrap gap-3 pt-1">
                          <button
                            onClick={exportStats}
                            className="px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold rounded-xl transition hover:scale-105 active:scale-95 flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Exportar estadísticas
                          </button>
                          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-primary text-xs font-semibold rounded-xl transition hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" /> Importar estadísticas
                            <input 
                              type="file" 
                              accept=".json" 
                              onChange={importStats} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>

                      {/* Profile Edit */}
                      <div className="space-y-4 pt-2">
                        <h3 className="font-semibold text-sm text-text-primary">Editar Perfil</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Nombre de Usuario</label>
                            <input
                              type="text"
                              value={capiUsername}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setCapiUsername(newName);
                                localStorage.setItem("capi_username", newName);
                              }}
                              placeholder="Usuario Capi"
                              className="w-full bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary transition shadow-inner"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Foto de Perfil</label>
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const base64String = reader.result as string;
                                      setCapiAvatar(base64String);
                                      localStorage.setItem("capi_user_avatar", base64String);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="flex-1 text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 file:cursor-pointer"
                              />
                              {capiAvatar && (
                                <button
                                  onClick={() => {
                                    setCapiAvatar("");
                                    localStorage.removeItem("capi_user_avatar");
                                    showToast("Foto de perfil eliminada");
                                  }}
                                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold transition hover:scale-105 active:scale-95"
                                >
                                  Eliminar foto
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* === ACERCA DE === */}
                  {settingsCategory === "acerca-de" && (
                    <div className="space-y-6">
                      {/* App Info */}
                      <div className="border-b border-white/5 pb-6">
                        <h3 className="font-semibold text-sm text-text-primary mb-3">Capi Desktop</h3>
                        <div className="space-y-2 text-xs text-text-secondary">
                          <p><span className="font-semibold text-text-primary">Versión:</span> 1.0.0</p>
                          <p><span className="font-semibold text-text-primary">Desarrollado con:</span> React 19, TypeScript, Tauri 2, Tailwind CSS 4</p>
                          <p><span className="font-semibold text-text-primary">Motor de audio:</span> capi-core (daemon local)</p>
                          <p><span className="font-semibold text-text-primary">Repositorio:</span> github.com/jh2929/Capi</p>
                        </div>
                      </div>

                      {/* Contact & Support */}
                      <div className="border-b border-white/5 pb-6">
                        <h3 className="font-semibold text-sm text-text-primary mb-3">Contacto y Soporte</h3>
                        <div className="space-y-3 text-xs text-text-secondary">
                          <a
                            href="https://github.com/jh2929/Capi"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:text-brand-primary transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0Z"/></svg>
                            GitHub — github.com/jh2929/Capi
                          </a>
                          <a
                            href="https://mail.google.com/mail/?view=cm&fs=1&to=jemoldy.242@gmail.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:text-brand-primary transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            jemoldy.242@gmail.com
                          </a>
                          <a
                            href="https://wa.me/585973616"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:text-brand-primary transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            +58-5973616
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText("jesusemilio2908@gmail.com");
                              setShowPayPalModal(true);
                            }}
                            className="flex items-center gap-2 hover:text-brand-primary transition cursor-pointer w-full text-left"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/><path d="M19.127 6.234c-.028.16-.06.323-.096.49-1.075 5.44-4.444 7.332-8.746 7.332h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106H3.18l1.533-9.723c.082-.518.526-.9 1.05-.9h2.19c4.302 0 7.67-1.893 8.746-7.332.036-.167.068-.33.096-.49.284-1.447.146-2.636-.546-3.498 1.288.48 2.365 1.424 2.877 2.78.38.998.34 2.135-.02 3.335z" opacity=".4"/></svg>
                            jesusemilio2908@gmail.com (PayPal)
                          </button>
                        </div>
                      </div>

                      {/* Keyboard Shortcuts */}
                      <div>
                        <h3 className="font-semibold text-sm text-text-primary mb-4">Atajos de Teclado</h3>
                        <div className="space-y-2.5">
                          {[
                            { keys: ["Shift", "↑"], desc: "Expandir / contraer reproductor" },
                            { keys: ["Shift", "←"], desc: "Canción anterior" },
                            { keys: ["Shift", "→"], desc: "Siguiente canción" },
                            { keys: ["↑"], desc: "Subir volumen" },
                            { keys: ["↓"], desc: "Bajar volumen" },
                            { keys: ["Espacio"], desc: "Reproducir / pausar" },
                          ].map((shortcut, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs text-text-secondary">{shortcut.desc}</span>
                              <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, j) => (
                                  <span key={j}>
                                    <kbd className="px-2 py-0.5 bg-white/10 border border-white/10 rounded-md text-[11px] font-mono font-bold text-text-primary">{key}</kbd>
                                    {j < shortcut.keys.length - 1 && <span className="text-text-secondary mx-0.5 text-[10px]">+</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Disclaimer */}
                      <div className="border-t border-white/5 pt-6">
                        <p className="text-[11px] text-text-secondary/60 leading-relaxed">
                          Capi Desktop es un reproductor de música independiente de código abierto. No está afiliado, asociado, autorizado ni respaldado por ninguna plataforma o servicio de terceros.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PROFILE VIEW */}
          {activeTab === "perfil" && (
            <div className="space-y-6 max-w-2xl animate-fade-in text-left">
              <div className="relative rounded-3xl overflow-hidden h-48 bg-gradient-to-tr from-brand-primary/20 via-brand-tertiary/10 to-bg-dark border border-white/5 flex items-end p-8">
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-surface-dark flex items-center justify-center flex-shrink-0">
                    <img 
                      src={capiAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150"} 
                      alt="Perfil" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-text-primary">{capiUsername || "Usuario Capi"}</h2>
                    <p className="text-sm text-text-secondary mt-1 font-semibold">Plan Capi Max</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-lg text-text-primary">Opciones de Cuenta</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => navigateTo("settings")}
                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5 text-left flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-semibold text-sm text-text-primary">Ajustes / Configuración</p>
                      <p className="text-xs text-text-secondary mt-0.5">Modificar preferencias y visualización</p>
                    </div>
                    <ChevronLeft className="w-5 h-5 rotate-180 text-text-secondary group-hover:text-brand-primary transition-transform duration-200" />
                  </button>
                  <button 
                    onClick={() => navigateTo("favoritos")}
                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5 text-left flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-semibold text-sm text-text-primary">Mis Favoritos</p>
                      <p className="text-xs text-text-secondary mt-0.5">{favorites.length} canciones guardadas</p>
                    </div>
                    <ChevronLeft className="w-5 h-5 rotate-180 text-text-secondary group-hover:text-brand-primary transition-transform duration-200" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NEW RELEASES VIEW */}
          {activeTab === "lanzamientos" && (
            <div className="space-y-6 animate-fade-in text-left">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Nuevos Lanzamientos</h2>
                <p className="text-sm text-text-secondary">Descubre la música más reciente lanzada al mercado.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {newReleases.length > 0 ? (
                  newReleases.map((release) => (
                    <div 
                      key={release.id}
                      onClick={() => playTrack(release, newReleases)}
                      onContextMenu={(e) => openContextMenu(e, release.id)}
                      className="p-4 bg-surface-dark/40 hover:bg-surface-dark rounded-2xl border border-white/5 transition duration-300 group flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-black/20 shadow-md">
                          <SafeImage src={release.thumbnail} alt={release.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Play className="w-8 h-8 text-brand-primary fill-current" />
                          </div>
                        </div>
                        <h4 className="font-bold text-sm truncate text-white">{release.title}</h4>
                        <p className="text-xs text-text-secondary truncate mt-0.5">{release.artist}</p>
                      </div>
                      <p className="text-[10px] text-brand-primary font-semibold mt-3 uppercase tracking-wider">
                        {release.album ? release.album : "Lanzamiento"}
                      </p>
                    </div>
                  ))
                ) : (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <SkeletonCard key={idx} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* DOWNLOAD MANAGER VIEW */}
          {activeTab === "download_manager" && (
            <div className="space-y-6 max-w-4xl animate-fade-in text-left">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2 text-white">Gestor de Descargas</h2>
                <p className="text-sm text-text-secondary">Monitorea y gestiona tus descargas activas en tiempo real.</p>
              </div>

              <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-6 space-y-4">
                {Object.keys(downloadProgress).length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-3">
                    <Download className="w-8 h-8 text-text-secondary animate-pulse" />
                    <p className="text-sm text-text-secondary">No hay descargas activas en este momento.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {Object.entries(downloadProgress).map(([trackId, progress]) => {
                      const track = activeDownloads[trackId];
                      if (!track) return null;
                      return (
                        <div key={trackId} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                          <SafeImage trackId={track.id} src={track.thumbnail} alt={track.title} className="w-12 h-12 rounded-lg object-cover bg-black/40 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-white truncate">{track.title}</h4>
                            <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                              <div
                                className="bg-brand-primary h-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-xs font-mono font-semibold text-brand-primary">
                              {progress}%
                            </span>
                            <button
                              onClick={() => {
                                setDownloadProgress(prev => {
                                  const copy = { ...prev };
                                  delete copy[trackId];
                                  return copy;
                                });
                                setActiveDownloads(prev => {
                                  const copy = { ...prev };
                                  delete copy[trackId];
                                  return copy;
                                });
                                delete activeDownloadsRef.current[trackId];
                              }}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition border border-red-500/20 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </section>

        {/* BOTTOM PLAYER BAR - full width */}
        <footer 
          onClick={() => currentTrack && setIsPlayerExpanded(true)}
          style={dynamicThemeEnabled && extractedColors ? { background: `linear-gradient(to right, ${extractedColors.primary}15, ${extractedColors.secondary}08)`, borderTopColor: `${extractedColors.primary}22` } : {}}
          className="h-24 bg-surface-dark/80 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-8 absolute bottom-0 left-0 right-0 z-20 shadow-2xl cursor-pointer"
        >
          {/* Left: Info */}
          <div 
            onClick={(e) => { e.stopPropagation(); currentTrack && setIsPlayerExpanded(true); }} 
            className="w-1/3 flex items-center gap-3 min-w-0 group"
          >
            {currentTrack ? (
              <>
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/5 shadow-md flex-shrink-0">
                  <SafeImage trackId={currentTrack.id} src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate group-hover:text-brand-primary transition text-text-primary">{currentTrack.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-text-secondary truncate">{currentTrack.artist}</p>
                  </div>
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
          <div className="w-1/3 flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-5">
              <button
                onClick={(e) => { e.stopPropagation(); setIsShuffle(!isShuffle); }}
                className={`transition ${isShuffle ? "text-brand-primary" : "text-text-secondary hover:text-text-primary"}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); playPrev(); }} 
                disabled={activeQueue.length === 0} 
                className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition duration-150"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                disabled={!streamUrl}
                className="w-11 h-11 rounded-full bg-brand-primary text-bg-dark flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 transition duration-200"
              >
                {buffering ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); playNext(); }} 
                disabled={activeQueue.length === 0} 
                className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition duration-150"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); currentTrack && toggleFavorite(currentTrack); }}
                disabled={!currentTrack}
                className={`transition ${currentTrack && isFavorite(currentTrack) ? "text-brand-primary animate-pulse" : "text-text-secondary hover:text-text-primary"} disabled:opacity-40`}
              >
                <Heart className={`w-4 h-4 ${currentTrack && isFavorite(currentTrack) ? "fill-current" : ""}`} />
              </button>
            </div>
            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] text-text-secondary w-8 text-right">{formatTime(currentTime)}</span>
              <input 
                type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} disabled={!streamUrl}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="flex-1 accent-brand-primary h-1 rounded-full bg-white/10 appearance-none cursor-pointer" 
              />
              <span className="text-[10px] text-text-secondary w-8 text-left">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Volume + Sleep Timer + 3-dots */}
          <div className="w-1/3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {currentTrack && (
              <button 
                onClick={(e) => { e.stopPropagation(); setContextMenuTrack(currentTrack); }} 
                className="p-2 text-text-secondary hover:text-brand-primary transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}

            {/* Repeat Mode Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRepeatMode(prev => prev === "none" ? "all" : prev === "all" ? "one" : "none");
              }}
              className={`p-2 transition ${repeatMode !== "none" ? "text-brand-primary" : "text-text-secondary hover:text-text-primary"}`}
              title={repeatMode === "none" ? "Repetición: Desactivada" : repeatMode === "one" ? "Repetición: Una canción" : "Repetición: Todo"}
            >
              {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>

            {/* Sleep Timer Button */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSleepTimerMenu(!showSleepTimerMenu); }}
                className={`p-2 transition relative ${sleepMode ? "text-brand-primary" : "text-text-secondary hover:text-text-primary"}`}
                title="Sleep Timer"
              >
                <Moon className="w-4 h-4" />
                {sleepMode === "time" && sleepTimerSeconds !== null && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-brand-primary text-bg-dark rounded-full px-1 font-bold min-w-[18px] text-center leading-[14px]">
                    {formatSleepTimer(sleepTimerSeconds)}
                  </span>
                )}
                {sleepMode === "endOfTrack" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
                )}
              </button>
              {showSleepTimerMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowSleepTimerMenu(false); }} />
                  <div className="absolute bottom-full right-0 mb-2 w-48 glass rounded-2xl p-1.5 shadow-2xl z-50 space-y-0.5 border border-white/10" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary px-3 py-1.5">Sleep Timer</p>
                    {[15, 30, 45, 60].map(m => (
                      <button
                        key={m}
                        onClick={(e) => { e.stopPropagation(); startSleepTimer(m); }}
                        className="w-full text-left px-3 py-2 text-xs rounded-xl transition hover:bg-brand-primary hover:text-bg-dark text-text-primary flex items-center gap-2"
                      >
                        <Timer className="w-3.5 h-3.5" /> {m} minutos
                      </button>
                    ))}
                    <button
                      onClick={(e) => { e.stopPropagation(); startSleepEndOfTrack(); }}
                      className="w-full text-left px-3 py-2 text-xs rounded-xl transition hover:bg-brand-primary hover:text-bg-dark text-text-primary flex items-center gap-2"
                    >
                      <Music className="w-3.5 h-3.5" /> Fin de canción actual
                    </button>
                    {sleepMode && (
                      <>
                        <div className="border-t border-white/5 my-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelSleepTimer(); showToast("Sleep Timer cancelado"); setShowSleepTimerMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl transition hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                        >
                          <X className="w-3.5 h-3.5" /> Cancelar timer
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className="text-text-secondary hover:text-text-primary transition"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4 text-brand-primary" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range" min="0" max="1" step="0.01" value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-24 accent-brand-secondary h-1 rounded-full bg-white/10 appearance-none cursor-pointer"
            />
            {currentTrack && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsPlayerExpanded(true); }} 
                className="p-2 text-text-secondary hover:text-white transition"
                title="Expandir reproductor"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>

        {/* EXPANDED FULLSCREEN PLAYER */}
        {isPlayerExpanded && currentTrack && (
          <div 
            style={dynamicThemeEnabled && extractedColors ? { background: `radial-gradient(circle at center, ${extractedColors.primary}25 0%, #0c0a0f 100%)` } : {}}
            className="absolute inset-0 bg-bg-dark/95 z-50 flex flex-col md:flex-row p-8 gap-8 items-center justify-start md:justify-center overflow-y-auto md:overflow-y-hidden animate-fade-in backdrop-blur-lg"
          >
            <button 
              onClick={() => setIsPlayerExpanded(false)}
              className="fixed top-6 right-6 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition z-[60]"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            {/* Ambient Blurred Background Art */}
            <div className="absolute inset-0 z-0 overflow-hidden filter blur-3xl opacity-20 pointer-events-none scale-125">
              <SafeImage src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Left Panel: Cover Art & Controls */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center z-10 max-w-md gap-6 flex-shrink-0">
              {/* Cover Art */}
              <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative aspect-square w-full max-w-[350px] rounded-3xl overflow-hidden shadow-2xl bg-black/40 border border-white/10 cursor-grab active:cursor-grabbing group"
              >
                <SafeImage trackId={currentTrack.id} src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
              </div>
              
              {/* Title & Artist stacked vertically */}
              <div className="text-center w-full px-4 flex flex-col gap-1">
                <h2 className="text-2xl font-bold tracking-tight text-white line-clamp-1">{currentTrack.title}</h2>
                <p className="text-brand-primary font-semibold text-sm truncate">{currentTrack.artist}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6 w-full">
                <button
                  onClick={() => setRepeatMode(prev => prev === "none" ? "all" : prev === "all" ? "one" : "none")}
                  className={`p-2 transition ${repeatMode !== "none" ? "text-brand-primary" : "text-text-secondary hover:text-white"}`}
                  title={repeatMode === "none" ? "Repetición: Desactivada" : repeatMode === "one" ? "Repetición: Una canción" : "Repetición: Todo"}
                >
                  {repeatMode === "one" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
                <button onClick={() => setIsShuffle(!isShuffle)} className={`p-2 transition ${isShuffle ? "text-brand-primary" : "text-text-secondary hover:text-white"}`}>
                  <Shuffle className="w-5 h-5" />
                </button>
                <button onClick={playPrev} className="p-2 text-text-secondary hover:text-white transition">
                  <SkipBack className="w-6 h-6" />
                </button>
                <button onClick={togglePlay} className="w-14 h-14 bg-brand-primary text-bg-dark rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-brand-primary/20">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
                <button onClick={playNext} className="p-2 text-text-secondary hover:text-white transition">
                  <SkipForward className="w-6 h-6" />
                </button>
                <button onClick={() => toggleFavorite(currentTrack)} className="p-2 text-text-secondary hover:text-brand-primary transition">
                  <Heart className={`w-5 h-5 ${isFavorite(currentTrack) ? "fill-brand-primary text-brand-primary" : ""}`} />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setContextMenuTrack(currentTrack); 
                  }} 
                  className="p-2 text-text-secondary hover:text-white transition"
                  title="Más opciones"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Time Slider */}
              <div className="w-full flex items-center gap-3 px-4">
                <span className="text-xs text-text-secondary w-10 text-right">{formatTime(currentTime)}</span>
                <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek}
                  className="flex-1 accent-brand-primary h-1 bg-white/10 rounded-full cursor-pointer" />
                <span className="text-xs text-text-secondary w-10 text-left">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Panel: Tabs (Queue / Lyrics / Related) */}
            <div className="w-full md:w-1/2 h-[350px] md:h-[500px] flex flex-col z-10 max-w-lg border border-white/5 rounded-3xl bg-surface-dark/30 backdrop-blur-md overflow-hidden flex-shrink-0">
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
                {playerTab === "queue" && (
                  <div className="p-4 space-y-1">
                    {activeQueue.length > 0 ? (
                      activeQueue.map((track, idx) => (
                        <div
                          key={track.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group ${
                            currentTrack?.id === track.id ? "bg-brand-primary/10 border border-brand-primary/20" : "hover:bg-white/5"
                          } ${dragIndex === idx ? "dragging-queue-item" : ""} ${dragOverIndex === idx ? "drag-over-queue-item" : ""}`}
                          onClick={() => playTrack(track)}
                        >
                          <GripVertical className="w-4 h-4 text-text-secondary/50 drag-handle flex-shrink-0" />
                          <SafeImage trackId={track.id} src={track.thumbnail} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt={track.title} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${currentTrack?.id === track.id ? "text-brand-primary font-semibold" : "font-medium"}`}>{track.title}</p>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                              {downloads[track.id] && (
                                <span className="flex-shrink-0 text-brand-primary" title="Descargado localmente">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v8M12 15l-3-3M12 15l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" className="text-bg-dark"/></svg>
                                </span>
                              )}
                            </div>
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
                  <div className="flex flex-col h-full relative">
                    <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider text-brand-primary">Letras de Canción</span>
                        {showTranslation && (
                          <span className="text-[9px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded-full font-bold uppercase">
                            {TRANSLATION_LANGS.find(l => l.code === translationLang)?.name}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center gap-1">
                        {/* Translation toggle */}
                        {translatedLyrics && (
                          <button
                            onClick={() => setShowTranslation(!showTranslation)}
                            className={`p-1.5 transition text-xs font-bold rounded-lg ${showTranslation ? "text-brand-primary bg-brand-primary/10" : "text-text-secondary hover:text-brand-primary"}`}
                            title={showTranslation ? "Ver original" : "Ver traducción"}
                          >
                            <Languages className="w-4 h-4" />
                          </button>
                        )}
                        {/* Scroll lock toggle */}
                        <button
                          onClick={() => {
                            const nextVal = !lyricsScrollLocked;
                            setLyricsScrollLocked(nextVal);
                            if (nextVal) {
                              setTimeout(() => {
                                syncLyricsScroll(true);
                              }, 50);
                            }
                          }}
                          className={`p-1.5 transition text-xs font-bold rounded-lg ${lyricsScrollLocked ? "text-brand-primary bg-brand-primary/10" : "text-text-secondary hover:text-brand-primary"}`}
                          title={lyricsScrollLocked ? "Desbloquear scroll" : "Bloquear scroll en letra activa"}
                        >
                          {lyricsScrollLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        {translating && (
                          <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
                        )}
                        <button onClick={() => setLyricsMenuOpen(!lyricsMenuOpen)} className="p-1.5 text-text-secondary hover:text-brand-primary transition">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {lyricsMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 bg-surface-dark border border-white/10 rounded-xl shadow-2xl z-10 w-52 py-1 modal-content">
                            <button onClick={copyLyrics} className="w-full text-left px-3 py-2 text-xs hover:bg-brand-primary hover:text-bg-dark rounded-lg transition flex items-center gap-2">
                              <Copy className="w-3.5 h-3.5" /> Copiar toda la letra
                            </button>
                            <button onClick={() => { if (currentTrack) fetchLyrics(currentTrack); setLyricsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-brand-primary hover:text-bg-dark rounded-lg transition flex items-center gap-2">
                              <RefreshCw className="w-3.5 h-3.5" /> Recargar letras
                            </button>
                            <div className="border-t border-white/5 my-1" />
                            <button
                              onClick={() => { setShowLangSelector(!showLangSelector); }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-brand-primary hover:text-bg-dark rounded-lg transition flex items-center gap-2"
                            >
                              <Languages className="w-3.5 h-3.5" /> Traducir letras
                            </button>
                            {showLangSelector && (
                              <div className="px-2 py-1 space-y-0.5">
                                {TRANSLATION_LANGS.map(lang => (
                                  <button
                                    key={lang.code}
                                    onClick={() => {
                                      setTranslationLang(lang.code);
                                      localStorage.setItem("capi_translation_lang", lang.code);
                                      setShowLangSelector(false);
                                      translateLyrics(lang.code);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition flex items-center justify-between ${
                                      translationLang === lang.code ? "bg-brand-primary/10 text-brand-primary font-bold" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                                    }`}
                                  >
                                    <span>{lang.name}</span>
                                    {translationLang === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div 
                      ref={lyricsContainerRef} 
                      className={`flex-1 ${lyricsScrollLocked ? "overflow-hidden" : "overflow-y-auto"} p-6 space-y-6 text-center text-text-secondary`}
                    >
                      {(() => {
                        const displayLyrics = showTranslation && translatedLyrics ? translatedLyrics : parsedLyrics;
                        return displayLyrics.length > 0 ? (
                          displayLyrics.map((line, idx) => (
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
                        );
                      })()}
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
                          <SafeImage trackId={track.id} src={track.thumbnail} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt={track.title} />
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

      {/* ARTIST CONTEXT MENU */}
      {contextMenuArtist && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] modal-overlay" onClick={() => setContextMenuArtist(null)}>
          <div className="glass p-5 rounded-2xl max-w-xs w-full border border-white/10 shadow-2xl mx-4 modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
              <SafeImage src={contextMenuArtist.thumbnail || ""} className="w-12 h-12 rounded-full object-cover bg-black/40" alt={contextMenuArtist.artistName} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{contextMenuArtist.artistName}</p>
                <p className="text-xs text-text-secondary truncate">Artista</p>
              </div>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setHiddenArtists(prev => [...prev, contextMenuArtist.artistName]);
                  setContextMenuArtist(null);
                }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <X className="w-4 h-4" /> Eliminar de la vista principal
              </button>
              <button
                onClick={() => {
                  setContextMenuArtist(null);
                  if (contextMenuArtist.artistId) {
                    loadArtistProfile(contextMenuArtist.artistId);
                  } else {
                    setQuery(contextMenuArtist.artistName);
                    navigateTo("buscar");
                    invoke<string>("buscar_cancion", { query: contextMenuArtist.artistName }).then((res) => {
                      const parsed = JSON.parse(res);
                      const items = Array.isArray(parsed) ? parsed : (parsed.results || parsed.tracks || []);
                      const match = items.find((item: any) => item.type === "artist" || item.type?.toLowerCase().includes("artist"));
                      if (match && (match.id || match.browseId)) {
                        loadArtistProfile(match.id || match.browseId);
                      }
                    });
                  }
                }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <User className="w-4 h-4" /> View artist
              </button>
            </div>
            <button
              onClick={() => setContextMenuArtist(null)}
              className="w-full mt-3 pt-3 border-t border-white/5 text-center text-xs text-text-secondary hover:text-text-primary transition py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* CONTEXT MENU MODAL */}
      {contextMenuTrack && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] modal-overlay" onClick={() => setContextMenuTrack(null)}>
          <div className="glass p-5 rounded-2xl max-w-xs w-full border border-white/10 shadow-2xl mx-4 modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Track info header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
              <SafeImage src={contextMenuTrack.thumbnail} className="w-12 h-12 rounded-xl object-cover" alt={contextMenuTrack.title} />
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
                onClick={() => { playTrackNext(contextMenuTrack); setContextMenuTrack(null); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <SkipForward className="w-4 h-4" /> Reproducir siguiente
              </button>
              <button 
                onClick={() => { addToQueue(contextMenuTrack); setContextMenuTrack(null); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <ListPlus className="w-4 h-4" /> Añadir a la cola
              </button>
              {contextMenuTrack.artistId && (
                <button 
                  onClick={() => { loadArtistProfile(contextMenuTrack.artistId!); setContextMenuTrack(null); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
                >
                  <User className="w-4 h-4" /> Ver artista
                </button>
              )}
              {contextMenuTrack.album && (
                <button 
                  onClick={() => { viewAlbumFromTrack(contextMenuTrack); setContextMenuTrack(null); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
                >
                  <Disc3 className="w-4 h-4" /> Ver álbum
                </button>
              )}
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
                onClick={() => {
                  const url = `https://music.youtube.com/watch?v=${contextMenuTrack.id}`;
                  navigator.clipboard.writeText(url);
                  showToast("Enlace de canción copiado al portapapeles");
                  setContextMenuTrack(null);
                }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Copy className="w-4 h-4" /> Compartir canción
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

      {/* PLAYLIST CONTEXT MENU MODAL */}
      {contextMenuPlaylist && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] modal-overlay" onClick={() => { setContextMenuPlaylist(null); setIsRenamingPlaylist(false); setRenamePlaylistName(""); }}>
          <div className={`glass p-5 rounded-2xl w-full border border-white/10 shadow-2xl mx-4 modal-content ${isRenamingPlaylist ? "max-w-sm" : "max-w-xs"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex ${isRenamingPlaylist ? "items-start" : "items-center"} gap-3 mb-4 pb-3 border-b border-white/5`}>
              <div className={`rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary flex-shrink-0 ${isRenamingPlaylist ? "w-10 h-[58px]" : "w-10 h-10"}`}>
                <ListMusic className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {isRenamingPlaylist ? (
                  <input
                    type="text"
                    value={renamePlaylistName}
                    onChange={(e) => setRenamePlaylistName(e.target.value)}
                    autoFocus
                    className="w-full bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && renamePlaylistName.trim()) {
                        renamePlaylist(contextMenuPlaylist.id, renamePlaylistName);
                        setContextMenuPlaylist(null);
                        setIsRenamingPlaylist(false);
                        setRenamePlaylistName("");
                      }
                      if (e.key === "Escape") {
                        setIsRenamingPlaylist(false);
                        setRenamePlaylistName("");
                      }
                    }}
                  />
                ) : (
                  <p className="font-semibold text-sm truncate">{contextMenuPlaylist.name}</p>
                )}
                <p className="text-xs text-text-secondary truncate">{contextMenuPlaylist.tracks.length} canciones</p>
              </div>
            </div>
            <div className="space-y-1">
              {isRenamingPlaylist ? (
                <>
                  <button
                    onClick={() => {
                      if (renamePlaylistName.trim()) {
                        renamePlaylist(contextMenuPlaylist.id, renamePlaylistName);
                        setContextMenuPlaylist(null);
                        setIsRenamingPlaylist(false);
                        setRenamePlaylistName("");
                      }
                    }}
                    disabled={!renamePlaylistName.trim()}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3 disabled:opacity-50"
                  >
                    <Pencil className="w-4 h-4" /> Guardar nombre
                  </button>
                  <button
                    onClick={() => { setIsRenamingPlaylist(false); setRenamePlaylistName(""); }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 rounded-xl transition flex items-center gap-3"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
              <button 
                onClick={() => { setSelectedPlaylistId(contextMenuPlaylist.id); setContextMenuPlaylist(null); setActiveTab("playlists"); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Library className="w-4 h-4" /> Ver detalles
              </button>
              {contextMenuPlaylist.tracks.length > 0 && (
                <button 
                  onClick={() => { playShuffleQueue(contextMenuPlaylist.tracks); setContextMenuPlaylist(null); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
                >
                  <Shuffle className="w-4 h-4" /> Reproducción aleatoria
                </button>
              )}
              {contextMenuPlaylist.tracks.length > 0 && (
                <button 
                  onClick={() => { downloadAllTracks(contextMenuPlaylist.tracks); setContextMenuPlaylist(null); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
                >
                  <Download className="w-4 h-4" /> Descargar todo
                </button>
              )}
                <button 
                 onClick={() => { setRenamePlaylistName(contextMenuPlaylist.name); setIsRenamingPlaylist(true); }}
                 className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
               >
                 <Pencil className="w-4 h-4" /> Renombrar
               </button>
               <button 
                onClick={() => { deletePlaylist(contextMenuPlaylist.id); setContextMenuPlaylist(null); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-red-500 hover:text-white rounded-xl transition text-red-300 flex items-center gap-3"
              >
                <Trash2 className="w-4 h-4" /> Eliminar Lista
              </button>
              </>
              )}
            </div>
            {!isRenamingPlaylist && (
            <button
              onClick={() => setContextMenuPlaylist(null)}
              className="w-full mt-3 pt-3 border-t border-white/5 text-center text-xs text-text-secondary hover:text-text-primary transition py-2"
            >
              Cancelar
            </button>
            )}
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

      {/* IMPORT PLAYLIST FROM URL MODAL */}
      {showImportPlaylistModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in" onClick={() => { setShowImportPlaylistModal(false); setImportPlaylistUrl(""); }}>
          <div className="glass p-6 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl mx-4 modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold">Importar Playlist</h3>
                <p className="text-xs text-text-secondary mt-0.5">Pega el enlace de YouTube Music</p>
              </div>
            </div>
            <input
              type="text"
              value={importPlaylistUrl}
              onChange={(e) => setImportPlaylistUrl(e.target.value)}
              placeholder="https://music.youtube.com/playlist?list=..."
              autoFocus
              className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary mb-5 transition duration-200"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  importPlaylistFromUrl();
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowImportPlaylistModal(false); setImportPlaylistUrl(""); }}
                className="px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={importPlaylistFromUrl}
                disabled={!importPlaylistUrl.trim()}
                className="px-4 py-2 rounded-xl bg-brand-primary text-bg-dark font-bold text-sm transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Arrow-Key Toast Notification */}
      {toastData && (() => {
        if (toastData.kind === "volume") {
          const pct = Math.round(toastData.level * 100);
          const isMuted = toastData.level === 0;
          return (
            <div key="toast-vol" className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[70] animate-fade-in pointer-events-none">
              <div className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-2xl border border-white/10 shadow-2xl"
                style={{ background: "rgba(18,18,24,0.82)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", minWidth: 160 }}
              >
                {/* Speaker SVG icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="text-white"
                >
                  {isMuted ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" className="text-white/70" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </>
                  ) : pct < 35 ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" className="text-white/70" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </>
                  ) : pct < 70 ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" className="text-white/70" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" className="text-white/70" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  )}
                </svg>

                {/* Apple-style smooth bar */}
                <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.15)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{ width: `${pct}%`, background: "var(--brand-primary)" }}
                  />
                </div>

                {/* Percentage label */}
                <span className="text-white/70 text-xs font-semibold tabular-nums tracking-wide">{pct}%</span>
              </div>
            </div>
          );
        }

        if (toastData.kind === "seek") {
          const isForward = toastData.direction === "forward";
          return (
            <div key="toast-seek" className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[70] animate-fade-in pointer-events-none">
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-white/10 shadow-2xl"
                style={{ background: "rgba(18,18,24,0.82)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
              >
                {/* Seek SVG */}
                {isForward ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white flex-shrink-0">
                    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none" className="text-white/80" />
                    <polygon points="13 4 23 12 13 20 13 4" fill="currentColor" stroke="none" className="text-white/50" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white flex-shrink-0">
                    <polygon points="19 4 9 12 19 20 19 4" fill="currentColor" stroke="none" className="text-white/80" />
                    <polygon points="11 4 1 12 11 20 11 4" fill="currentColor" stroke="none" className="text-white/50" />
                  </svg>
                )}
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-sm leading-tight">
                    {isForward ? "Adelantar" : "Retroceder"}
                  </span>
                  <span className="text-white/50 text-xs font-medium tabular-nums">{toastData.seconds}s</span>
                </div>
              </div>
            </div>
          );
        }

        if (toastData.kind === "text") {
          return (
            <div key="toast-text" className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[70] animate-fade-in pointer-events-none">
              <div className="px-5 py-3 rounded-2xl border border-white/10 shadow-2xl"
                style={{ background: "rgba(18,18,24,0.82)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
              >
                <span className="text-white font-semibold text-sm">{toastData.message}</span>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* ALBUM OR PLAYLIST CONTEXT MENU MODAL */}
      {contextMenuAlbumOrPlaylist && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] modal-overlay" onClick={() => setContextMenuAlbumOrPlaylist(null)}>
          <div className="glass p-5 rounded-2xl max-w-xs w-full border border-white/10 shadow-2xl mx-4 modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
              <SafeImage src={contextMenuAlbumOrPlaylist.thumbnail} className="w-12 h-12 rounded-xl object-cover bg-black/40" alt={contextMenuAlbumOrPlaylist.title || contextMenuAlbumOrPlaylist.name || ""} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{contextMenuAlbumOrPlaylist.title || contextMenuAlbumOrPlaylist.name || "Nueva Playlist"}</p>
                <p className="text-xs text-text-secondary truncate capitalize">{contextMenuAlbumOrPlaylist.type === "album" ? "Álbum" : "Lista de reproducción"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => playAlbumOrPlaylistAll(contextMenuAlbumOrPlaylist)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Play className="w-4 h-4" /> {T("play_all") || "Reproducir todo"}
              </button>
              <button 
                onClick={() => playAlbumOrPlaylistShuffle(contextMenuAlbumOrPlaylist)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Shuffle className="w-4 h-4" /> {T("play_shuffle_all") || "Reproducir aleatorio"}
              </button>
              <button 
                onClick={() => playAlbumOrPlaylistNext(contextMenuAlbumOrPlaylist)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <SkipForward className="w-4 h-4" /> {T("play_next_playlist") || "Reproducir al siguiente"}
              </button>
              <button 
                onClick={() => addAlbumOrPlaylistToQueue(contextMenuAlbumOrPlaylist)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <ListPlus className="w-4 h-4" /> {T("add_playlist_to_queue") || "Agregar a la cola"}
              </button>
              <button 
                onClick={() => saveAlbumOrPlaylistAsLocal(contextMenuAlbumOrPlaylist)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <ListMusic className="w-4 h-4" /> {T("save_playlist_complete") || "Guardar playlist completa"}
              </button>
              <button 
                onClick={() => downloadAlbumOrPlaylist(contextMenuAlbumOrPlaylist)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Download className="w-4 h-4" /> {T("download_complete") || "Descargar completa"}
              </button>
              <button 
                onClick={() => addAlbumOrPlaylistToFavorites(contextMenuAlbumOrPlaylist)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Heart className="w-4 h-4" /> {T("add_playlist_to_favorites") || "Agregar a favoritos"}
              </button>
              <button 
                onClick={() => copyAlbumOrPlaylistLink(contextMenuAlbumOrPlaylist)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-primary hover:text-bg-dark rounded-xl transition flex items-center gap-3"
              >
                <Copy className="w-4 h-4" /> {T("copy_playlist_link") || "Copiar enlace de playlist"}
              </button>
            </div>
            <button
              onClick={() => setContextMenuAlbumOrPlaylist(null)}
              className="w-full mt-3 pt-3 border-t border-white/5 text-center text-xs text-text-secondary hover:text-text-primary transition py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN TRACKS LOADING OVERLAY FOR MENU ACTIONS */}
      {loadingTracksForMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[80] animate-fade-in">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-white/10 shadow-2xl glass max-w-xs w-full text-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary animate-spin"></div>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-white text-base">{T("loading_tracks") || "Cargando canciones..."}</p>
              <p className="text-xs text-text-secondary">Esto puede demorar unos segundos</p>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL CONFIRMATION MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] modal-overlay" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
          <div className="glass p-6 rounded-2xl max-w-sm w-full border border-white/10 shadow-2xl mx-4 modal-content text-left space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-primary" /> {confirmDialog.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-brand-primary text-bg-dark hover:scale-105 active:scale-95 text-xs font-bold rounded-xl transition shadow-lg shadow-brand-primary/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYPAL DONATION MODAL */}
      {showPayPalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] modal-overlay" onClick={() => setShowPayPalModal(false)}>
          <div className="glass p-6 rounded-2xl max-w-sm w-full border border-white/10 shadow-2xl mx-4 modal-content text-center space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 mx-auto rounded-full bg-brand-primary/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-brand-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/><path d="M19.127 6.234c-.028.16-.06.323-.096.49-1.075 5.44-4.444 7.332-8.746 7.332h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106H3.18l1.533-9.723c.082-.518.526-.9 1.05-.9h2.19c4.302 0 7.67-1.893 8.746-7.332.036-.167.068-.33.096-.49.284-1.447.146-2.636-.546-3.498 1.288.48 2.365 1.424 2.877 2.78.38.998.34 2.135-.02 3.335z" opacity=".4"/></svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Apoya el Proyecto</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Si te gusta Capi y quieres ayudar a que siga creciendo, 
                puedes donar lo que tú quieras a través de PayPal.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs bg-white/10 px-3 py-1.5 rounded-lg text-text-primary font-mono">jesusemilio2908@gmail.com</span>
                <span className="text-[10px] text-brand-primary font-semibold uppercase tracking-wider">Copiado</span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText("jesusemilio2908@gmail.com");
                showToast("Correo de PayPal copiado al portapapeles");
              }}
              className="w-full px-4 py-2.5 bg-brand-primary text-bg-dark text-xs font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copiar correo
            </button>
            <button
              onClick={() => setShowPayPalModal(false)}
              className="w-full text-center text-xs text-text-secondary hover:text-text-primary transition py-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
