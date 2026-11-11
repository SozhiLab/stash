// Custom app background: a photo from the user's library, stored locally.
import { repository } from '../data/repository.js';
import { downscaleToJpeg } from '../lib/image.js';

const DEFAULT_VISIBILITY = 0.5;
const VIS_MIN = 0.2;
const VIS_MAX = 0.9;

let bgBlob = null;
let bgUrl = null;
let bgVisibility = DEFAULT_VISIBILITY;

function ensureLayer() {
  let layer = document.getElementById('bg-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'bg-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.prepend(layer);
  }
  return layer;
}

function render() {
  const layer = ensureLayer();
  if (bgUrl) URL.revokeObjectURL(bgUrl);
  bgUrl = bgBlob ? URL.createObjectURL(bgBlob) : null;
  layer.style.backgroundImage = bgUrl ? `url("${bgUrl}")` : '';
  document.body.classList.toggle('has-bg', !!bgBlob);
  applyVisibility();
}

function applyVisibility() {
  document.documentElement.style.setProperty('--bg-visible', String(bgVisibility));
}

export async function initBackground() {
  ensureLayer();
  const [blob, vis] = await Promise.all([
    repository.getSetting('background'),
    repository.getSetting('background-visibility'),
  ]);
  bgBlob = blob || null;
  if (typeof vis === 'number') bgVisibility = Math.min(VIS_MAX, Math.max(VIS_MIN, vis));
  render();
}

export async function setBackgroundPhoto(file) {
  const blob = await downscaleToJpeg(file);
  await repository.saveSetting('background', blob);
  bgBlob = blob;
  render();
}

// Used when restoring a backup: the blob is already a downscaled JPEG
export async function restoreBackgroundBlob(blob, visibility) {
  await repository.saveSetting('background', blob);
  bgBlob = blob;
  if (typeof visibility === 'number') {
    previewVisibility(visibility);
    await saveVisibility();
  }
  render();
}

export async function clearBackground() {
  await repository.deleteSetting('background');
  bgBlob = null;
  render();
}

// Live preview while dragging the slider
export function previewVisibility(value) {
  bgVisibility = Math.min(VIS_MAX, Math.max(VIS_MIN, value));
  applyVisibility();
}

export function saveVisibility() {
  return repository.saveSetting('background-visibility', bgVisibility);
}

export function getBackgroundState() {
  return { blob: bgBlob, visibility: bgVisibility, min: VIS_MIN, max: VIS_MAX };
}
