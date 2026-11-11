// One screen for a real folder and for the virtual lists "favorites" and "recent".
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { subscribe, getFolder, elementsIn, favorites, recent } from '../store.js';
import { searchElements } from '../logic/search.js';
import { sortElements } from '../logic/sort.js';
import { getPref } from '../services/prefs.js';
import { plural, EL_FORMS } from '../lib/format.js';
import { SearchBar } from '../ui/SearchBar.js';
import { ElementGrid } from '../ui/ElementCard.js';
import { EmptyState } from '../ui/EmptyState.js';
import { FabAdd } from '../ui/FabAdd.js';
import { openUpload } from '../ui/UploadModal.js';
import { openFolderMenu } from '../ui/FolderMenu.js';

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'fav', label: 'Избранное', icon: 'star' },
  { id: 'recent', label: 'Недавние', icon: 'clock' },
  { id: 'png', label: 'PNG' },
  { id: 'svg', label: 'SVG' },
  { id: 'jpg', label: 'JPG' },
];

export function ElementsView({ folderId = null, virtual = null }) {
  let filter = 'all';
  let query = '';
  let first = true;

  const folder = () => (folderId ? getFolder(folderId) : null);
  const virtualTitle = virtual === 'favorites' ? 'Избранное' : 'Недавние';

  const title = h('h1', { class: 'topbar__title' });
  const sub = h('p', { class: 'topbar__sub' });
  const back = h('a', { class: 'icon-btn', href: '#/', 'aria-label': 'Назад' }, icon('back', 22));
  const moreBtn = folderId
    ? h(
        'button',
        {
          class: 'icon-btn',
          type: 'button',
          'aria-label': 'Меню папки',
          onClick: (e) => folder() && openFolderMenu(folder(), e.currentTarget, { inView: true }),
        },
        icon('more', 22)
      )
    : null;
  const search = SearchBar({
    placeholder: folderId ? 'Искать в папке' : 'Искать в списке',
    onInput: (q) => {
      query = q;
      update();
    },
  });
  const pills = h('div', { class: 'pills', role: 'group', 'aria-label': 'Фильтры' });
  const content = h('div', { class: 'elements__content' });
  const fab = folderId ? FabAdd({ folderId }) : null;

  function baseList() {
    if (folderId) return sortElements(elementsIn(folderId), getPref('sort'));
    return virtual === 'favorites' ? favorites() : recent();
  }

  function visibleFilters() {
    return FILTERS.filter((f) => !(virtual === 'favorites' && f.id === 'fav') && !(virtual === 'recent' && f.id === 'recent'));
  }

  function filtered(list) {
    let out = list;
    if (filter === 'fav') out = out.filter((e) => e.favorite);
    else if (filter === 'recent') out = out.filter((e) => e.lastUsedAt).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    else if (['png', 'svg', 'jpg'].includes(filter)) out = out.filter((e) => e.kind === filter);
    if (query) out = searchElements(out, getFolder, query);
    return out;
  }

  function emptyFor(list) {
    if (list.length === 0 && !query && filter === 'all') {
      if (folderId) {
        return EmptyState({
          emoji: '🫥',
          title: 'Здесь пока пусто',
          text: 'Добавьте PNG, SVG или JPG. Они появятся здесь, и тап по карточке скопирует картинку.',
          action: { label: 'Добавить элементы', onClick: () => openUpload({ folderId }) },
        });
      }
      return virtual === 'favorites'
        ? EmptyState({ emoji: '⭐', title: 'Избранное пусто', text: 'Откройте меню ••• у элемента и выберите «В избранное».' })
        : EmptyState({ emoji: '🕘', title: 'Пока ничего', text: 'Здесь появятся элементы, которые вы копировали или отправляли.' });
    }
    return EmptyState({ emoji: '🔎', title: 'Ничего не найдено', text: 'Смените фильтр или поисковое слово.' });
  }

  function update() {
    if (folderId && !folder()) {
      location.hash = '#/';
      return;
    }
    const f = folder();
    title.textContent = f ? `${f.emoji}  ${f.name}` : virtualTitle;

    const base = baseList();
    sub.textContent = plural(base.length, EL_FORMS);

    pills.replaceChildren(
      ...visibleFilters().map((p) =>
        h(
          'button',
          {
            class: 'pill' + (filter === p.id ? ' is-active' : ''),
            type: 'button',
            'aria-pressed': String(filter === p.id),
            onClick: () => {
              filter = p.id;
              update();
            },
          },
          p.icon ? icon(p.icon, 15) : null,
          p.label
        )
      )
    );

    const list = filtered(base);
    content.replaceChildren(
      list.length
        ? ElementGrid(list, { showFolder: !folderId, animate: first, folderOf: getFolder })
        : emptyFor(base)
    );
    first = false;
  }

  update();
  const off = subscribe(update);

  const node = h(
    'section',
    { class: 'view elements' },
    h(
      'header',
      { class: 'topbar' },
      back,
      h('div', { class: 'topbar__text' }, title, sub),
      moreBtn
    ),
    h('div', { class: 'elements__tools' }, search, pills),
    content,
    fab
  );
  return { node, destroy: off };
}
