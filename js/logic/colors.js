// Colour names used for tags and the colour filter, with the swatch shown in the UI.
export const COLOR_SWATCH = {
  красный: '#e5383b',
  оранжевый: '#fb8500',
  жёлтый: '#ffd60a',
  зелёный: '#2fbf71',
  бирюзовый: '#14b8c4',
  синий: '#2f6bff',
  фиолетовый: '#8b5cf6',
  розовый: '#ff7eb6',
  коричневый: '#8d5a3b',
  чёрный: '#111116',
  белый: '#ffffff',
  серый: '#9a9aa6',
};
export const COLOR_ORDER = Object.keys(COLOR_SWATCH);

export function colorsOf(traits) {
  return traits && traits.colors ? traits.colors.filter((c) => COLOR_SWATCH[c]) : [];
}
