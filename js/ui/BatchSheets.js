// Sheets for actions on several selected elements: move to a folder, add/remove tags.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { toast } from './Toast.js';
import { state, moveElements, tagElements } from '../store.js';
import { parseTags, plural, EL_FORMS } from '../lib/format.js';

export function openMoveMany(ids, onDone) {
  const list = h(
    'div',
    { class: 'move-list' },
    state.folders.map((f) =>
      h(
        'button',
        {
          class: 'move-item',
          type: 'button',
          style: `--hue:${f.hue}`,
          onClick: async () => {
            await moveElements(ids, f.id);
            sheet.close();
            toast(`Перемещено в «${f.name}»: ${ids.length}`, { icon: 'folder' });
            if (onDone) onDone();
          },
        },
        h('span', { class: 'move-item__emoji' }, f.emoji),
        h('span', { class: 'move-item__name' }, f.name)
      )
    )
  );
  const sheet = openSheet({ title: 'Переместить в папку', subtitle: plural(ids.length, EL_FORMS), body: list, size: 'md' });
}

export function openTagMany(ids, onDone) {
  const addInput = h('input', { class: 'input', id: 'batch-add', placeholder: 'story, минимал' });
  const removeInput = h('input', { class: 'input', id: 'batch-remove', placeholder: 'старый тег' });
  const apply = async () => {
    const add = parseTags(addInput.value);
    const remove = parseTags(removeInput.value);
    if (!add.length && !remove.length) {
      addInput.focus();
      return;
    }
    await tagElements(ids, { add, remove });
    sheet.close();
    toast('Теги обновлены', { icon: 'check' });
    if (onDone) onDone();
  };
  const form = h(
    'form',
    { class: 'form', onSubmit: (e) => { e.preventDefault(); apply(); } },
    h('label', { class: 'field', for: 'batch-add' }, h('span', { class: 'field__label' }, 'Добавить теги'), addInput),
    h(
      'label',
      { class: 'field', for: 'batch-remove' },
      h('span', { class: 'field__label' }, 'Убрать теги'),
      removeInput,
      h('span', { class: 'field__hint' }, 'Через запятую. Применится ко всем выбранным.')
    ),
    h('button', { class: 'btn btn--primary btn--block', type: 'submit' }, icon('check', 18), `Применить к ${ids.length}`)
  );
  const sheet = openSheet({ title: 'Теги', subtitle: plural(ids.length, EL_FORMS), body: form, size: 'sm' });
  addInput.focus();
}
