// Floating action bar shown while several elements are selected.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

// actions: [{ label, icon, onClick, danger }]
export function SelectionBar(actions) {
  const buttons = actions.map((a) =>
    h(
      'button',
      { class: 'selbar__btn' + (a.danger ? ' is-danger' : ''), type: 'button', onClick: a.onClick, 'aria-label': a.label },
      icon(a.icon, 20),
      h('span', null, a.label)
    )
  );
  const node = h('div', { class: 'selbar', hidden: true, role: 'toolbar', 'aria-label': 'Действия с выбранными' }, buttons);
  return {
    node,
    setCount(n) {
      node.hidden = n === 0;
      buttons.forEach((b) => (b.disabled = n === 0));
    },
  };
}
