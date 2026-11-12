// One screen for a real folder and for the virtual lists "favorites" and "recent".
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { subscribe, getFolder, getElement, elementsIn, favorites, recent, removeElements } from '../store.js';
import { searchElements } from '../logic/search.js';
import { sortElements } from '../logic/sort.js';
import { getPref } from '../services/prefs.js';
import { plural, EL_FORMS } from '../lib/format.js';
import { SearchBar } from '../ui/SearchBar.js';
import { ElementGrid } from '../ui/ElementCard.js';
import { EmptyState } from '../ui/EmptyState.js';
import { FabAdd } from '../ui/FabAdd.js';
import { SelectionBar } from '../ui/SelectionBar.js';
import { openMoveMany, openTagMany } from '../ui/BatchSheets.js';
import { confirmSheet } from '../ui/BottomSheet.js';
import { toast } from '../ui/Toast.js';
import { shareElements } from '../actions/elementActions.js';
import { COLOR_SWATCH, COLOR_ORDER } from '../logic/colors.js';
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
  let colorFilter = null;
  let selecting = false;
  const selected = new Set();

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
  const selectBtn = h('button', { class: 'btn btn--sm el-selectbtn', type: 'button', onClick: () => onSelectButton() }, 'Выбрать');
  const cancelBtn = h(
    'button',
    { class: 'icon-btn', type: 'button', 'aria-label': 'Отменить выбор', hidden: true, onClick: () => setSelecting(false) },
    icon('close', 22)
  );
  const swatches = h('div', { class: 'swatches', role: 'group', 'aria-label': 'Фильтр по цвету' });
  const selbar = SelectionBar([
    { label: 'Поделиться', icon: 'share', onClick: () => doShare() },
    { label: 'В папку', icon: 'folder', onClick: () => openMoveMany([...selected], () => setSelecting(false)) },
    { label: 'Теги', icon: 'edit', onClick: () => openTagMany([...selected], () => setSelecting(false)) },
    { label: 'Удалить', icon: 'trash', danger: true, onClick: () => doDelete() },
  ]);
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
    if (colorFilter) out = out.filter((e) => (e.colors || []).includes(colorFilter));
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

  let lastShown = [];
  const selectCtx = {
    isActive: () => selecting,
    isSelected: (id) => selected.has(id),
    toggle: (id, card) => {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      card.classList.toggle('is-selected', selected.has(id));
      paintSelection();
    },
    start: (id, card) => {
      setSelecting(true);
      selected.add(id);
      card.classList.add('is-selected');
      paintSelection();
    },
  };

  function setSelecting(on) {
    selecting = on;
    selected.clear();
    node.classList.toggle('is-selecting', on);
    content.querySelectorAll('.el.is-selected').forEach((c) => c.classList.remove('is-selected'));
    paintSelection();
  }

  function paintSelection() {
    const n = selected.size;
    selbar.setCount(selecting ? n : 0);
    cancelBtn.hidden = !selecting;
    back.hidden = selecting;
    if (moreBtn) moreBtn.hidden = selecting;
    if (fab) fab.hidden = selecting;
    const allOn = lastShown.length > 0 && lastShown.every((e) => selected.has(e.id));
    selectBtn.textContent = selecting ? (allOn ? 'Снять' : 'Все') : 'Выбрать';
    selectBtn.hidden = !selecting && lastShown.length === 0;
    sub.textContent = selecting ? (n ? `Выбрано: ${n}` : 'Выберите элементы') : plural(baseList().length, EL_FORMS);
  }

  function onSelectButton() {
    if (!selecting) {
      setSelecting(true);
      return;
    }
    const allOn = lastShown.length > 0 && lastShown.every((e) => selected.has(e.id));
    selected.clear();
    if (!allOn) lastShown.forEach((e) => selected.add(e.id));
    content.querySelectorAll('.el').forEach((c, i) => c.classList.toggle('is-selected', !allOn && !!lastShown[i]));
    paintSelection();
  }

  const chosen = () => [...selected].map(getElement).filter(Boolean);

  async function doShare() {
    const list = chosen();
    if (!list.length) return;
    toast(`Готовлю файлы: ${list.length}`, { icon: 'share', duration: 1200 });
    if (await shareElements(list)) setSelecting(false);
  }

  async function doDelete() {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirmSheet({
      title: `Удалить выбранное (${ids.length})?`,
      message: 'Элементы будут удалены без возможности восстановления.',
    });
    if (!ok) return;
    await removeElements(ids);
    setSelecting(false);
    toast(`Удалено: ${ids.length}`, { icon: 'trash' });
  }

  function paintSwatches(base) {
    const present = new Set(base.flatMap((e) => e.colors || []));
    if (colorFilter && !present.has(colorFilter)) colorFilter = null;
    const names = COLOR_ORDER.filter((c) => present.has(c));
    swatches.hidden = names.length < 2;
    swatches.replaceChildren(
      ...names.map((c) =>
        h('button', {
          class: 'swatch' + (colorFilter === c ? ' is-active' : ''),
          type: 'button',
          title: c,
          'aria-label': `Цвет: ${c}`,
          'aria-pressed': String(colorFilter === c),
          style: `--c:${COLOR_SWATCH[c]}`,
          onClick: () => {
            colorFilter = colorFilter === c ? null : c;
            update();
          },
        })
      )
    );
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
    paintSwatches(base);

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
    lastShown = list;
    // drop selected items that vanished (deleted, moved or filtered out)
    for (const id of [...selected]) if (!list.some((e) => e.id === id)) selected.delete(id);
    content.replaceChildren(
      list.length
        ? ElementGrid(list, { showFolder: !folderId, animate: first, folderOf: getFolder, select: selectCtx })
        : emptyFor(base)
    );
    first = false;
    paintSelection();
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
      cancelBtn,
      h('div', { class: 'topbar__text' }, title, sub),
      selectBtn,
      moreBtn
    ),
    h('div', { class: 'elements__tools' }, search, pills, swatches),
    content,
    fab,
    selbar.node
  );
  return { node, destroy: off };
}
