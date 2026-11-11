import { readPref, writePref } from './prefs.js';

// The same key is read by the tiny inline script in index.html to avoid a flash on load.
const THEME_KEY = 'stash:theme';
const THEME_COLORS = { light: '#f3f4fa', dark: '#07070c' };
let themeOwned = false;

export function getTheme() {
  const t = readPref(THEME_KEY);
  return t === 'light' || t === 'dark' ? t : 'system';
}

function paintThemeColor(theme) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (!m.dataset.auto) m.dataset.auto = m.getAttribute('content');
    m.setAttribute('content', theme === 'system' ? m.dataset.auto : THEME_COLORS[theme]);
  });
}

// 'system' follows the device. We only remove data-theme if we set it ourselves.
export function applyTheme() {
  const theme = getTheme();
  const root = document.documentElement;
  if (theme === 'system') {
    if (themeOwned) {
      root.removeAttribute('data-theme');
      themeOwned = false;
    }
  } else {
    root.setAttribute('data-theme', theme);
    themeOwned = true;
  }
  paintThemeColor(theme);
}

export function setTheme(theme) {
  writePref(THEME_KEY, theme === 'system' ? null : theme);
  applyTheme();
}
