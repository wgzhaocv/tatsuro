// LRU bookkeeping for the audio cache: last-access times persisted in
// IndexedDB (survives SW restarts, which in-memory maps don't). Ported from
// the old site's sw/lru-cache. Every helper swallows failures — LRU accuracy
// is best-effort, playback must never break because of it.

const DB_NAME = "audio-cache-lru";
const STORE_NAME = "access-times";

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
  });
}

export async function setAccessTime(
  url: string,
  accessTime: number,
): Promise<void> {
  try {
    const db = await initDB();
    db.transaction([STORE_NAME], "readwrite")
      .objectStore(STORE_NAME)
      .put({ url, accessTime });
  } catch {
    // best-effort
  }
}

export async function deleteAccessTime(url: string): Promise<void> {
  try {
    const db = await initDB();
    db.transaction([STORE_NAME], "readwrite")
      .objectStore(STORE_NAME)
      .delete(url);
  } catch {
    // best-effort
  }
}

export async function getAllAccessTimes(): Promise<
  { url: string; accessTime: number }[]
> {
  try {
    const db = await initDB();
    const store = db
      .transaction([STORE_NAME], "readonly")
      .objectStore(STORE_NAME);
    return await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
