import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { state, subscribe, getFolder, groupByFolder, reorderFolders } from '../store.js';
import { searchElements } from '../logic/search.js';
import { plural, EL_FORMS, FOLDER_FORMS } from '../lib/format.js';
import { SearchBar } from '../ui/SearchBar.js';
import { FolderCard } from '../ui/FolderCard.js';
import { ElementGrid } from '../ui/ElementCard.js';
import { EmptyState } from '../ui/EmptyState.js';
import { SizeSlider, getCols } from '../ui/SizeSlider.js';
import { toast } from '../ui/Toast.js';
import { FabAdd } from '../ui/FabAdd.js';
import { enableFolderDrag } from '../ui/folderDrag.js';
import { openUpload } from '../ui/UploadModal.js';
import { openFolderEditor } from '../ui/FolderEditor.js';
import { openBackgroundSheet } from '../ui/BackgroundSheet.js';
import { openSettingsSheet } from '../ui/SettingsSheet.js';

function homePill(label, href, active, iconName) {
  return h(
    'a',
    { class: 'pill' + (active ? ' is-active' : ''), href, 'aria-current': active ? 'page' : null },
    iconName ? icon(iconName, 15) : null,
    label
  );
}

export function HomeView() {
  let query = '';
  let first = true;


  const sub = h('p', { class: 'head__sub' });
  const settingsBtn = h(
    'button',
    {
      class: 'icon-btn icon-btn--lg',
      type: 'button',
      'aria-label': 'Настройки',
      onClick: () => openSettingsSheet(),
    },
    icon('settings', 22)
  );
  const bgBtn = h(
    'button',
    {
      class: 'icon-btn icon-btn--lg',
      type: 'button',
      'aria-label': 'Фон приложения',
      onClick: () => openBackgroundSheet(),
    },
    icon('image', 22)
  );
  const search = SearchBar({
    placeholder: 'Найти: стрелка, кавычки, story…',
    onInput: (q) => {
      query = q;
      update();
    },
  });
  const pills = h(
    'nav',
    { class: 'pills', 'aria-label': 'Разделы' },
    homePill('Все', '#/', true),
    homePill('Избранное', '#/favorites', false, 'star'),
    homePill('Недавние', '#/recent', false, 'clock')
  );

  const slider = SizeSlider({
    onChange: (cols) => {
      const grid = content.querySelector('.folder-grid');
      if (grid) grid.style.setProperty('--cols', String(cols));
    },
  });

  const content = h('div', { class: 'home__content' });

  const newFolderTile = () =>
    h(
      'div',
      { class: 'folder folder--new' },
      h(
        'button',
        { class: 'folder__link', type: 'button', onClick: () => openFolderEditor() },
        h('div', { class: 'folder__art folder__art--ghost' }, icon('plus', 30)),
        h('div', { class: 'folder__name' }, 'Новая папка')
      )
    );

  let dragging = false;
  let pendingUpdate = false;

  function update() {
    if (dragging) {
      pendingUpdate = true;
      return;
    }
    const total = state.elements.length;
    sub.textContent = `${plural(total, EL_FORMS)} · ${plural(state.folders.length, FOLDER_FORMS)}`;

    slider.node.hidden = !!query || state.folders.length === 0;
    if (query) {
      const found = searchElements(state.elements, getFolder, query);
      content.replaceChildren(
        found.length
          ? h(
              'div',
              null,
              h('p', { class: 'section-label' }, `Найдено: ${found.length}`),
              ElementGrid(found, { showFolder: true, folderOf: getFolder })
            )
          : EmptyState({ emoji: '🔎', title: 'Ничего не найдено', text: 'Попробуйте другое слово или тег.' })
      );
      return;
    }

    const groups = groupByFolder();
    const grid = h(
      'div',
      { class: 'folder-grid' + (first ? ' is-enter' : ''), style: getCols() ? `--cols:${getCols()}` : null },
      state.folders.map((f, i) => {
        const card = FolderCard({ folder: f, items: groups.get(f.id) || [] });
        card.dataset.folderId = f.id;
        card.style.setProperty('--i', Math.min(i, 12));
        return card;
      }),
      newFolderTile()
    );
    const hint =
      total === 0
        ? h(
            'div',
            { class: 'onboard' },
            h('div', null, h('strong', null, 'Начните с первых элементов'), h('p', null, 'Добавьте PNG, и они появятся в папках. Тап по карточке копирует картинку.')),
            h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openUpload() }, 'Добавить')
          )
        : null;
    content.replaceChildren(...[hint, grid].filter(Boolean));
    first = false;
  }

  update();
  const off = subscribe(update);
  try {
    if (state.folders.length > 1 && !localStorage.getItem('stash:dragHint')) {
      localStorage.setItem('stash:dragHint', '1');
      setTimeout(() => toast('Удерживайте папку и перетащите, чтобы поменять порядок', { icon: 'folder', duration: 4200 }), 1200);
    }
  } catch (e) {
    /* storage unavailable */
  }
  const stopDrag = enableFolderDrag(content, {
    onActiveChange: (on) => {
      dragging = on;
      if (!on && pendingUpdate) {
        pendingUpdate = false;
        update();
      }
    },
    onDrop: (ids) => reorderFolders(ids),
  });

  const node = h(
    'section',
    { class: 'view home' },
    h('header', { class: 'head' }, h('div', null, h('h1', { class: 'display' }, 'Штуки'), sub), h('div', { class: 'head__actions' }, bgBtn, settingsBtn)),
    search,
    pills,
    slider.node,
    content,
    FabAdd()
  );
  return {
    node,
    destroy: () => {
      off();
      stopDrag();
      slider.destroy();
    },
  };
}
