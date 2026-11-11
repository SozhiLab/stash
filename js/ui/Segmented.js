import { h } from '../lib/dom.js';

// options: [{ id, label }]
export function Segmented({ options, value, onChange, label }) {
  const buttons = options.map((o) =>
    h(
      'button',
      {
        class: 'seg__btn',
        type: 'button',
        role: 'radio',
        'aria-checked': String(o.id === value),
        onClick: () => {
          buttons.forEach((b, i) => b.setAttribute('aria-checked', String(options[i].id === o.id)));
          onChange(o.id);
        },
      },
      o.label
    )
  );
  return h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label }, buttons);
}
