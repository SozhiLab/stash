// Overlays: bottom sheet (mobile) / dialog (desktop), popover menu, confirm.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

const overlayStack = [];
const overlayRoot = () => document.getElementById('overlay-root');
const wideQuery = () => window.matchMedia('(min-width: 720px)');

function registerOverlay(layer, { lock = true, onClose } = {}) {
  let closed = false;
  const ctl = {
    el: layer,
    lock,
    close() {
      if (closed) return;
      closed = true;
      const i = overlayStack.indexOf(ctl);
      if (i > -1) overlayStack.splice(i, 1);
      layer.classList.add('is-closing');
      setTimeout(() => layer.remove(), 220);
      if (lock && !overlayStack.some((s) => s.lock)) document.body.classList.remove('no-scroll');
      if (onClose) onClose();
    },
  };
  overlayStack.push(ctl);
  if (lock) document.body.classList.add('no-scroll');
  return ctl;
}

// Used by Escape: closes the topmost overlay, returns false when none is open
export function closeTopOverlay() {
  const top = overlayStack[overlayStack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}

export function openSheet({ title, subtitle, body, footer, size = 'md', onClose } = {}) {
  const layer = h('div', { class: 'overlay' });
  layer.addEventListener('pointerdown', (e) => {
    if (e.target === layer) ctl.close();
  });

  const head = title
    ? h(
        'header',
        { class: 'sheet__head' },
        h(
          'div',
          { class: 'sheet__headtext' },
          h('h2', { class: 'sheet__title' }, title),
          subtitle ? h('p', { class: 'sheet__sub' }, subtitle) : null
        ),
        h(
          'button',
          { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': 'Закрыть', onClick: () => ctl.close() },
          icon('close', 16)
        )
      )
    : null;
  const grab = h('div', { class: 'sheet__grab' });
  const sheet = h(
    'div',
    { class: `sheet sheet--${size}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Окно' },
    grab,
    head,
    h('div', { class: 'sheet__body' }, body),
    footer ? h('footer', { class: 'sheet__foot' }, footer) : null
  );
  layer.append(sheet);
  overlayRoot().append(layer);
  const ctl = registerOverlay(layer, { onClose });

  // Swipe down on the handle / header to dismiss (mobile only)
  [grab, head].filter(Boolean).forEach((handle) => {
    let startY = null;
    let dy = 0;
    handle.addEventListener('pointerdown', (e) => {
      if (wideQuery().matches || e.target.closest('button')) return;
      startY = e.clientY;
      dy = 0;
      handle.setPointerCapture(e.pointerId);
      sheet.style.transition = 'none';
    });
    handle.addEventListener('pointermove', (e) => {
      if (startY == null) return;
      dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (startY == null) return;
      startY = null;
      sheet.style.transition = '';
      if (dy > 110) ctl.close();
      else sheet.style.transform = '';
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });

  return { close: () => ctl.close(), el: sheet };
}

function openPopover(content, anchor) {
  const layer = h('div', { class: 'overlay overlay--clear' });
  layer.addEventListener('pointerdown', (e) => {
    if (e.target === layer) ctl.close();
  });
  const pop = h('div', { class: 'popover' }, content);
  layer.append(pop);
  overlayRoot().append(layer);

  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  const left = Math.min(Math.max(8, r.right - pw), window.innerWidth - pw - 8);
  let top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';

  const ctl = registerOverlay(layer, { lock: false });
  window.addEventListener('scroll', () => ctl.close(), { once: true, passive: true });
  return { close: () => ctl.close() };
}

// items: [{ label, icon, run, danger }, { separator: true }]
export function openMenu(items, { anchor, title } = {}) {
  const list = h(
    'div',
    { class: 'menu', role: 'menu' },
    items.map((it) =>
      it.separator
        ? h('div', { class: 'menu-sep' })
        : h(
            'button',
            {
              class: 'menu-item' + (it.danger ? ' menu-item--danger' : ''),
              type: 'button',
              role: 'menuitem',
              onClick: () => {
                ctl.close();
                if (it.run) it.run();
              },
            },
            icon(it.icon, 20),
            h('span', null, it.label)
          )
    )
  );
  const useMenu = anchor && window.matchMedia('(min-width: 720px) and (hover: hover)').matches;
  const ctl = useMenu ? openPopover(list, anchor) : openSheet({ title, body: list, size: 'menu' });
  return ctl;
}

export function confirmSheet({ title, message, confirmLabel = 'Удалить', danger = true }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const ctl = openSheet({
      title,
      body: h('p', { class: 'sheet__text' }, message),
      footer: h(
        'div',
        { class: 'sheet__actions' },
        h('button', { class: 'btn', type: 'button', onClick: () => { done(false); ctl.close(); } }, 'Отмена'),
        h(
          'button',
          {
            class: 'btn ' + (danger ? 'btn--danger' : 'btn--primary'),
            type: 'button',
            onClick: () => { done(true); ctl.close(); },
          },
          confirmLabel
        )
      ),
      size: 'sm',
      onClose: () => done(false),
    });
  });
}
