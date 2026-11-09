import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

export function SearchBar({ placeholder, onInput }) {
  const input = h('input', {
    class: 'search__input',
    type: 'search',
    placeholder,
    'aria-label': 'Поиск',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  });
  const clear = h(
    'button',
    {
      class: 'search__clear',
      type: 'button',
      'aria-label': 'Очистить',
      hidden: true,
      onClick: () => {
        input.value = '';
        sync();
        input.focus();
      },
    },
    icon('close', 14)
  );
  function sync() {
    clear.hidden = !input.value;
    onInput(input.value.trim());
  }
  input.addEventListener('input', sync);
  return h('div', { class: 'search' }, icon('search', 18), input, clear);
}
