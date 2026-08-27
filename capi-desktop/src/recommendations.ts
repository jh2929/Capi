export interface PlayEvent {
  id?: number;
  trackId: string;
  title: string;
  artist: string;
  album: string;
  thumbnail: string;
  timestamp: number;
  artistId?: string;
}

export interface TrackAffinity {
  trackId: string;
  playCount: number;
  lastPlayed: number;
  totalListenedMs: number;
  title: string;
  artist: string;
  artistId: string;
  thumbnail: string;
}

export interface ArtistAffinity {
  artistName: string;
  playCount: number;
  lastPlayed: number;
  artistId?: string;
  thumbnail?: string;
}

const DB_NAME = "capi_stats";
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("play_events")) {
        db.createObjectStore("play_events", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("artist_affinity")) {
        db.createObjectStore("artist_affinity", { keyPath: "artistName" });
      }
      if (!db.objectStoreNames.contains("track_affinity")) {
        const store = db.createObjectStore("track_affinity", { keyPath: "trackId" });
        store.createIndex("lastPlayed", "lastPlayed", { unique: false });
        store.createIndex("playCount", "playCount", { unique: false });
      }
      if (!db.objectStoreNames.contains("track_cache")) {
        const store = db.createObjectStore("track_cache", { keyPath: "id" });
        store.createIndex("artist", "artist", { unique: false });
      }
    };
  });
}

export async function recordPlayEvent(track: {
  id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail: string;
  artistId?: string;
}, listenedMs?: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(["play_events", "artist_affinity", "track_affinity", "track_cache"], "readwrite");
    const playStore = tx.objectStore("play_events");
    const affinityStore = tx.objectStore("artist_affinity");
    const trackAffStore = tx.objectStore("track_affinity");
    const trackCacheStore = tx.objectStore("track_cache");

    const timestamp = Date.now();
    const event: PlayEvent = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || "",
      thumbnail: track.thumbnail,
      timestamp,
      artistId: track.artistId
    };
    playStore.add(event);

    // Cache track metadata
    trackCacheStore.put({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || "",
      duration: 0,
      thumbnail: track.thumbnail,
      explicit: false,
      artistId: track.artistId,
    });

    // Update artist affinity
    const primaryArtist = track.artist.split(",")[0].trim();
    if (primaryArtist && primaryArtist !== "Artista Desconocido") {
      const getReq = affinityStore.get(primaryArtist);
      getReq.onsuccess = () => {
        const data: ArtistAffinity = getReq.result || {
          artistName: primaryArtist,
          playCount: 0,
          lastPlayed: 0
        };
        data.playCount += 1;
        data.lastPlayed = timestamp;
        if (track.artistId) {
          data.artistId = track.artistId.split(",")[0].trim();
        }
        if (track.thumbnail) {
          data.thumbnail = track.thumbnail;
        }
        affinityStore.put(data);
      };
    }

    // Update track affinity
    const getTrackReq = trackAffStore.get(track.id);
    getTrackReq.onsuccess = () => {
      const data: TrackAffinity = getTrackReq.result || {
        trackId: track.id,
        playCount: 0,
        lastPlayed: 0,
        totalListenedMs: 0,
        title: track.title,
        artist: track.artist,
        artistId: track.artistId || "",
        thumbnail: track.thumbnail,
      };
      data.playCount += 1;
      data.lastPlayed = timestamp;
      data.title = track.title;
      data.artist = track.artist;
      data.artistId = track.artistId || "";
      data.thumbnail = track.thumbnail;
      if (listenedMs !== undefined) {
        data.totalListenedMs += listenedMs;
      }
      trackAffStore.put(data);
    };
  } catch (err) {
    console.error("Failed to record play event in IndexedDB:", err);
  }
}

export async function addListenedTime(trackId: string, ms: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("track_affinity", "readwrite");
    const store = tx.objectStore("track_affinity");
    const req = store.get(trackId);
    req.onsuccess = () => {
      const data: TrackAffinity | undefined = req.result;
      if (data) {
        data.totalListenedMs = (data.totalListenedMs || 0) + ms;
        store.put(data);
      }
    };
  } catch (err) {
    console.error("Failed to add listened time:", err);
  }
}

export async function getTopArtistsFromDB(limit = 10): Promise<ArtistAffinity[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("artist_affinity", "readonly");
      const store = tx.objectStore("artist_affinity");
      const request = store.getAll();

      request.onsuccess = () => {
        const list: ArtistAffinity[] = request.result || [];
        const now = Date.now();
        list.sort((a, b) => {
          const hoursA = (now - a.lastPlayed) / (1000 * 60 * 60);
          const hoursB = (now - b.lastPlayed) / (1000 * 60 * 60);
          const recencyA = Math.exp(-hoursA / 72);
          const recencyB = Math.exp(-hoursB / 72);
          const scoreA = a.playCount * (0.5 + 0.5 * recencyA);
          const scoreB = b.playCount * (0.5 + 0.5 * recencyB);
          return scoreB - scoreA;
        });
        resolve(list.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to get top artists:", err);
    return [];
  }
}

export async function getCachedTracksByArtist(artist: string, limit = 8): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("track_cache", "readonly");
      const store = tx.objectStore("track_cache");
      const index = store.index("artist");
      const req = index.getAll(artist);
      req.onsuccess = () => {
        const results = (req.result || []).slice(0, limit);
        resolve(results);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

function getTrackScore(track: TrackAffinity): number {
  const now = Date.now();
  const hoursSincePlayed = (now - track.lastPlayed) / (1000 * 60 * 60);
  const recencyWeight = Math.exp(-hoursSincePlayed / 72);
  const completionRatio = track.totalListenedMs > 0
    ? Math.min(1, track.totalListenedMs / (track.playCount * 60000))
    : 0.5;
  return track.playCount * (0.5 + 0.5 * recencyWeight) * (0.4 + 0.6 * completionRatio);
}

export async function getTopTracksFromDB(limit = 12): Promise<TrackAffinity[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("track_affinity", "readonly");
      const store = tx.objectStore("track_affinity");
      const request = store.getAll();

      request.onsuccess = () => {
        const list: TrackAffinity[] = request.result || [];
        list.sort((a, b) => getTrackScore(b) - getTrackScore(a));
        resolve(list.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to get top tracks:", err);
    return [];
  }
}

export async function getRecentTracksFromDB(limit = 12): Promise<PlayEvent[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("play_events", "readonly");
      const store = tx.objectStore("play_events");
      const request = store.getAll();

      request.onsuccess = () => {
        const events: PlayEvent[] = request.result || [];
        events.sort((a, b) => b.timestamp - a.timestamp);
        const seen = new Set<string>();
        const unique: PlayEvent[] = [];
        for (const e of events) {
          if (!seen.has(e.trackId)) {
            seen.add(e.trackId);
            unique.push(e);
            if (unique.length >= limit) break;
          }
        }
        resolve(unique);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to get recent tracks:", err);
    return [];
  }
}

export async function getRecommendationQueries(minTotalPlays = 20): Promise<string[]> {
  try {
    const allArtists = await getTopArtistsFromDB(10);
    if (allArtists.length === 0) return [];

    const totalPlays = allArtists.reduce((sum, item) => sum + item.playCount, 0);
    if (totalPlays < minTotalPlays) {
      console.log(`[Recs] Total plays (${totalPlays}) is below threshold (${minTotalPlays}). Using fallback recommendations.`);
      return [];
    }

    const now = Date.now();
    const scored = allArtists.map(item => {
      const hoursSincePlayed = (now - item.lastPlayed) / (1000 * 60 * 60);
      const recencyWeight = Math.exp(-hoursSincePlayed / 48);
      const score = item.playCount * (0.5 + 0.5 * recencyWeight);
      return { artistName: item.artistName, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3).map(item => item.artistName);
    const queries: string[] = [];
    top3.forEach(artist => {
      queries.push(`${artist} mix`);
      queries.push(`${artist} radio`);
    });

    return queries;
  } catch (err) {
    console.error("Failed to generate recommendation queries:", err);
    return [];
  }
}

export interface HomeSection {
  id: string;
  title: string;
  type: "favorites" | "recent" | "artist_tracks" | "discover";
  items: any[];
}

export async function getPersonalizedHomeSections(buscarCancion: (query: string) => Promise<any[]>): Promise<HomeSection[]> {
  const sections: HomeSection[] = [];

  try {
    // 1. Favorite tracks
    const topTracks = await getTopTracksFromDB(10);
    if (topTracks.length >= 3) {
      sections.push({
        id: "favorites",
        title: "Tus favoritos",
        type: "favorites",
        items: topTracks.map(t => ({
          id: t.trackId,
          title: t.title,
          artists: [{ name: t.artist, id: t.artistId }],
          thumbnail: t.thumbnail,
          album: "",
          duration: 0,
          explicit: false,
        })),
      });
    }

    // 2. Recently played
    const recent = await getRecentTracksFromDB(10);
    if (recent.length >= 3) {
      sections.push({
        id: "recent",
        title: "Escuchados recientemente",
        type: "recent",
        items: recent.map(e => ({
          id: e.trackId,
          title: e.title,
          artists: [{ name: e.artist, id: e.artistId }],
          thumbnail: e.thumbnail,
          album: e.album,
          duration: 0,
          explicit: false,
        })),
      });
    }

    // 3. Top artist track searches (fill remaining space with relevant content)
    const topArtists = await getTopArtistsFromDB(6);
    for (const artist of topArtists.slice(0, 4)) {
      const cached = await getCachedTracksByArtist(artist.artistName, 6);
      if (cached.length >= 3) {
        sections.push({
          id: `artist-${artist.artistName}`,
          title: artist.artistName,
          type: "artist_tracks",
          items: cached,
        });
        continue;
      }
      // Search YouTube for this artist's tracks
      try {
        const results = await buscarCancion(`${artist.artistName} - topic`);
        if (results.length >= 3) {
          sections.push({
            id: `artist-${artist.artistName}`,
            title: artist.artistName,
            type: "artist_tracks",
            items: results.slice(0, 6),
          });
        }
      } catch {
        // skip failed artist search
      }
    }
  } catch (err) {
    console.error("Failed to generate personalized home sections:", err);
  }

  return sections;
}
