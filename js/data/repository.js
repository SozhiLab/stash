// Persistence boundary. The rest of the app only talks to this object.
// To add cloud sync later (Supabase, Cloudflare R2 + D1...), replace this file's internals.
import { dbGetAll, dbGet, dbPut, dbDelete, dbClearAll, dbBatch } from './db.js';

export const repository = {
  async loadAll() {
    const [folders, elements] = await Promise.all([dbGetAll('folders'), dbGetAll('elements')]);
    return { folders, elements };
  },

  async isSeeded() {
    return !!(await dbGet('meta', 'seeded'));
  },
  markSeeded() {
    return dbPut('meta', { key: 'seeded', value: true });
  },

  // App settings (background photo, its visibility...) live in the meta store
  async getSetting(name) {
    const row = await dbGet('meta', `setting:${name}`);
    return row ? row.value : null;
  },
  saveSetting(name, value) {
    return dbPut('meta', { key: `setting:${name}`, value });
  },
  deleteSetting(name) {
    return dbDelete('meta', `setting:${name}`);
  },

  saveFolder(folder) {
    return dbPut('folders', folder);
  },
  saveFolders(list) {
    return dbBatch(['folders'], (s) => list.forEach((f) => s.folders.put(f)));
  },
  deleteFolder(id, elementIds) {
    return dbBatch(['folders', 'elements', 'blobs'], (s) => {
      s.folders.delete(id);
      elementIds.forEach((eid) => {
        s.elements.delete(eid);
        s.blobs.delete(eid);
      });
    });
  },

  // blob is optional: pass it when creating, omit it when only metadata changed
  saveElement(element, blob) {
    if (!blob) return dbPut('elements', element);
    return dbBatch(['elements', 'blobs'], (s) => {
      s.elements.put(element);
      s.blobs.put({ id: element.id, blob });
    });
  },
  deleteElement(id) {
    return dbBatch(['elements', 'blobs'], (s) => {
      s.elements.delete(id);
      s.blobs.delete(id);
    });
  },
  async getBlob(id) {
    const row = await dbGet('blobs', id);
    return row ? row.blob : null;
  },

  clearAll() {
    return dbClearAll();
  },

  async requestPersistence() {
    try {
      return navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false;
    } catch (e) {
      return false;
    }
  },
};
