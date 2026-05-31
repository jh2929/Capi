import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Play, Pause, SkipForward, SkipBack, Search, Music, Volume2, 
  ListMusic, Heart, Check, Loader2, Sparkles, ChevronLeft, ChevronRight, Menu, Plus, Trash2, Clock, Home, Library
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
}

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

// Predefined tracks for Home Recommendations (Trending & Releases)
const TRENDING_MUSIC: Track[] = [
  {
    id: "5qZQEq_C3vc",
    title: "Numb",
    artist: "Linkin Park",
    album: "Meteora",
    duration: 188,
    thumbnail: "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300",
    explicit: false
  },
  {
    id: "BLZWkjBXfN8",
    title: "In the End",
    artist: "Linkin Park",
    album: "Hybrid Theory",
    duration: 217,
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300",
    explicit: false
  },
  {
    id: "fJ9rUzIMcZQ",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    duration: 355,
    thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300",
    explicit: false
  },
  {
    id: "JGwWNGJdvx8",
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    duration: 233,
    thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300",
    explicit: false
  }
];

const NEW_RELEASES: Track[] = [
  {
    id: "4NRXx6U8ABQ",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    duration: 200,
    thumbnail: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=300",
    explicit: false
  },
  {
    id: "7wtfhZwyrcc",
    title: "Believer",
    artist: "Imagine Dragons",
    album: "Evolve",
    duration: 204,
    thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=300",
    explicit: false
  },
  {
    id: "rY0WxgSXdEE",
    title: "Another One Bites the Dust",
    artist: "Queen",
    album: "The Game",
    duration: 215,
    thumbnail: "https://images.unsplash.com/photo-1487180142328-054b783fc471?q=80&w=300",
    explicit: false
  },
  {
    id: "hTWKbfoikeg",
    title: "Smells Like Teen Spirit",
    artist: "Nirvana",
    album: "Nevermind",
    duration: 301,
    thumbnail: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=300",
    explicit: false
  }
];

function App() {
  const [activeTab, setActiveTab] = useState<"home" | "buscar" | "biblioteca" | "playlists" | "favoritos">("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("opentune_sidebar_collapsed") === "true";
  });
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  
  // Playback history, playlists and favorites persisted in LocalStorage
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
  
  // UI control states
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState<Track | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Audio playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("opentune_volume");
    return saved ? parseFloat(saved) : 0.8;
  });
  const [buffering, setBuffering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync favorites, playlists, history and volume to LocalStorage
  useEffect(() => {
    localStorage.setItem("opentune_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("opentune_playlists", JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem("opentune_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("opentune_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem("opentune_volume", String(volume));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle stream retrieval and play/pause
  const playTrack = async (track: Track) => {
    try {
      setLoading(true);
      setCurrentTrack(track);
      setIsPlaying(false);
      setStreamUrl(null);
      setBuffering(true);

      // Add to history
      setHistory(prev => {
        const filtered = prev.filter(t => t.id !== track.id);
        return [track, ...filtered].slice(0, 50); // limit history to 50 items
      });
      
      const resultJson: string = await invoke("obtener_stream", { id: track.id });
      let stream: string = resultJson;
      try {
        const parsed = JSON.parse(resultJson);
        if (parsed.streamUrl) stream = parsed.streamUrl;
        else if (parsed.url) stream = parsed.url;
      } catch {
        if (stream.startsWith('"') && stream.endsWith('"')) {
          stream = stream.substring(1, stream.length - 1);
        }
      }

      setStreamUrl(stream);
      
      if (audioRef.current) {
        audioRef.current.src = stream;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setBuffering(false);
        }).catch(err => {
          console.error("Error playing audio stream:", err);
          setBuffering(false);
        });
      }
    } catch (error) {
      console.error("Failed to retrieve stream:", error);
      alert("Error al obtener el stream de audio");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setActiveTab("buscar");
    setLoading(true);
    try {
      const responseJson: string = await invoke("buscar_cancion", { query });
      const data = JSON.parse(responseJson);
      
      if (Array.isArray(data)) {
        setTracks(data);
      } else if (data.tracks && Array.isArray(data.tracks)) {
        setTracks(data.tracks);
      } else if (data.results && Array.isArray(data.results)) {
        setTracks(data.results);
      } else {
        setTracks([]);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      alert(`Error al buscar: ${error?.message || error || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !streamUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      });
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const playNext = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      playTrack(tracks[currentIndex + 1]);
    }
  };

  const playPrev = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(tracks[currentIndex - 1]);
    }
  };

  // Favorites handling
  const isFavorite = (track: Track) => favorites.some(t => t.id === track.id);
  const toggleFavorite = (track: Track) => {
    if (isFavorite(track)) {
      setFavorites(prev => prev.filter(t => t.id !== track.id));
    } else {
      setFavorites(prev => [...prev, track]);
    }
  };

  // Playlists handling
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: Math.random().toString(36).substring(2, 9),
      name: newPlaylistName.trim(),
      tracks: []
    };
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
        if (p.tracks.some(t => t.id === track.id)) return p; // prevent duplicates
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

  return (
    <div className="flex h-screen w-screen bg-bg-dark text-text-primary overflow-hidden font-sans">
      {/* Audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onEnded={playNext}
      />

      {/* Sidebar / Navigation */}
      <aside className={`${sidebarCollapsed ? "w-20" : "w-64"} glass flex flex-col justify-between p-4 border-r border-white/5 transition-all duration-300`}>
        <div>
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 min-w-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-tertiary flex items-center justify-center shadow-lg shadow-brand-primary/20">
                <Sparkles className="w-5 h-5 text-bg-dark" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-primary to-brand-tertiary bg-clip-text text-transparent">
                    Opentune
                  </h1>
                </div>
              )}
            </div>
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-white/5 transition"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition duration-200 ${
                activeTab === "home" ? "bg-white/5 text-brand-primary font-medium" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <Home className="w-5 h-5 min-w-5" />
              {!sidebarCollapsed && <span>Home</span>}
            </button>
            <button 
              onClick={() => setActiveTab("buscar")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition duration-200 ${
                activeTab === "buscar" ? "bg-white/5 text-brand-primary font-medium" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <Search className="w-5 h-5 min-w-5" />
              {!sidebarCollapsed && <span>Buscar</span>}
            </button>
            <button 
              onClick={() => setActiveTab("biblioteca")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition duration-200 ${
                activeTab === "biblioteca" ? "bg-white/5 text-brand-primary font-medium" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <Library className="w-5 h-5 min-w-5" />
              {!sidebarCollapsed && <span>Biblioteca</span>}
            </button>
            <button 
              onClick={() => setActiveTab("playlists")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition duration-200 ${
                activeTab === "playlists" ? "bg-white/5 text-brand-primary font-medium" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <ListMusic className="w-5 h-5 min-w-5" />
              {!sidebarCollapsed && <span>Playlists</span>}
            </button>
            <button 
              onClick={() => setActiveTab("favoritos")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition duration-200 ${
                activeTab === "favoritos" ? "bg-white/5 text-brand-primary font-medium" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              <Heart className="w-5 h-5 min-w-5" />
              {!sidebarCollapsed && <span>Favoritos</span>}
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-surface-dark/40 to-bg-dark">
        {/* Top Search Bar */}
        <header className="h-20 flex items-center px-8 justify-between border-b border-white/5">
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar música, artistas o álbumes..."
                className="w-full bg-surface-dark border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition duration-200"
              />
              <Search className="w-5 h-5 text-text-secondary absolute left-4 top-3" />
            </div>
          </form>
        </header>

        {/* Content Body */}
        <section className="flex-1 overflow-y-auto p-8">
          {loading && tracks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              <p className="text-sm text-text-secondary">Cargando...</p>
            </div>
          ) : (
            <>
              {/* Home View */}
              {activeTab === "home" && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Música en Tendencia</h2>
                    <p className="text-sm text-text-secondary mb-6">Los éxitos más escuchados del momento.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {TRENDING_MUSIC.map((track) => (
                        <div
                          key={track.id}
                          className={`group p-4 rounded-2xl transition duration-300 bg-surface-dark/50 hover:bg-surface-dark border border-transparent hover:border-white/10`}
                        >
                          <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-black/40">
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                              <button 
                                onClick={() => playTrack(track)}
                                className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow-lg hover:scale-105 transition"
                              >
                                <Play className="w-5 h-5 fill-current ml-1" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                              <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button 
                                onClick={() => toggleFavorite(track)}
                                className="p-1 text-text-secondary hover:text-brand-primary transition"
                              >
                                <Heart className={`w-4 h-4 ${isFavorite(track) ? "fill-brand-primary text-brand-primary" : ""}`} />
                              </button>
                              <button 
                                onClick={() => setShowAddToPlaylistModal(track)}
                                className="p-1 text-text-secondary hover:text-brand-primary transition"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Lanzamientos Recientes</h2>
                    <p className="text-sm text-text-secondary mb-6">Novedades discográficas recomendadas.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {NEW_RELEASES.map((track) => (
                        <div
                          key={track.id}
                          className="group p-4 rounded-2xl transition duration-300 bg-surface-dark/50 hover:bg-surface-dark border border-transparent hover:border-white/10"
                        >
                          <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-black/40">
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                              <button 
                                onClick={() => playTrack(track)}
                                className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow-lg hover:scale-105 transition"
                              >
                                <Play className="w-5 h-5 fill-current ml-1" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                              <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button 
                                onClick={() => toggleFavorite(track)}
                                className="p-1 text-text-secondary hover:text-brand-primary transition"
                              >
                                <Heart className={`w-4 h-4 ${isFavorite(track) ? "fill-brand-primary text-brand-primary" : ""}`} />
                              </button>
                              <button 
                                onClick={() => setShowAddToPlaylistModal(track)}
                                className="p-1 text-text-secondary hover:text-brand-primary transition"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Buscar (Resultados de Búsqueda) */}
              {activeTab === "buscar" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold tracking-tight">Resultados de Búsqueda</h2>
                  {tracks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {tracks.map((track) => (
                        <div
                          key={track.id}
                          className={`group p-4 rounded-2xl transition duration-300 bg-surface-dark/50 hover:bg-surface-dark border border-transparent hover:border-white/10 ${
                            currentTrack?.id === track.id ? "bg-brand-primary/10 border-brand-primary/20" : ""
                          }`}
                        >
                          <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-black/40">
                            <img
                              src={track.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300"}
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                              <button 
                                onClick={() => playTrack(track)}
                                className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow-lg hover:scale-105 transition"
                              >
                                <Play className="w-5 h-5 fill-current ml-1" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                              <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button 
                                onClick={() => toggleFavorite(track)}
                                className="p-1 text-text-secondary hover:text-brand-primary transition"
                              >
                                <Heart className={`w-4 h-4 ${isFavorite(track) ? "fill-brand-primary text-brand-primary" : ""}`} />
                              </button>
                              <button 
                                onClick={() => setShowAddToPlaylistModal(track)}
                                className="p-1 text-text-secondary hover:text-brand-primary transition"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                      <Music className="w-12 h-12 text-text-secondary mb-4 opacity-40" />
                      <p className="text-text-secondary text-sm">No hay resultados. Prueba ingresando una búsqueda arriba.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Biblioteca View */}
              {activeTab === "biblioteca" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Mi Biblioteca</h2>
                    <p className="text-sm text-text-secondary mb-6">Tu espacio personal de música.</p>
                  </div>

                  {/* Recently Played History */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-brand-primary" />
                      <h3 className="text-lg font-semibold">Historial de Reproducción</h3>
                    </div>
                    {history.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {history.map((track, i) => (
                          <div
                            key={`${track.id}-${i}`}
                            className="group p-4 rounded-2xl transition duration-300 bg-surface-dark/50 hover:bg-surface-dark border border-transparent hover:border-white/10"
                          >
                            <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-black/40">
                              <img
                                src={track.thumbnail}
                                alt={track.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                                <button 
                                  onClick={() => playTrack(track)}
                                  className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow-lg hover:scale-105 transition"
                                >
                                  <Play className="w-5 h-5 fill-current ml-1" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                                <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <p className="text-sm text-text-secondary">Aún no has reproducido ninguna canción.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Playlists View */}
              {activeTab === "playlists" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Mis Listas de Reproducción</h2>
                    <p className="text-sm text-text-secondary mb-6">Organiza tus canciones favoritas.</p>
                  </div>

                  {/* Create Playlist Form */}
                  <div className="flex gap-3 max-w-md">
                    <input
                      type="text"
                      placeholder="Nueva lista de reproducción..."
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="flex-1 bg-surface-dark border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary"
                    />
                    <button
                      onClick={createPlaylist}
                      className="px-5 py-2.5 rounded-xl bg-brand-primary text-bg-dark font-semibold text-sm hover:scale-105 transition active:scale-95"
                    >
                      Crear
                    </button>
                  </div>

                  {/* Playlists Display */}
                  {selectedPlaylistId ? (
                    // View Single Playlist
                    <div className="space-y-6">
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
                              <button
                                onClick={() => deletePlaylist(playlist.id)}
                                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/5 transition flex items-center gap-2 text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminr Lista
                              </button>
                            </div>

                            {playlist.tracks.length > 0 ? (
                              <div className="space-y-2">
                                {playlist.tracks.map((track, idx) => (
                                  <div 
                                    key={track.id}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <span className="text-xs text-text-secondary w-4 text-right">{idx + 1}</span>
                                      <img 
                                        src={track.thumbnail} 
                                        alt={track.title} 
                                        className="w-10 h-10 rounded-lg object-cover bg-black/40"
                                      />
                                      <div className="min-w-0">
                                        <p className="font-semibold text-sm truncate">{track.title}</p>
                                        <p className="text-xs text-text-secondary truncate">{track.artist}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button 
                                        onClick={() => playTrack(track)}
                                        className="p-2 bg-brand-primary rounded-full text-bg-dark hover:scale-105 transition"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      </button>
                                      <button 
                                        onClick={() => removeTrackFromPlaylist(track.id, playlist.id)}
                                        className="p-2 text-text-secondary hover:text-red-400 transition"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-text-secondary py-8 text-center bg-white/5 rounded-2xl border border-white/5">
                                Esta lista de reproducción está vacía. Añade canciones buscando o desde la pantalla de inicio.
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    // View List of Playlists
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePlaylist(playlist.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-red-400 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

              {/* Favoritos View */}
              {activeTab === "favoritos" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Mis Canciones Favoritas</h2>
                    <p className="text-sm text-text-secondary mb-6">Tu colección de temas preferidos.</p>
                  </div>

                  {favorites.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {favorites.map((track) => (
                        <div
                          key={track.id}
                          className="group p-4 rounded-2xl transition duration-300 bg-surface-dark/50 hover:bg-surface-dark border border-transparent hover:border-white/10"
                        >
                          <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-black/40">
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                              <button 
                                onClick={() => playTrack(track)}
                                className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow-lg hover:scale-105 transition"
                              >
                                <Play className="w-5 h-5 fill-current ml-1" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                              <p className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button 
                                onClick={() => toggleFavorite(track)}
                                className="p-1 text-brand-primary transition"
                              >
                                <Heart className="w-4 h-4 fill-brand-primary" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                      <Heart className="w-12 h-12 text-text-secondary mb-4 opacity-40" />
                      <p className="text-text-secondary text-sm">Aún no has marcado ninguna canción como favorita.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Player Bar */}
        <footer className="h-24 glass border-t border-white/5 px-8 flex items-center justify-between z-10">
          {/* Current track metadata */}
          <div className="w-1/3 flex items-center gap-4">
            {currentTrack ? (
              <>
                <img
                  src={currentTrack.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=100"}
                  alt={currentTrack.title}
                  className="w-14 h-14 rounded-lg object-cover bg-black/30 border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold truncate">{currentTrack.title}</h4>
                  <p className="text-xs text-text-secondary truncate mt-0.5">
                    {currentTrack.artist}
                  </p>
                </div>
                <button 
                  onClick={() => toggleFavorite(currentTrack)}
                  className="text-text-secondary hover:text-brand-primary p-2 rounded-lg hover:bg-white/5 transition"
                >
                  <Heart className={`w-5 h-5 ${isFavorite(currentTrack) ? "fill-brand-primary text-brand-primary" : ""}`} />
                </button>
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

          {/* Player controls & seeker */}
          <div className="w-1/3 flex flex-col items-center gap-2">
            <div className="flex items-center gap-5">
              <button
                onClick={playPrev}
                disabled={!currentTrack}
                className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition duration-150"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button
                onClick={togglePlay}
                disabled={!streamUrl || buffering}
                className="w-11 h-11 rounded-full bg-brand-primary text-bg-dark flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 transition duration-200"
              >
                {buffering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={playNext}
                disabled={!currentTrack}
                className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition duration-150"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] text-text-secondary w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={!streamUrl}
                className="flex-1 accent-brand-primary h-1 rounded-full bg-white/10 appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-text-secondary w-8 text-left">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume controls */}
          <div className="w-1/3 flex items-center justify-end gap-3">
            <Volume2 className="w-4 h-4 text-text-secondary" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-brand-secondary h-1 rounded-full bg-white/10 appearance-none cursor-pointer"
            />
          </div>
        </footer>
      </main>

      {/* Add To Playlist Modal */}
      {showAddToPlaylistModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass p-6 rounded-2xl max-w-sm w-full border border-white/10 shadow-2xl mx-4">
            <h3 className="text-lg font-bold mb-4">Añadir a lista de reproducción</h3>
            <p className="text-xs text-text-secondary mb-4 truncate">Añadir "{showAddToPlaylistModal.title}" a:</p>
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
                  onClick={() => {
                    setActiveTab("playlists");
                    setShowAddToPlaylistModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-bg-dark font-bold text-xs"
                >
                  Ir a Crear una
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
    </div>
  );
}

export default App;
