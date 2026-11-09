// Image helpers: type detection, thumbnails, conversion to PNG for the clipboard.
const MIME_BY_KIND = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
};
const KIND_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
};
const KIND_BY_EXT = { png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp', svg: 'svg', gif: 'gif' };
const THUMB_MAX = 520;

export function mimeOf(kind) {
  return MIME_BY_KIND[kind];
}

export function detectKind(file) {
  const ext = ((file.name || '').split('.').pop() || '').toLowerCase();
  return KIND_BY_MIME[file.type] || KIND_BY_EXT[ext] || null;
}

export function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality);
  });
}

function naturalSize(img) {
  return { w: img.naturalWidth || 512, h: img.naturalHeight || 512 };
}

function drawToBlob(img, w, h, type, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, type, quality);
}

// Returns the normalized original blob, a small thumbnail and the pixel size.
export async function prepareImage(file, kind) {
  const blob = file.type === MIME_BY_KIND[kind] ? file : new Blob([file], { type: MIME_BY_KIND[kind] });
  const img = await loadImage(blob);
  const { w, h } = naturalSize(img);
  let thumb = blob;
  if (kind !== 'svg') {
    const s = Math.min(1, THUMB_MAX / Math.max(w, h));
    thumb = await drawToBlob(img, Math.round(w * s), Math.round(h * s), 'image/webp', 0.88);
  }
  return { blob, thumb, width: w, height: h };
}

// Camera-roll photo -> reasonably small JPEG for use as the app background.
export async function downscaleToJpeg(file, maxSide = 1600) {
  const img = await loadImage(file);
  const { w, h } = naturalSize(img);
  const s = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * s));
  canvas.height = Math.max(1, Math.round(h * s));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, 'image/jpeg', 0.86);
}

// The clipboard reliably accepts only image/png.
export async function toPngBlob(blob) {
  if (blob.type === 'image/png') return blob;
  const img = await loadImage(blob);
  let { w, h } = naturalSize(img);
  if (blob.type === 'image/svg+xml') {
    const s = Math.max(1, 1024 / Math.max(w, h));
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  return drawToBlob(img, w, h, 'image/png');
}
