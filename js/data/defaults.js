// Folder tints (hue, degrees). Used by the editor and for seeding.
export const HUES = [265, 330, 14, 38, 140, 175, 205, 235];

// First-run folders. Everything here is editable or deletable by the user.
export const DEFAULT_FOLDERS = [
  { name: 'Оформление сторис', emoji: '📱' },
  { name: 'Reels', emoji: '🎬' },
  { name: 'Посты', emoji: '🖼️' },
  { name: 'Карусели', emoji: '🎠' },
  { name: 'Обложки', emoji: '📖' },
  { name: 'Фоны', emoji: '🌈' },
  { name: 'Декоративные элементы', emoji: '✨' },
  { name: 'Стрелки', emoji: '➡️' },
  { name: 'Кавычки', emoji: '💬' },
  { name: 'Символы', emoji: '♡' },
  { name: 'PNG-объекты', emoji: '🧩' },
  { name: 'Стикеры', emoji: '🏷️' },
  { name: 'Шрифтовые элементы', emoji: '🔤' },
  { name: 'Мои элементы', emoji: '🗂️' },
].map((f, i) => ({ ...f, hue: HUES[i % HUES.length] }));
