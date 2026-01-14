import {
  DB_NAME,
  STORE_NAME,
  DB_VERSION,
  CACHE_TTL_MS,
} from "@/constants/cache";
import type { CachedEntry } from "@/types/cache";

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });

  return dbPromise;
};

export const getCachedVideoBlob = async (
  key: string,
  expectedEtag?: string,
): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const result = request.result as CachedEntry | undefined;
        if (!result) {
          resolve(null);
          return;
        }

        const isExpired = Date.now() - result.cachedAt > CACHE_TTL_MS;
        // Invalidate if expired OR if etag doesn't match (video was re-uploaded)
        const etagMismatch = expectedEtag && result.etag !== expectedEtag;
        if (isExpired || etagMismatch) {
          // Clean up stale entry in background
          const deleteTx = db.transaction(STORE_NAME, "readwrite");
          deleteTx.objectStore(STORE_NAME).delete(key);
          resolve(null);
          return;
        }

        resolve(URL.createObjectURL(result.blob));
      };
    });
  } catch {
    return null;
  }
};

export const cacheVideoBlob = async (
  key: string,
  blob: Blob,
  etag?: string,
): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const entry: CachedEntry = { key, blob, cachedAt: Date.now(), etag };
      const request = store.put(entry);

      request.onerror = () => resolve();
      request.onsuccess = () => resolve();
    });
  } catch {
    // Silently fail - caching is best-effort
  }
};

export const fetchAndCacheVideo = async (
  key: string,
  url: string,
  etag?: string,
): Promise<string> => {
  // Check cache first - pass etag for validation
  const cached = await getCachedVideoBlob(key, etag);
  if (cached) return cached;

  // Fetch video
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status}`);
  }

  const blob = await response.blob();

  // Cache in background with etag (don't await)
  void cacheVideoBlob(key, blob, etag);

  return URL.createObjectURL(blob);
};
