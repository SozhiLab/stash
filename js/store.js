// In-memory state + actions. UI reads `state` and calls actions; persistence goes through `repository`.
import { repository } from './data/repository.js';
import { DEFAULT_FOLDERS } from './data/defaults.js';
import { uid } from './lib/id.js';
import { detectKind, mimeOf, prepareImage, toneOfBlob } from './lib/image.js';

export const state = { ready: false, folders: [], elements: [] };

const subs = new Set();
export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
function notify() {
  subs.forEach((fn) => fn());
}

// Object URLs for thumbnails, cached per element
const thumbUrls = new Map();
export function thumbUrl(el) {
  let url = thumbUrls.get(el.id);
  if (!url && el.thumb) {
    url = URL.createObjectURL(el.thumb);
    thumbUrls.set(el.id, url);
  }
  return url || '';
}
function dropThumbUrl(id) {
  const url = thumbUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  thumbUrls.delete(id);
}

const byOrder = (a, b) => a.order - b.order;

// ---------- selectors ----------
export const getFolder = (id) => state.folders.find((f) => f.id === id);
export const getElement = (id) => state.elements.find((e) => e.id === id);
export const elementsIn = (folderId) =>
  state.elements.filter((e) => e.folderId === folderId).sort(byOrder);
export const favorites = () => state.elements.filter((e) => e.favorite).sort(byOrder);
export const recent = (limit = 40) =>
  state.elements
    .filter((e) => e.lastUsedAt)
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, limit);

export function groupByFolder() {
  const map = new Map();
  for (const el of [...state.elements].sort(byOrder)) {
    if (!map.has(el.folderId)) map.set(el.folderId, []);
    map.get(el.folderId).push(el);
  }
  return map;
}

function nextTopOrder(folderId) {
  const orders = state.elements.filter((e) => e.folderId === folderId).map((e) => e.order);
  return orders.length ? Math.min(...orders) - 1 : 0;
}

// ---------- lifecycle ----------
export async function init() {
  repository.requestPersistence();
  let { folders, elements } = await repository.loadAll();
  if (!(await repository.isSeeded())) {
    if (!folders.length) {
      folders = DEFAULT_FOLDERS.map((f, i) => ({ id: uid(), order: i, createdAt: Date.now(), ...f }));
      await repository.saveFolders(folders);
    }
    await repository.markSeeded();
  }
  state.folders = folders.sort(byOrder);
  state.elements = elements;
  state.ready = true;
  notify();
  backfillTones();
}

// Elements added before backdrop tones existed get one computed from their thumbnail
async function backfillTones() {
  const todo = state.elements.filter((e) => !e.tone);
  if (!todo.length) return;
  for (const el of todo) {
    try {
      el.tone = await toneOfBlob(el.thumb);
    } catch (e) {
      el.tone = 'light';
    }
    repository.saveElement(el).catch(() => {});
  }
  notify();
}

// ---------- folders ----------
export async function createFolder({ name, emoji, hue }) {
  const order = state.folders.length ? Math.max(...state.folders.map((f) => f.order)) + 1 : 0;
  const folder = { id: uid(), name: name.trim(), emoji, hue, order, createdAt: Date.now() };
  await repository.saveFolder(folder);
  state.folders.push(folder);
  notify();
  return folder;
}

export async function updateFolder(id, patch) {
  const folder = getFolder(id);
  if (!folder) return;
  Object.assign(folder, patch);
  await repository.saveFolder(folder);
  notify();
}

export async function removeFolder(id) {
  const ids = state.elements.filter((e) => e.folderId === id).map((e) => e.id);
  await repository.deleteFolder(id, ids);
  ids.forEach(dropThumbUrl);
  state.elements = state.elements.filter((e) => e.folderId !== id);
  state.folders = state.folders.filter((f) => f.id !== id);
  notify();
}

export async function moveFolder(id, dir) {
  const i = state.folders.findIndex((f) => f.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.folders.length) return;
  [state.folders[i], state.folders[j]] = [state.folders[j], state.folders[i]];
  state.folders.forEach((f, idx) => (f.order = idx));
  await repository.saveFolders(state.folders);
  notify();
}

// ---------- restore from backup ----------
// Returns how many folders were created (existing ids are kept untouched)
export async function importFolders(list) {
  const base = state.folders.length ? Math.max(...state.folders.map((f) => f.order)) + 1 : 0;
  const fresh = list
    .filter((f) => f && f.id && !getFolder(f.id))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const [i, f] of fresh.entries()) {
    const folder = {
      id: String(f.id),
      name: String(f.name || 'Папка'),
      emoji: f.emoji || '📁',
      hue: Number.isFinite(f.hue) ? f.hue : 265,
      order: base + i,
      createdAt: f.createdAt || Date.now(),
    };
    await repository.saveFolder(folder);
    state.folders.push(folder);
  }
  notify();
  return fresh.length;
}

// Returns true when added, false when an element with this id already exists
export async function importElement(meta, source) {
  if (!meta || getElement(meta.id) || !getFolder(meta.folderId)) return false;
  const kind = ['png', 'jpg', 'webp', 'svg', 'gif'].includes(meta.kind) ? meta.kind : null;
  if (!kind) throw new Error('unsupported type');
  const { blob, thumb, width, height, tone } = await prepareImage(source, kind);
  const el = {
    id: String(meta.id),
    folderId: meta.folderId,
    name: String(meta.name || 'Без названия'),
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    kind,
    mime: mimeOf(kind),
    size: blob.size,
    width,
    height,
    tone,
    thumb,
    favorite: !!meta.favorite,
    lastUsedAt: meta.lastUsedAt || null,
    useCount: meta.useCount || 0,
    order: Number.isFinite(meta.order) ? meta.order : nextTopOrder(meta.folderId),
    createdAt: meta.createdAt || Date.now(),
  };
  await repository.saveElement(el, blob);
  state.elements.push(el);
  return true;
}

// Re-render subscribers after a batch of silent changes
export function refreshViews() {
  notify();
}

// ---------- elements ----------
// items: [{ file, name, tags, folderId }]
export async function addElements(items, onProgress) {
  let done = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const kind = detectKind(item.file);
      if (!kind) throw new Error('unsupported type');
      const { blob, thumb, width, height, tone } = await prepareImage(item.file, kind);
      const el = {
        id: uid(),
        folderId: item.folderId,
        name: item.name.trim() || 'Без названия',
        tags: item.tags || [],
        kind,
        mime: mimeOf(kind),
        size: blob.size,
        width,
        height,
        tone,
        thumb,
        favorite: false,
        lastUsedAt: null,
        useCount: 0,
        order: nextTopOrder(item.folderId),
        createdAt: Date.now(),
      };
      await repository.saveElement(el, blob);
      state.elements.push(el);
    } catch (e) {
      failed++;
      console.warn('Upload failed', e);
    }
    done++;
    if (onProgress) onProgress(done, items.length);
  }
  notify();
  return { added: items.length - failed, failed };
}

export async function updateElement(id, patch) {
  const el = getElement(id);
  if (!el) return;
  Object.assign(el, patch);
  await repository.saveElement(el);
  notify();
}

export function moveElement(id, folderId) {
  return updateElement(id, { folderId, order: nextTopOrder(folderId) });
}

export function toggleFavorite(id) {
  const el = getElement(id);
  return el ? updateElement(id, { favorite: !el.favorite }) : undefined;
}

export async function removeElement(id) {
  await repository.deleteElement(id);
  dropThumbUrl(id);
  state.elements = state.elements.filter((e) => e.id !== id);
  notify();
}

export async function clearRecent() {
  for (const el of state.elements.filter((e) => e.lastUsedAt)) {
    el.lastUsedAt = null;
    await repository.saveElement(el);
  }
  notify();
}

// Silent on purpose: no re-render while the user is tapping through cards
export function markUsed(id) {
  const el = getElement(id);
  if (!el) return;
  el.lastUsedAt = Date.now();
  el.useCount = (el.useCount || 0) + 1;
  repository.saveElement(el).catch(() => {});
}

export function getBlob(id) {
  return repository.getBlob(id);
}
