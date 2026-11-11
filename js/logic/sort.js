// Order of elements inside a folder: newest first (default), by name, or most used.
export function sortElements(list, mode) {
  const out = [...list];
  if (mode === 'name') return out.sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base', numeric: true }));
  if (mode === 'used') return out.sort((a, b) => (b.useCount || 0) - (a.useCount || 0) || a.order - b.order);
  return out.sort((a, b) => a.order - b.order);
}
