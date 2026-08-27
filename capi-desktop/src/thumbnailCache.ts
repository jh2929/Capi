const DB_NAME = "capi_thumbnail_cache";
const DB_VERSION = 1;
const TTL_MS = 60 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  trackId: string;
  blob: Blob;
  cachedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("thumbnails")) {
        db.createObjectStore("thumbnails", { keyPath: "trackId" });
      }
    };
  });
}

export async function getCachedThumbnail(trackId: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("thumbnails", "readonly");
      const store = tx.objectStore("thumbnails");
      const req = store.get(trackId);
      req.onsuccess = () => {
        const entry: CacheEntry | undefined = req.result;
        if (!entry) { resolve(null); return; }
        if (Date.now() - entry.cachedAt > TTL_MS) {
          store.delete(trackId);
          resolve(null);
          return;
        }
        resolve(URL.createObjectURL(entry.blob));
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedThumbnail(trackId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("thumbnails", "readwrite");
    const store = tx.objectStore("thumbnails");
    store.put({ trackId, blob, cachedAt: Date.now() });
  } catch {
    // silent
  }
}

export async function cleanExpiredThumbnails(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("thumbnails", "readwrite");
    const store = tx.objectStore("thumbnails");
    const req = store.getAll();
    req.onsuccess = () => {
      const entries: CacheEntry[] = req.result || [];
      const now = Date.now();
      for (const entry of entries) {
        if (now - entry.cachedAt > TTL_MS) {
          store.delete(entry.trackId);
        }
      }
    };
  } catch {
    // silent
  }
}
