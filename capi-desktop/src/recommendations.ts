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

export interface ArtistAffinity {
  artistName: string;
  playCount: number;
  lastPlayed: number;
  artistId?: string;
  thumbnail?: string;
}

const DB_NAME = "capi_stats";
const DB_VERSION = 1;

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
}): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(["play_events", "artist_affinity"], "readwrite");
    const playStore = tx.objectStore("play_events");
    const affinityStore = tx.objectStore("artist_affinity");

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

    // Update artist affinity
    // Split combined artist names (e.g. "Artist A, Artist B") to track them individually
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
          // Use track thumbnail as fallback for artist profile pic
          data.thumbnail = track.thumbnail;
        }
        affinityStore.put(data);
      };
    }
  } catch (err) {
    console.error("Failed to record play event in IndexedDB:", err);
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
        // Sort by playCount desc
        list.sort((a, b) => b.playCount - a.playCount);
        resolve(list.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to get top artists:", err);
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

    // Sort by a combination of playCount and recency
    const now = Date.now();
    const scored = allArtists.map(item => {
      const hoursSincePlayed = (now - item.lastPlayed) / (1000 * 60 * 60);
      // Recency decay factor: half life of 48 hours
      const recencyWeight = Math.exp(-hoursSincePlayed / 48);
      const score = item.playCount * (0.5 + 0.5 * recencyWeight);
      return { artistName: item.artistName, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Pick top 3 artists to build query mixes
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
