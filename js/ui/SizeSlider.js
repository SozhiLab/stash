// Folder size on the home screen, expressed as "folders per row".
// Slider to the right = bigger folders = fewer per row (down to one).
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { readPref, writePref } from '../services/prefs.js';

const COLS_KEY = 'stash:folderCols';

// Must match the breakpoints of .folder-grid in layout.css
export function autoCols(width = window.innerWidth) {
  return width < 840 ? 2 : width < 1080 ? 3 : width < 1300 ? 4 : 5;
}

function maxCols(width = window.innerWidth) {
  return width < 600 ? 4 : width < 900 ? 6 : 8;
}

// null means "automatic for this screen"
export function getCols() {
  const n = Number(readPref(COLS_KEY));
  return Number.isInteger(n) && n >= 1 ? Math.min(n, maxCols()) : null;
}

export function SizeSlider({ onChange }) {
  const range = h('input', { class: 'range range--thin', id: 'folder-size', type: 'range', step: '1', 'aria-label': 'Размер папок' });

  function sync() {
    const max = maxCols();
    const cols = getCols() ?? Math.min(autoCols(), max);
    range.min = '1';
    range.max = String(max);
    range.value = String(max + 1 - cols);
  }
  range.addEventListener('input', () => {
    const cols = maxCols() + 1 - Number(range.value);
    writePref(COLS_KEY, cols);
    onChange(cols);
  });
  window.addEventListener('resize', sync);
  sync();

  const node = h(
    'div',
    { class: 'size-row' },
    h('span', { class: 'size-row__label' }, 'Папки'),
    h('div', { class: 'size-row__ctl' }, icon('folder', 14), range, icon('folder', 24))
  );
  return { node, destroy: () => window.removeEventListener('resize', sync) };
}
