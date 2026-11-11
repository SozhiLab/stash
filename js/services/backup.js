// Backup = a ZIP with the user's files in folders (openable on a computer) plus stash.json
// with everything needed to restore the library on another device.
import { state, getBlob, importFolders, importElement, refreshViews } from '../store.js';
import { zipCreate, zipRead } from '../lib/zip.js';
import { mimeOf } from '../lib/image.js';
import { getBackgroundState, restoreBackgroundBlob } from './background.js';

const BACKUP_APP = 'shtuki';
const BACKUP_META = 'stash.json';
const BACKUP_BG = '_settings/background.jpg';
const EXT_BY_KIND = { png: 'png', jpg: 'jpg', webp: 'webp', svg: 'svg', gif: 'gif' };

function cleanName(value, fallback) {
  const t = String(value || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return t || fallback;
}

function uniqueName(used, base, ext = '') {
  let name = base + ext;
  let i = 2;
  while (used.has(name.toLowerCase())) name = `${base} (${i++})${ext}`;
  used.add(name.toLowerCase());
  return name;
}

export function backupFileName(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `shtuki-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.zip`;
}

export async function createBackup(onProgress) {
  const folders = [...state.folders].sort((a, b) => a.order - b.order);
  const dirs = new Map();
  const usedDirs = new Set();
  folders.forEach((f) => dirs.set(f.id, uniqueName(usedDirs, cleanName(f.name, 'Папка'))));
  const usedFiles = new Map(folders.map((f) => [f.id, new Set()]));

  const files = [];
  const elements = [];
  for (const el of state.elements) {
    const dir = dirs.get(el.folderId);
    const blob = dir ? await getBlob(el.id) : null;
    if (!blob) continue;
    const path = `${dir}/${uniqueName(usedFiles.get(el.folderId), cleanName(el.name, 'Элемент'), '.' + EXT_BY_KIND[el.kind])}`;
    files.push({ name: path, data: blob });
    elements.push({
      id: el.id,
      folderId: el.folderId,
      name: el.name,
      tags: el.tags || [],
      kind: el.kind,
      favorite: !!el.favorite,
      lastUsedAt: el.lastUsedAt || null,
      useCount: el.useCount || 0,
      order: el.order,
      createdAt: el.createdAt,
      file: path,
    });
  }

  const settings = {};
  const bg = getBackgroundState();
  if (bg.blob) {
    files.push({ name: BACKUP_BG, data: bg.blob });
    settings.background = BACKUP_BG;
    settings.backgroundVisibility = bg.visibility;
  }

  const meta = {
    app: BACKUP_APP,
    version: 1,
    createdAt: Date.now(),
    folders: folders.map((f) => ({ id: f.id, name: f.name, emoji: f.emoji, hue: f.hue, order: f.order, createdAt: f.createdAt })),
    elements,
    settings,
  };
  files.unshift({ name: BACKUP_META, data: JSON.stringify(meta, null, 1) });

  const blob = await zipCreate(files, onProgress);
  return { blob, elements: elements.length, folders: folders.length };
}

// Merges a backup into the library. Items that already exist (same id) are skipped,
// so restoring the same file twice never creates duplicates.
export async function restoreBackup(file, onProgress) {
  let zip;
  let meta;
  try {
    zip = await zipRead(file);
    meta = JSON.parse(await zip.text(BACKUP_META));
  } catch (e) {
    throw new Error('not-a-backup');
  }
  if (!meta || meta.app !== BACKUP_APP || !Array.isArray(meta.folders) || !Array.isArray(meta.elements)) {
    throw new Error('not-a-backup');
  }

  const result = { folders: await importFolders(meta.folders), added: 0, skipped: 0, failed: 0 };
  let done = 0;
  for (const m of meta.elements) {
    try {
      const blob = await zip.blob(m.file, mimeOf(m.kind));
      if (!blob) throw new Error('missing');
      if (await importElement(m, blob)) result.added++;
      else result.skipped++;
    } catch (e) {
      console.warn('Restore failed for', m && m.name, e);
      result.failed++;
    }
    done++;
    if (onProgress) onProgress(done, meta.elements.length);
  }

  if (meta.settings && meta.settings.background && !getBackgroundState().blob) {
    try {
      const bg = await zip.blob(meta.settings.background, 'image/jpeg');
      if (bg) await restoreBackgroundBlob(bg, meta.settings.backgroundVisibility);
    } catch (e) {
      console.warn('Background restore failed', e);
    }
  }
  refreshViews();
  return result;
}
