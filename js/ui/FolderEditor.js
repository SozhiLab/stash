import { h } from '../lib/dom.js';
import { openSheet } from './BottomSheet.js';
import { toast } from './Toast.js';
import { state, createFolder, updateFolder } from '../store.js';
import { HUES } from '../data/defaults.js';
import { firstGrapheme } from '../lib/format.js';

const EMOJI_PICKS = ['📁', '📱', '🎬', '🖼️', '✨', '➡️', '💬', '🔤', '🌈', '🧩', '🏷️', '💜', '🌿', '🔥', '☁️', '⭐'];

// Create (no folder passed) or edit a folder
export function openFolderEditor({ folder, onCreated } = {}) {
  let emoji = folder ? folder.emoji : '📁';
  let hue = folder ? folder.hue : HUES[state.folders.length % HUES.length];

  const nameInput = h('input', {
    class: 'input',
    id: 'folder-name',
    value: folder ? folder.name : '',
    maxlength: 40,
    placeholder: 'Например: Стрелки',
  });
  const emojiInput = h('input', {
    class: 'input emoji-input',
    id: 'folder-emoji',
    value: emoji,
    maxlength: 12,
    'aria-label': 'Эмодзи',
  });
  emojiInput.addEventListener('input', () => {
    emoji = firstGrapheme(emojiInput.value) || '📁';
    emojiInput.value = emoji;
  });

  const picks = h(
    'div',
    { class: 'emoji-row' },
    EMOJI_PICKS.map((e) =>
      h(
        'button',
        {
          class: 'emoji-chip',
          type: 'button',
          onClick: () => {
            emoji = e;
            emojiInput.value = e;
          },
        },
        e
      )
    )
  );

  const swatchNodes = HUES.map((hv) => {
    const btn = h('button', {
      class: 'swatch',
      type: 'button',
      style: `--hue:${hv}`,
      'aria-label': `Цвет ${hv}`,
      'aria-pressed': String(hv === hue),
      onClick: () => {
        hue = hv;
        swatchNodes.forEach((n, i) => n.setAttribute('aria-pressed', String(HUES[i] === hue)));
      },
    });
    return btn;
  });

  const save = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    if (folder) {
      await updateFolder(folder.id, { name, emoji, hue });
      toast('Папка обновлена', { icon: 'folder' });
    } else {
      const created = await createFolder({ name, emoji, hue });
      if (onCreated) onCreated(created);
      toast('Папка создана', { icon: 'folder' });
    }
    sheet.close();
  };

  const form = h(
    'form',
    { class: 'form', onSubmit: (e) => { e.preventDefault(); save(); } },
    h('label', { class: 'field', for: 'folder-name' }, h('span', { class: 'field__label' }, 'Название'), nameInput),
    h(
      'div',
      { class: 'field' },
      h('label', { class: 'field__label', for: 'folder-emoji' }, 'Значок'),
      h('div', { class: 'emoji-line' }, emojiInput, picks)
    ),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Цвет'), h('div', { class: 'swatches' }, swatchNodes)),
    h('button', { class: 'btn btn--primary btn--block', type: 'submit' }, folder ? 'Сохранить' : 'Создать папку')
  );
  const sheet = openSheet({ title: folder ? 'Изменить папку' : 'Новая папка', body: form, size: 'sm' });
  nameInput.focus();
}
