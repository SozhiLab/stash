import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { thumbUrl } from '../store.js';
import { copyElement, shareElement } from '../actions/elementActions.js';
import { openElementMenu } from './ElementMenu.js';

// Main action of the card is copying. The menu button is secondary.
export function ElementCard(el, { folderName = null } = {}) {
  const meta = folderName
    ? `${folderName} · ${el.kind.toUpperCase()}`
    : `${el.kind.toUpperCase()} · ${el.width}×${el.height}`;

  const moreBtn = h(
    'button',
    {
      class: 'icon-btn icon-btn--sm icon-btn--glass el__more',
      type: 'button',
      'aria-label': `Меню: ${el.name}`,
      onClick: (e) => {
        e.stopPropagation();
        openElementMenu(el, e.currentTarget);
      },
    },
    icon('more', 18)
  );
  const shareBtn = h(
    'button',
    {
      class: 'el__share',
      type: 'button',
      'aria-label': `Поделиться: ${el.name}`,
      onClick: (e) => {
        e.stopPropagation();
        shareElement(el);
      },
    },
    icon('share', 18),
    'Поделиться'
  );
  shareBtn.addEventListener('keydown', (e) => e.stopPropagation());
  // keyboard activation of the nested button must not trigger a copy
  moreBtn.addEventListener('keydown', (e) => e.stopPropagation());

  const card = h(
    'div',
    { class: 'el', role: 'button', tabindex: '0', 'aria-label': `Скопировать: ${el.name}` },
    h(
      'div',
      { class: 'el__preview', 'data-tone': el.tone || 'light' },
      h('img', { src: thumbUrl(el), alt: '', loading: 'lazy', draggable: 'false' }),
      h('span', { class: 'el__done' }, icon('check', 26))
    ),
    el.favorite ? h('span', { class: 'el__fav', 'aria-label': 'В избранном' }, icon('starFill', 14)) : null,
    moreBtn,
    h('div', { class: 'el__info' }, h('div', { class: 'el__name' }, el.name), h('div', { class: 'el__meta' }, meta)),
    shareBtn
  );

  card.addEventListener('click', () => copyElement(el, card));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copyElement(el, card);
    }
  });
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openElementMenu(el, moreBtn);
  });
  return card;
}

export function ElementGrid(elements, { showFolder = false, animate = false, folderOf } = {}) {
  const grid = h(
    'div',
    { class: 'el-grid' + (animate ? ' is-enter' : '') },
    elements.map((el, i) => {
      const card = ElementCard(el, {
        folderName: showFolder && folderOf && folderOf(el.folderId) ? folderOf(el.folderId).name : null,
      });
      card.style.setProperty('--i', Math.min(i, 14));
      return card;
    })
  );
  return grid;
}
