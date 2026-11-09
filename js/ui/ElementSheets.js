// Sheets for a single element: edit name/tags, move to folder, large preview.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { toast } from './Toast.js';
import { state, getFolder, getBlob, updateElement, moveElement } from '../store.js';
import { parseTags, formatSize } from '../lib/format.js';
import { copyElement, shareElement, downloadElement } from '../actions/elementActions.js';

function actionButton(label, iconName, onClick) {
  return h('button', { class: 'btn', type: 'button', onClick }, icon(iconName, 18), label);
}

export function openElementEditor(el) {
  const nameInput = h('input', { class: 'input', id: 'el-name', value: el.name, maxlength: 80, placeholder: 'Название' });
  const tagsInput = h('input', {
    class: 'input',
    id: 'el-tags',
    value: (el.tags || []).join(', '),
    placeholder: 'arrow, minimal, story',
  });
  const save = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    await updateElement(el.id, { name, tags: parseTags(tagsInput.value) });
    sheet.close();
    toast('Сохранено');
  };
  const form = h(
    'form',
    { class: 'form', onSubmit: (e) => { e.preventDefault(); save(); } },
    h('label', { class: 'field', for: 'el-name' }, h('span', { class: 'field__label' }, 'Название'), nameInput),
    h(
      'label',
      { class: 'field', for: 'el-tags' },
      h('span', { class: 'field__label' }, 'Теги'),
      tagsInput,
      h('span', { class: 'field__hint' }, 'Через запятую. По тегам работает поиск.')
    ),
    h('button', { class: 'btn btn--primary btn--block', type: 'submit' }, 'Сохранить')
  );
  const sheet = openSheet({ title: 'Название и теги', body: form, size: 'sm' });
  nameInput.focus();
  nameInput.select();
}

export function openMoveSheet(el) {
  const list = h(
    'div',
    { class: 'move-list' },
    state.folders.map((f) =>
      h(
        'button',
        {
          class: 'move-item' + (f.id === el.folderId ? ' is-current' : ''),
          type: 'button',
          style: `--hue:${f.hue}`,
          disabled: f.id === el.folderId,
          onClick: async () => {
            await moveElement(el.id, f.id);
            sheet.close();
            toast(`Перемещено в «${f.name}»`, { icon: 'folder' });
          },
        },
        h('span', { class: 'move-item__emoji' }, f.emoji),
        h('span', { class: 'move-item__name' }, f.name),
        f.id === el.folderId ? icon('check', 18) : null
      )
    )
  );
  const sheet = openSheet({ title: 'Переместить в папку', body: list, size: 'md' });
}

export function openPreview(el) {
  const img = h('img', { class: 'preview__img', alt: el.name });
  let url = null;
  getBlob(el.id).then((blob) => {
    if (!blob) return;
    url = URL.createObjectURL(blob);
    img.src = url;
  });
  const folder = getFolder(el.folderId);
  const body = h(
    'div',
    { class: 'preview' },
    h('div', { class: 'preview__stage', 'data-tone': el.tone || 'light' }, img),
    h('div', { class: 'preview__meta' }, `${el.kind.toUpperCase()} · ${el.width}×${el.height} · ${formatSize(el.size)}`),
    el.tags && el.tags.length
      ? h('div', { class: 'preview__tags' }, el.tags.map((t) => h('span', { class: 'tag' }, `#${t}`)))
      : null
  );
  const footer = h(
    'div',
    { class: 'sheet__actions sheet__actions--3' },
    actionButton('Копировать', 'copy', () => copyElement(el)),
    actionButton('Поделиться', 'share', () => shareElement(el)),
    actionButton('Скачать', 'download', () => downloadElement(el))
  );
  openSheet({
    title: el.name,
    subtitle: folder ? folder.name : null,
    body,
    footer,
    size: 'lg',
    onClose: () => url && URL.revokeObjectURL(url),
  });
}
