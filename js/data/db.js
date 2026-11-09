// Thin IndexedDB wrapper. Stores: folders, elements (metadata + thumb), blobs (originals), meta.
const DB_NAME = 'stash';
const DB_VERSION = 1;
let dbPromise = null;

export function dbOpen() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('folders', { keyPath: 'id' });
        const els = db.createObjectStore('elements', { keyPath: 'id' });
        els.createIndex('folderId', 'folderId');
        db.createObjectStore('blobs', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function dbWrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll(store) {
  const db = await dbOpen();
  return dbWrap(db.transaction(store, 'readonly').objectStore(store).getAll());
}

export async function dbGet(store, key) {
  const db = await dbOpen();
  return dbWrap(db.transaction(store, 'readonly').objectStore(store).get(key));
}

export async function dbPut(store, value) {
  const db = await dbOpen();
  return dbWrap(db.transaction(store, 'readwrite').objectStore(store).put(value));
}

export async function dbDelete(store, key) {
  const db = await dbOpen();
  return dbWrap(db.transaction(store, 'readwrite').objectStore(store).delete(key));
}

// Several writes in one atomic transaction. fn receives { storeName: objectStore }.
export async function dbBatch(storeNames, fn) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    const stores = Object.fromEntries(storeNames.map((n) => [n, tx.objectStore(n)]));
    try {
      fn(stores);
    } catch (e) {
      tx.abort();
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
