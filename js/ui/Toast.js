import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

let toastTimer = null;
let toastCurrent = null;

// toast('Скопировано'), toast('Ошибка', { tone: 'error', icon: 'close' })
export function toast(message, opts = {}) {
  const { icon: iconName = 'check', tone = 'success', duration = 1700 } = opts;
  const root = document.getElementById('toast-root');
  if (toastCurrent) toastCurrent.remove();
  clearTimeout(toastTimer);

  const el = h(
    'div',
    { class: `toast toast--${tone}`, role: 'status' },
    h('span', { class: 'toast__ico' }, icon(iconName, 14)),
    h('span', { class: 'toast__text' }, message)
  );
  root.append(el);
  toastCurrent = el;
  requestAnimationFrame(() => el.classList.add('is-in'));

  toastTimer = setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 220);
  }, duration);
}
