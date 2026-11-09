import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { thumbUrl } from '../store.js';
import { plural, EL_FORMS } from '../lib/format.js';
import { openFolderMenu } from './FolderMenu.js';

// A glass folder with two previews peeking out of it.
export function FolderCard({ folder, items }) {
  const paper = (cls, el) =>
    el
      ? h('span', { class: `folder__paper ${cls}` }, h('img', { src: thumbUrl(el), alt: '', draggable: 'false' }))
      : h('span', { class: `folder__paper ${cls} is-empty` });

  const moreBtn = h(
    'button',
    {
      class: 'icon-btn icon-btn--sm icon-btn--glass folder__more',
      type: 'button',
      'aria-label': `Меню папки ${folder.name}`,
      onClick: (e) => openFolderMenu(folder, e.currentTarget),
    },
    icon('more', 18)
  );

  const node = h(
    'div',
    { class: 'folder', style: `--hue:${folder.hue}` },
    h(
      'a',
      { class: 'folder__link', href: `#/folder/${encodeURIComponent(folder.id)}` },
      h(
        'div',
        { class: 'folder__art' },
        h('span', { class: 'folder__back' }),
        paper('folder__paper--a', items[0]),
        paper('folder__paper--b', items[1]),
        h('span', { class: 'folder__front' }),
        h('span', { class: 'folder__sticker', 'aria-hidden': 'true' }, folder.emoji)
      ),
      h('div', { class: 'folder__name' }, folder.name),
      h('div', { class: 'count-pill' }, items.length ? plural(items.length, EL_FORMS) : 'Пусто')
    ),
    moreBtn
  );
  node.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openFolderMenu(folder, moreBtn);
  });
  return node;
}
