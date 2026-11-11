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

// Picks a neutral backdrop that makes the element readable:
// dark artwork -> 'light' gray, light artwork -> 'dark' charcoal, both -> 'mid' gray.
const TONE_SAMPLE = 48;
function toneFromImage(img) {
  try {
    const { w, h } = naturalSize(img);
    const s = Math.min(1, TONE_SAMPLE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * s));
    canvas.height = Math.max(1, Math.round(h * s));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    let sum = 0;
    let dark = 0;
    let bright = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 48) continue;
      const l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      n++;
      sum += l;
      if (l < 0.3) dark++;
      else if (l > 0.75) bright++;
    }
    if (n < 4) return 'light';
    if (dark / n > 0.18 && bright / n > 0.18) return 'mid';
    return sum / n > 0.68 ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

// Colour names, transparency and orientation for automatic tags.
function colorName(r, g, b) {
  const mx = Math.max(r, g, b) / 255;
  const mn = Math.min(r, g, b) / 255;
  const l = (mx + mn) / 2;
  const d = mx - mn;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (l < 0.14) return 'чёрный';
  if (l > 0.92 && sat < 0.5) return 'белый';
  if (sat < 0.14) return l > 0.75 ? 'белый' : 'серый';
  let hue;
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  if (mx === rr) hue = ((gg - bb) / d + 6) % 6;
  else if (mx === gg) hue = (bb - rr) / d + 2;
  else hue = (rr - gg) / d + 4;
  hue *= 60;
  if (hue < 15 || hue >= 345) return l > 0.7 ? 'розовый' : 'красный';
  if (hue < 40) return l < 0.4 ? 'коричневый' : 'оранжевый';
  if (hue < 68) return 'жёлтый';
  if (hue < 165) return 'зелёный';
  if (hue < 200) return 'бирюзовый';
  if (hue < 255) return 'синий';
  if (hue < 295) return 'фиолетовый';
  return 'розовый';
}

function traitsFromImage(img) {
  const { w, h } = naturalSize(img);
  const ratio = w / h;
  const shape = ratio >= 1.15 ? 'горизонтальный' : ratio <= 0.87 ? 'вертикальный' : 'квадрат';
  const traits = { colors: [], transparent: false, shape };
  try {
    const s = Math.min(1, TONE_SAMPLE / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * s));
    canvas.height = Math.max(1, Math.round(h * s));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const total = px.length / 4;
    const counts = {};
    let solid = 0;
    let clear = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 48) {
        clear++;
        continue;
      }
      solid++;
      const c = colorName(px[i], px[i + 1], px[i + 2]);
      counts[c] = (counts[c] || 0) + 1;
    }
    traits.transparent = clear / total > 0.08;
    if (solid >= 4) {
      const ranked = Object.entries(counts)
        .map(([name, n]) => [name, n / solid])
        .sort((a, b) => b[1] - a[1]);
      const neutral = ['чёрный', 'белый', 'серый'];
      const neutralShare = ranked.filter(([n]) => neutral.includes(n)).reduce((a, [, f]) => a + f, 0);
      traits.colors = ranked.filter(([, f]) => f >= 0.12).slice(0, 3).map(([n]) => n);
      if (!traits.colors.length) traits.colors = [ranked[0][0]];
      if (neutralShare > 0.92 && ranked.some(([n]) => n === 'чёрный') && ranked.some(([n]) => n === 'белый')) {
        traits.colors.push('чёрно-белый');
      }
    }
  } catch (e) {
    /* tainted or unreadable canvas: skip colours */
  }
  return traits;
}

export async function traitsOfBlob(blob) {
  return traitsFromImage(await loadImage(blob));
}

export async function toneOfBlob(blob) {
  return toneFromImage(await loadImage(blob));
}

// Returns the normalized original blob, a small thumbnail, the pixel size and the backdrop tone.
export async function prepareImage(file, kind) {
  const blob = file.type === MIME_BY_KIND[kind] ? file : new Blob([file], { type: MIME_BY_KIND[kind] });
  const img = await loadImage(blob);
  const { w, h } = naturalSize(img);
  const tone = toneFromImage(img);
  let thumb = blob;
  if (kind !== 'svg') {
    const s = Math.min(1, THUMB_MAX / Math.max(w, h));
    thumb = await drawToBlob(img, Math.round(w * s), Math.round(h * s), 'image/webp', 0.88);
  }
  return { blob, thumb, width: w, height: h, tone, traits: traitsFromImage(img) };
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
