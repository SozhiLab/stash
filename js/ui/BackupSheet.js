// Backup sheet: pack the whole library into a ZIP, or merge a ZIP back in.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { toast } from './Toast.js';
import { createBackup, restoreBackup, backupFileName } from '../services/backup.js';
import { shareFile, downloadBlob } from '../services/share.js';
import { plural, formatSize, EL_FORMS, FOLDER_FORMS } from '../lib/format.js';

export function openBackupSheet() {
  let current = null; // { blob, name }

  const createBtn = h(
    'button',
    { class: 'btn btn--primary btn--block', type: 'button', onClick: () => makeBackup() },
    icon('download', 18),
    h('span', null, 'Создать копию')
  );
  const ready = h('div', { class: 'backup__ready', hidden: true });

  const restoreInput = h('input', {
    type: 'file',
    hidden: true,
    id: 'restore-input',
    accept: '.zip,application/zip,application/x-zip-compressed',
  });
  const restoreBtn = h(
    'button',
    { class: 'btn btn--block', type: 'button', onClick: () => restoreInput.click() },
    icon('upload', 18),
    h('span', null, 'Выбрать файл копии')
  );
  const restoreNote = h('p', { class: 'backup__note', hidden: true });

  const setLabel = (btn, text) => (btn.lastChild.textContent = text);

  async function makeBackup() {
    createBtn.disabled = true;
    ready.hidden = true;
    setLabel(createBtn, 'Упаковываю…');
    try {
      const result = await createBackup((done, total) => setLabel(createBtn, `Упаковываю ${done}/${total}`));
      if (!result.elements) {
        toast('Пока нечего сохранять', { tone: 'error', icon: 'close' });
        return;
      }
      current = { blob: result.blob, name: backupFileName() };
      showReady(result);
    } catch (e) {
      console.warn('Backup failed', e);
      toast('Не удалось создать копию', { tone: 'error', icon: 'close' });
    } finally {
      createBtn.disabled = false;
      setLabel(createBtn, 'Создать копию заново');
    }
  }

  function showReady(result) {
    ready.replaceChildren(
      h(
        'p',
        { class: 'backup__ok' },
        icon('check', 18),
        h('span', null, `Готово: ${plural(result.elements, EL_FORMS)}, ${plural(result.folders, FOLDER_FORMS)}, ${formatSize(result.blob.size)}`)
      ),
      h(
        'div',
        { class: 'sheet__actions' },
        h(
          'button',
          {
            class: 'btn btn--primary',
            type: 'button',
            onClick: async () => {
              const r = await shareFile(current.blob, current.name);
              if (r === 'unsupported') {
                downloadBlob(current.blob, current.name);
                toast('Файл скачан', { icon: 'download' });
              }
            },
          },
          icon('share', 18),
          'Сохранить'
        ),
        h(
          'button',
          {
            class: 'btn',
            type: 'button',
            onClick: () => {
              downloadBlob(current.blob, current.name);
              toast('Файл скачан', { icon: 'download' });
            },
          },
          icon('download', 18),
          'Скачать'
        )
      ),
      h('p', { class: 'backup__note' }, 'В меню выберите «Сохранить в Файлы» или отправьте файл себе в Telegram.')
    );
    ready.hidden = false;
  }

  restoreInput.addEventListener('change', async () => {
    const file = restoreInput.files && restoreInput.files[0];
    restoreInput.value = '';
    if (!file) return;
    restoreBtn.disabled = true;
    restoreNote.hidden = true;
    setLabel(restoreBtn, 'Восстанавливаю…');
    try {
      const r = await restoreBackup(file, (done, total) => setLabel(restoreBtn, `Восстанавливаю ${done}/${total}`));
      const parts = [`Добавлено: ${plural(r.added, EL_FORMS)}`];
      if (r.folders) parts.push(plural(r.folders, FOLDER_FORMS));
      if (r.skipped) parts.push(`уже были: ${r.skipped}`);
      if (r.failed) parts.push(`не удалось: ${r.failed}`);
      restoreNote.textContent = parts.join(' · ');
      restoreNote.hidden = false;
      toast(r.added ? 'Копия восстановлена' : 'Новых элементов нет', { icon: r.added ? 'check' : 'clock' });
    } catch (e) {
      console.warn('Restore failed', e);
      toast(e && e.message === 'not-a-backup' ? 'Это не файл копии «Штуки»' : 'Не удалось прочитать файл', {
        tone: 'error',
        icon: 'close',
      });
    } finally {
      restoreBtn.disabled = false;
      setLabel(restoreBtn, 'Выбрать файл копии');
    }
  });

  const body = h(
    'div',
    { class: 'backup' },
    h(
      'section',
      { class: 'backup__block' },
      h('h3', null, 'Сохранить'),
      h('p', { class: 'backup__text' }, 'Все папки и элементы одним файлом. Файл можно открыть как обычный ZIP-архив.'),
      createBtn,
      ready
    ),
    h(
      'section',
      { class: 'backup__block' },
      h('h3', null, 'Восстановить'),
      h(
        'p',
        { class: 'backup__text' },
        'Выберите файл копии. Элементы, которые уже есть в приложении, не заменяются и не дублируются.'
      ),
      restoreInput,
      restoreBtn,
      restoreNote
    )
  );

  openSheet({ title: 'Резервная копия', body, size: 'sm' });
}
