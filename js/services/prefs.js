// Per-device preferences. localStorage may be unavailable, so every call is guarded.
export function readPref(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export function writePref(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch (e) {
    /* storage unavailable: the setting just won't persist */
  }
}

// Typed settings. Theme lives in services/theme.js, folder size in ui/SizeSlider.js.
const AUTOTAGS_KEY = 'stash:autotags';
const SORT_KEY = 'stash:sort';
export const SORT_MODES = ['new', 'name', 'used'];

export function getPref(name) {
  if (name === 'sort') {
    const v = readPref(SORT_KEY);
    return SORT_MODES.includes(v) ? v : 'new';
  }
  if (name === 'autotags') return readPref(AUTOTAGS_KEY) !== 'off';
  return null;
}

export function setPref(name, value) {
  if (name === 'sort') writePref(SORT_KEY, SORT_MODES.includes(value) ? value : null);
  if (name === 'autotags') writePref(AUTOTAGS_KEY, value ? null : 'off');
}
