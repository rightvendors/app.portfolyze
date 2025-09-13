// Simple IndexedDB helper for storing holdings snapshots

export interface HoldingsSnapshot<T> {
  data: T;
  savedAt: number;
}

const DB_NAME = 'portfolyze';
const STORE_NAME = 'holdingsSnapshots';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHoldingsSnapshot<T>(key: string, snapshot: HoldingsSnapshot<T>): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snapshot, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // Swallow errors; fallback to localStorage will still work
    console.warn('IndexedDB saveHoldingsSnapshot failed', e);
  }
}

export async function loadHoldingsSnapshot<T>(key: string): Promise<HoldingsSnapshot<T> | null> {
  try {
    const db = await openDB();
    return await new Promise<HoldingsSnapshot<T> | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as HoldingsSnapshot<T>) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('IndexedDB loadHoldingsSnapshot failed', e);
    return null;
  }
}


