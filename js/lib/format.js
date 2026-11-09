export const EL_FORMS = ['элемент', 'элемента', 'элементов'];
export const FOLDER_FORMS = ['папка', 'папки', 'папок'];

// Russian plural: 1 элемент, 2 элемента, 5 элементов
export function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  const i = a > 10 && a < 20 ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2;
  return `${n} ${forms[i]}`;
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

// "arrow, minimal story" -> ['arrow', 'minimal story']; no commas -> split by spaces
export function parseTags(str) {
  const s = String(str || '').trim();
  if (!s) return [];
  const parts = /[,;#\n]/.test(s) ? s.split(/[,;#\n]+/) : s.split(/\s+/);
  return [...new Set(parts.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function prettyName(filename) {
  return (
    filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() ||
    'Без названия'
  );
}

export function safeFileName(name, ext) {
  const clean = String(name).replace(/[\\/:*?"<>|]+/g, '').trim() || 'element';
  return `${clean}.${ext}`;
}

export function firstGrapheme(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter().segment(t)][0].segment;
  }
  return Array.from(t)[0];
}
