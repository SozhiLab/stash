import { h } from '../lib/dom.js';

// action: { label, onClick } (optional)
export function EmptyState({ emoji, title, text, action }) {
  return h(
    'div',
    { class: 'empty' },
    h('div', { class: 'empty__emoji', 'aria-hidden': 'true' }, emoji),
    h('h3', { class: 'empty__title' }, title),
    text ? h('p', { class: 'empty__text' }, text) : null,
    action
      ? h('button', { class: 'btn btn--primary', type: 'button', onClick: action.onClick }, action.label)
      : null
  );
}
