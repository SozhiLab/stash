// Share a single folder as a ZIP pack, or bring such a pack in.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { toast } from './Toast.js';
import { createBackup, restoreBackup, folderFileName } from '../services/backup.js';
import { shareFile, downloadBlob } from '../services/share.js';
import { plural, formatSize, EL_FORMS } from '../lib/format.js';

export function openFolderExport(folder) {
  const status = h('p', { class: 'backup__text' }, 'Упаковываю папку…');
  const actions = h('div', { class: 'sheet__actions', hidden: true });
  const note = h('p', { class: 'backup__note', hidden: true }, 'Получатель открывает Штучки → «Новая папка» → «Импортировать папку» и выбирает этот файл.');
  const body = h('div', { class: 'backup' }, status, actions, note);
  openSheet({ title: `Отправить «${folder.name}»`, body, size: 'sm' });

  createBackup(null, { folderId: folder.id })
    .then((r) => {
      if (!r.elements) {
        status.textContent = 'В этой папке пока нет элементов, отправлять нечего.';
        return;
      }
      const name = folderFileName(folder.name);
      status.textContent = `Готово: ${plural(r.elements, EL_FORMS)}, ${formatSize(r.blob.size)}`;
      actions.replaceChildren(
        h(
          'button',
          {
            class: 'btn btn--primary',
            type: 'button',
            onClick: async () => {
              const res = await shareFile(r.blob, name);
              if (res === 'unsupported') {
                downloadBlob(r.blob, name);
                toast('Файл скачан', { icon: 'download' });
              }
            },
          },
          icon('share', 18),
          'Отправить'
        ),
        h(
          'button',
          { class: 'btn', type: 'button', onClick: () => { downloadBlob(r.blob, name); toast('Файл скачан', { icon: 'download' }); } },
          icon('download', 18),
          'Скачать'
        )
      );
      actions.hidden = false;
      note.hidden = false;
    })
    .catch((e) => {
      console.warn('Folder export failed', e);
      status.textContent = 'Не удалось упаковать папку.';
    });
}

// Opens the file picker and imports the chosen pack. Calls done() when finished.
export function importFolderFromFile(done) {
  const input = h('input', { type: 'file', accept: '.zip,application/zip,application/x-zip-compressed', hidden: true });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    toast('Импортирую…', { icon: 'download', duration: 1200 });
    try {
      const r = await restoreBackup(file);
      if (r.added) toast(`Папка добавлена: ${plural(r.added, EL_FORMS)}`, { icon: 'check' });
      else toast('Всё из этого файла уже есть в приложении', { icon: 'clock' });
      if (done) done(r);
    } catch (e) {
      console.warn('Folder import failed', e);
      toast(e && e.message === 'not-a-backup' ? 'Это не файл «Штучек»' : 'Не удалось прочитать файл', { tone: 'error', icon: 'close' });
    }
  });
  document.body.append(input);
  input.click();
}
