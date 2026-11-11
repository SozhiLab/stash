// Automatic tags: filename words, dominant colours, shape and the folder name. All on-device.
const STOP = new Set([
  'img', 'image', 'images', 'photo', 'picture', 'screenshot', 'screen', 'shot', 'copy', 'final', 'new', 'untitled',
  'whatsapp', 'dsc', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'file', 'download', 'export', 'edit', 'edited',
  'копия', 'снимок', 'экрана', 'изображение', 'без', 'названия', 'новый', 'файл',
]);

export function wordsFromName(name) {
  return String(name || '')
    .replace(/([a-zа-яё])([A-ZА-ЯЁ])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !/\d{3,}/.test(w) && !STOP.has(w));
}

export function buildAutoTags({ name, traits, kind, folderName }) {
  const tags = [];
  tags.push(...wordsFromName(name));
  if (traits) {
    tags.push(...traits.colors);
    if (traits.transparent) tags.push('прозрачный фон');
    tags.push(traits.shape);
  }
  if (kind) tags.push(kind);
  if (folderName) tags.push(String(folderName).trim().toLowerCase());
  return [...new Set(tags.filter(Boolean))].slice(0, 10);
}

export function mergeTags(userTags, autoTags) {
  return [...new Set([...(userTags || []), ...(autoTags || [])])];
}
