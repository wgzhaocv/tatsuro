// Offline-cache bookkeeping in IndexedDB (survives SW restarts, which in-memory
// maps don't). Two stores:
//   - "access-times": LRU last-access per auto-cache URL (ported from the old
//     site's sw/lru-cache), read by evictAutoLru.
//   - "entries": size + bucket per cached audio URL, written at every cache
//     mutation, so the More page reads totals from here instead of opening every
//     cached Response (which OOM-reloads mobile Safari on a big cache).
// Every helper swallows failures — this is best-effort; playback and the size
// readout must never break because of it.

import { canonicalStreamUrl } from "./constants";

const DB_NAME = "audio-cache-lru";
const STORE_NAME = "access-times";
const ENTRIES_STORE = "entries";
const DB_VERSION = 2;

/** One cached audio entry's metadata (both audio buckets). */
export type CacheEntry = {
  url: string;
  bucket: "auto" | "download";
  bytes: number;
};

// One shared connection: setAccessTime fires on every cache hit and eviction
// deletes in a loop — opening per call would churn connections.
let dbPromise: Promise<IDBDatabase> | null = null;

function initDB(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
        db.createObjectStore(ENTRIES_STORE, { keyPath: "url" });
      }
    };
  });
  return dbPromise;
}

// ── Entry metadata (size + bucket per URL) ──────────────────────────────────

/** Record (or update) one cached audio entry. Key is the canonical URL, so a
 *  demote/promote that changes an entry's bucket just overwrites in place. */
export async function putEntry(entry: CacheEntry): Promise<void> {
  try {
    const db = await initDB();
    db.transaction([ENTRIES_STORE], "readwrite")
      .objectStore(ENTRIES_STORE)
      .put({ ...entry, url: canonicalStreamUrl(entry.url) });
  } catch {
    // best-effort
  }
}

/** Forget one entry (on delete / eviction). */
export async function deleteEntry(url: string): Promise<void> {
  try {
    const db = await initDB();
    db.transaction([ENTRIES_STORE], "readwrite")
      .objectStore(ENTRIES_STORE)
      .delete(canonicalStreamUrl(url));
  } catch {
    // best-effort
  }
}

/** All recorded entries — the More page's size source (no cache.match). */
export async function getAllEntries(): Promise<CacheEntry[]> {
  try {
    const db = await initDB();
    const store = db
      .transaction([ENTRIES_STORE], "readonly")
      .objectStore(ENTRIES_STORE);
    return await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as CacheEntry[]) || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/** Drop every entry in a bucket (whole-bucket clear). */
export async function deleteEntriesByBucket(
  bucket: CacheEntry["bucket"],
): Promise<void> {
  try {
    const entries = await getAllEntries();
    const db = await initDB();
    const store = db
      .transaction([ENTRIES_STORE], "readwrite")
      .objectStore(ENTRIES_STORE);
    for (const e of entries) if (e.bucket === bucket) store.delete(e.url);
  } catch {
    // best-effort
  }
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

/** Wipe every access-time row — used when the whole audio cache is cleared from
 *  the More page, so no stale LRU bookkeeping outlives the bytes it tracked. */
export async function clearAllAccessTimes(): Promise<void> {
  try {
    const db = await initDB();
    db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME).clear();
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
