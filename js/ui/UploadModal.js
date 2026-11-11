// "Add elements" sheet: pick many files, name them, choose folder and tags.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { openFolderEditor } from './FolderEditor.js';
import { toast } from './Toast.js';
import { state, getFolder, addElements, createFolder } from '../store.js';
import { detectKind, toneOfBlob } from '../lib/image.js';
import { uid } from '../lib/id.js';
import { prettyName, parseTags } from '../lib/format.js';

export const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif,.png,.jpg,.jpeg,.webp,.svg,.gif';
const LAST_FOLDER_KEY = 'stash:lastFolder';

function readLastFolder() {
  try {
    return localStorage.getItem(LAST_FOLDER_KEY);
  } catch (e) {
    return null;
  }
}
function writeLastFolder(id) {
  try {
    localStorage.setItem(LAST_FOLDER_KEY, id);
  } catch (e) {
    /* storage may be unavailable */
  }
}

export function openUpload({ files = [], folderId = null } = {}) {
  let items = []; // { id, file, name, url }
  let target = [folderId, readLastFolder(), state.folders[0] && state.folders[0].id].find(
    (id) => id && getFolder(id)
  );

  const input = h('input', { type: 'file', multiple: true, accept: ACCEPT, hidden: true, id: 'upload-input' });
  const list = h('div', { class: 'up-list' });
  const dropzone = h(
    'button',
    { class: 'dropzone', type: 'button', onClick: () => input.click() },
    icon('upload', 26),
    h('strong', null, 'Выбрать файлы'),
    h('span', null, 'PNG, SVG, JPG, WebP. Можно сразу много.')
  );
  // Folder list: one tap picks the destination, the last chip creates a new folder on the spot
  const chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Папка' });
  function paintChips(scroll = false) {
    chips.replaceChildren(
      ...state.folders.map((f) =>
        h(
          'button',
          {
            class: 'chip' + (f.id === target ? ' is-active' : ''),
            type: 'button',
            role: 'radio',
            'aria-checked': String(f.id === target),
            style: `--hue:${f.hue}`,
            onClick: () => {
              target = f.id;
              paintChips();
            },
          },
          h('span', { class: 'chip__emoji' }, f.emoji),
          f.name
        )
      ),
      h(
        'button',
        {
          class: 'chip chip--new',
          type: 'button',
          onClick: () =>
            openFolderEditor({
              onCreated: (created) => {
                target = created.id;
                paintChips(true);
              },
            }),
        },
        icon('plus', 14),
        'Новая папка'
      )
    );
    const active = chips.querySelector('.is-active');
    if (scroll && active) chips.scrollTop = Math.max(0, active.offsetTop - 8);
  }
  paintChips();
  const tagsInput = h('input', { class: 'input', id: 'upload-tags', placeholder: 'arrow, minimal, story' });
  const saveBtn = h('button', { class: 'btn btn--primary btn--block', type: 'button', disabled: true, onClick: save }, 'Добавить');

  function paint() {
    list.replaceChildren(
      ...items.map((it) => {
        it.thumbEl = h('div', { class: 'up-row__thumb', 'data-tone': it.tone || 'light' }, h('img', { src: it.url, alt: '' }));
        return h(
          'div',
          { class: 'up-row' },
          it.thumbEl,
          h('input', {
            class: 'input up-row__name',
            value: it.name,
            'aria-label': 'Название',
            onInput: (e) => (it.name = e.target.value),
          }),
          h(
            'button',
            {
              class: 'icon-btn icon-btn--sm',
              type: 'button',
              'aria-label': 'Убрать',
              onClick: () => {
                URL.revokeObjectURL(it.url);
                items = items.filter((x) => x.id !== it.id);
                paint();
              },
            },
            icon('close', 16)
          )
        );
      })
    );
    saveBtn.disabled = !items.length;
    saveBtn.textContent = items.length ? `Добавить: ${items.length}` : 'Добавить';
    dropzone.classList.toggle('is-compact', items.length > 0);
  }

  function addFiles(fileList) {
    let skipped = 0;
    for (const file of fileList) {
      if (!detectKind(file)) {
        skipped++;
        continue;
      }
      const item = { id: uid(), file, name: prettyName(file.name), url: URL.createObjectURL(file), tone: 'light', thumbEl: null };
      items.push(item);
      // pick the backdrop in the background; update the thumb in place so typing is not interrupted
      toneOfBlob(file)
        .then((tone) => {
          item.tone = tone;
          if (item.thumbEl) item.thumbEl.dataset.tone = tone;
        })
        .catch(() => {});
    }
    if (skipped) toast(`Пропущено файлов: ${skipped} (неподдерживаемый формат)`, { tone: 'error', icon: 'close' });
    paint();
  }

  async function save() {
    if (!items.length) return;
    saveBtn.disabled = true;
    if (!target) {
      const f = await createFolder({ name: 'Мои элементы', emoji: '🗂️', hue: 265 });
      target = f.id;
    }
    const tags = parseTags(tagsInput.value);
    const result = await addElements(
      items.map((it) => ({ file: it.file, name: it.name, tags, folderId: target })),
      (done, total) => (saveBtn.textContent = `Загрузка ${done}/${total}`)
    );
    writeLastFolder(target);
    sheet.close();
    if (result.added) toast(`Добавлено: ${result.added}`, { icon: 'plus' });
    if (result.failed) toast(`Не удалось добавить: ${result.failed}`, { tone: 'error', icon: 'close' });
  }

  input.addEventListener('change', () => {
    addFiles(input.files);
    input.value = '';
  });

  const body = h(
    'div',
    { class: 'form' },
    input,
    dropzone,
    list,
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'В какую папку добавить'), chips),
    h(
      'label',
      { class: 'field', for: 'upload-tags' },
      h('span', { class: 'field__label' }, 'Теги для всех (необязательно)'),
      tagsInput
    )
  );

  const sheet = openSheet({
    title: 'Добавить элементы',
    body,
    footer: saveBtn,
    size: 'md',
    onClose: () => items.forEach((it) => URL.revokeObjectURL(it.url)),
  });

  requestAnimationFrame(() => paintChips(true));
  if (files.length) addFiles(files);
  return sheet;
}
