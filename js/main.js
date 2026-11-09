// Entry point: boot, hash router, keyboard shortcuts, file drop, PWA registration.
import { h } from './lib/dom.js';
import { icon } from './lib/icons.js';
import { init, getFolder } from './store.js';
import { HomeView } from './views/HomeView.js';
import { ElementsView } from './views/ElementsView.js';
import { closeTopOverlay } from './ui/BottomSheet.js';
import { openUpload } from './ui/UploadModal.js';
import { toast } from './ui/Toast.js';
import { detectKind } from './lib/image.js';
import { initBackground } from './services/background.js';

const app = document.getElementById('app');
let current = null;

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'folder' && parts[1]) return { name: 'folder', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'favorites') return { name: 'favorites' };
  if (parts[0] === 'recent') return { name: 'recent' };
  return { name: 'home' };
}

function currentFolderId() {
  const r = parseRoute();
  return r.name === 'folder' ? r.id : null;
}

function showRoute() {
  const r = parseRoute();
  let view;
  if (r.name === 'folder') {
    if (!getFolder(r.id)) {
      location.replace('#/');
      return;
    }
    view = ElementsView({ folderId: r.id });
  } else if (r.name === 'favorites') view = ElementsView({ virtual: 'favorites' });
  else if (r.name === 'recent') view = ElementsView({ virtual: 'recent' });
  else view = HomeView();

  if (current) current.destroy();
  current = view;
  app.replaceChildren(view.node);
  window.scrollTo(0, 0);
}

// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (closeTopOverlay()) return;
    const el = document.activeElement;
    if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) {
      el.blur();
      return;
    }
    if (parseRoute().name !== 'home') location.hash = '#/';
    return;
  }
  const el = document.activeElement;
  if ((el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') {
    e.preventDefault();
    const input = document.querySelector('.search__input');
    if (input) input.focus();
  } else if (e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') {
    e.preventDefault();
    openUpload({ folderId: currentFolderId() });
  }
});

// ---------- drop files anywhere (desktop) ----------
let dropDepth = 0;
const dropHint = h(
  'div',
  { class: 'drop-hint', hidden: true },
  icon('upload', 32),
  h('p', null, 'Отпустите файлы, чтобы добавить')
);
document.body.append(dropHint);
const hasFiles = (e) => [...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files');
window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dropDepth++;
  dropHint.hidden = false;
});
window.addEventListener('dragover', (e) => {
  if (hasFiles(e)) e.preventDefault();
});
window.addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return;
  dropDepth = Math.max(0, dropDepth - 1);
  if (!dropDepth) dropHint.hidden = true;
});
window.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dropDepth = 0;
  dropHint.hidden = true;
  const files = [...e.dataTransfer.files].filter((f) => detectKind(f));
  if (files.length) openUpload({ files, folderId: currentFolderId() });
  else toast('Поддерживаются PNG, SVG, JPG, WebP', { tone: 'error', icon: 'close' });
});

// ---------- boot ----------
async function boot() {
  try {
    await init();
  } catch (e) {
    console.error(e);
    app.replaceChildren(
      h(
        'div',
        { class: 'boot-error' },
        h('h1', { class: 'display' }, 'Не удалось открыть хранилище'),
        h('p', null, 'Браузер запретил локальное хранилище (возможно, включён приватный режим). Откройте «Штуки» в обычном окне.')
      )
    );
    return;
  }
  window.addEventListener('hashchange', showRoute);
  showRoute();
  initBackground().catch((e) => console.warn('Background failed', e));
}

boot();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
