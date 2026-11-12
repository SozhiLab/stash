// Offline shell cache. Bump VERSION when files change.
const VERSION = 'stash-v12';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'css/tokens.css',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'js/main.js',
  'js/store.js',
  'js/data/db.js',
  'js/data/repository.js',
  'js/data/defaults.js',
  'js/lib/dom.js',
  'js/lib/icons.js',
  'js/lib/id.js',
  'js/lib/format.js',
  'js/lib/image.js',
  'js/logic/search.js',
  'js/services/clipboard.js',
  'js/services/share.js',
  'js/services/background.js',
  'js/actions/elementActions.js',
  'js/ui/Toast.js',
  'js/ui/BottomSheet.js',
  'js/ui/SearchBar.js',
  'js/ui/EmptyState.js',
  'js/ui/FolderCard.js',
  'js/ui/ElementCard.js',
  'js/ui/ElementSheets.js',
  'js/ui/ElementMenu.js',
  'js/ui/FolderEditor.js',
  'js/ui/FolderMenu.js',
  'js/ui/UploadModal.js',
  'js/ui/BackgroundSheet.js',
  'js/lib/zip.js',
  'js/logic/sort.js',
  'js/logic/colors.js',
  'js/lib/hash.js',
  'js/ui/BatchSheets.js',
  'js/ui/SelectionBar.js',
  'js/ui/folderDrag.js',
  'js/logic/autotags.js',
  'js/services/prefs.js',
  'js/services/theme.js',
  'js/services/backup.js',
  'js/ui/SettingsSheet.js',
  'js/ui/BackupSheet.js',
  'js/ui/Segmented.js',
  'js/ui/SizeSlider.js',
  'js/ui/FabAdd.js',
  'js/views/HomeView.js',
  'js/views/ElementsView.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for the app shell and Google Fonts
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
