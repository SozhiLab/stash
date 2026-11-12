import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { thumbUrl } from '../store.js';
import { copyElement, shareElement } from '../actions/elementActions.js';
import { openElementMenu } from './ElementMenu.js';

// Main action of the card is copying. The menu button is secondary.
export function ElementCard(el, { folderName = null, select = null } = {}) {
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
    h('span', { class: 'el__check', 'aria-hidden': 'true' }, icon('check', 16)),
    el.favorite ? h('span', { class: 'el__fav', 'aria-label': 'В избранном' }, icon('starFill', 14)) : null,
    moreBtn,
    h('div', { class: 'el__info' }, h('div', { class: 'el__name' }, el.name), h('div', { class: 'el__meta' }, meta)),
    shareBtn
  );

  const activate = () => {
    if (select && select.isActive()) select.toggle(el.id, card);
    else copyElement(el, card);
  };
  if (select && select.isSelected(el.id)) card.classList.add('is-selected');

  // touch: long press starts selection mode; mouse: right click opens the menu
  let pressTimer = null;
  let pressed = false;
  let startX = 0;
  let startY = 0;
  let pointerType = 'mouse';
  const cancelPress = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  };
  card.addEventListener('pointerdown', (e) => {
    pointerType = e.pointerType;
    pressed = false;
    if (!select || e.pointerType === 'mouse' || select.isActive()) return;
    startX = e.clientX;
    startY = e.clientY;
    pressTimer = setTimeout(() => {
      pressed = true;
      if (navigator.vibrate) navigator.vibrate(12);
      select.start(el.id, card);
    }, 450);
  });
  card.addEventListener('pointermove', (e) => {
    if (pressTimer && Math.hypot(e.clientX - startX, e.clientY - startY) > 10) cancelPress();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => card.addEventListener(t, cancelPress));

  card.addEventListener('click', (e) => {
    if (pressed) {
      pressed = false;
      e.preventDefault();
      return;
    }
    activate();
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  });
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (pointerType === 'mouse' && !(select && select.isActive())) openElementMenu(el, moreBtn);
  });
  return card;
}

export function ElementGrid(elements, { showFolder = false, animate = false, folderOf, select = null } = {}) {
  const grid = h(
    'div',
    { class: 'el-grid' + (animate ? ' is-enter' : '') },
    elements.map((el, i) => {
      const card = ElementCard(el, {
        folderName: showFolder && folderOf && folderOf(el.folderId) ? folderOf(el.folderId).name : null,
        select,
      });
      card.style.setProperty('--i', Math.min(i, 14));
      return card;
    })
  );
  return grid;
}
