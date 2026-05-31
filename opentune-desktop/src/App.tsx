import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Play, Pause, SkipForward, SkipBack, Search, Music, Volume2, 
  ListMusic, Heart, Check, Loader2, Sparkles
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

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  
  // Audio playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [buffering, setBuffering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and sync volume
  useEffect(() => {
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
      
      const resultJson: string = await invoke("obtener_stream", { id: track.id });
      // The CLI returns a direct URL string inside quotes or plain text, or as a JSON object depending on opentune-core.
      // Let's try parsing it as JSON first; if it fails, treat it as a direct URL.
      let stream: string = resultJson;
      try {
        const parsed = JSON.parse(resultJson);
        if (parsed.streamUrl) stream = parsed.streamUrl;
        else if (parsed.url) stream = parsed.url;
      } catch {
        // Safe fallback: clean quotes if KSerializer serialized it as string
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
    
    setLoading(true);
    try {
      const responseJson: string = await invoke("buscar_cancion", { query });
      const data = JSON.parse(responseJson);
      
      // Expected structure: list/array of tracks
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
      <aside className="w-64 glass flex flex-col justify-between p-6 border-r border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-tertiary flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <Sparkles className="w-5 h-5 text-bg-dark" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-primary to-brand-tertiary bg-clip-text text-transparent">
                OpenTune
              </h1>
              <p className="text-[10px] text-text-secondary tracking-widest uppercase">Desktop Core</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-brand-primary font-medium transition duration-200">
              <Music className="w-5 h-5" />
              <span>Explorar</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-text-secondary hover:text-text-primary transition duration-200">
              <ListMusic className="w-5 h-5" />
              <span>Playlists</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-text-secondary hover:text-text-primary transition duration-200">
              <Heart className="w-5 h-5" />
              <span>Favoritos</span>
            </button>
          </nav>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-xs text-brand-secondary font-medium mb-1">Motor Nativo</p>
          <div className="flex items-center gap-2 text-[10px] text-text-secondary">
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span>GraalVM Kotlin CLI</span>
          </div>
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
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-text-secondary">Conectado a</p>
              <p className="text-xs font-semibold text-brand-tertiary">InnerTube API</p>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <section className="flex-1 overflow-y-auto p-8">
          {loading && tracks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              <p className="text-sm text-text-secondary">Buscando en YouTube Music...</p>
            </div>
          ) : tracks.length > 0 ? (
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-6">Resultados de Búsqueda</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`group p-4 rounded-2xl transition duration-300 cursor-pointer ${
                      currentTrack?.id === track.id 
                        ? "bg-brand-primary/10 border border-brand-primary/20" 
                        : "bg-surface-dark/50 hover:bg-surface-dark border border-transparent hover:border-white/10"
                    }`}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-black/40">
                      <img
                        src={track.thumbnail || "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300"}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                        <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-bg-dark shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-1" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                    <p className="text-xs text-text-secondary truncate mt-1">
                      {track.artist}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                <Music className="w-8 h-8 text-brand-secondary" />
              </div>
              <h3 className="text-lg font-semibold">Tu música nativa hoy</h3>
              <p className="text-xs text-text-secondary mt-2">
                Ingresa el nombre de una canción o artista arriba y disfruta de streaming multimedia superveloz directamente a tu tarjeta de sonido.
              </p>
            </div>
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
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate">{currentTrack.title}</h4>
                  <p className="text-xs text-text-secondary truncate mt-0.5">
                    {currentTrack.artist}
                  </p>
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
    </div>
  );
}

export default App;
