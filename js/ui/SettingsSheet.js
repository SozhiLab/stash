// Settings: appearance, item order, backup, storage, reset.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet, confirmSheet } from './BottomSheet.js';
import { openBackgroundSheet } from './BackgroundSheet.js';
import { openBackupSheet } from './BackupSheet.js';
import { Segmented } from './Segmented.js';
import { toast } from './Toast.js';
import { getPref, setPref } from '../services/prefs.js';
import { getBackgroundState } from '../services/background.js';
import { repository } from '../data/repository.js';
import { getTheme, setTheme } from '../services/theme.js';
import { autoTagExisting } from '../store.js';
import { formatSize } from '../lib/format.js';

function settingsGroup(title, children) {
  return h('section', { class: 'set-group' }, h('h3', { class: 'set-group__title' }, title), h('div', { class: 'set-card' }, children));
}

function settingsRow({ iconName, title, hint, onClick, danger = false }) {
  const hintEl = hint ? h('em', null, hint) : null;
  const node = h(
    'button',
    { class: 'set-row' + (danger ? ' set-row--danger' : ''), type: 'button', onClick },
    h('span', { class: 'set-row__ico' }, icon(iconName, 20)),
    h('span', { class: 'set-row__text' }, h('strong', null, title), hintEl),
    icon('chevron', 18)
  );
  return { node, hintEl };
}

function settingsControl(title, hint, control) {
  return h(
    'div',
    { class: 'set-ctl' },
    h('div', { class: 'set-ctl__head' }, h('strong', null, title), hint ? h('em', null, hint) : null),
    control
  );
}

function storageBlock() {
  const text = h('em', null, 'Считаю…');
  const action = h('button', { class: 'btn btn--sm', type: 'button', hidden: true }, 'Включить защиту');
  const node = h(
    'div',
    { class: 'set-ctl' },
    h('div', { class: 'set-ctl__head' }, h('strong', null, 'Хранилище на устройстве'), text),
    action
  );

  async function refresh() {
    if (!(navigator.storage && navigator.storage.estimate)) {
      text.textContent = 'Недоступно в этом браузере';
      return;
    }
    const [est, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false),
    ]);
    const used = formatSize(est.usage || 0);
    text.textContent = persisted
      ? `Занято ${used}. Защита от автоочистки включена.`
      : `Занято ${used}. Браузер может очистить данные, если долго не открывать приложение.`;
    action.hidden = persisted || !navigator.storage.persist;
  }
  action.addEventListener('click', async () => {
    const ok = await navigator.storage.persist();
    toast(ok ? 'Защита включена' : 'Браузер не разрешил. Добавьте приложение на экран «Домой»', {
      icon: ok ? 'check' : 'close',
      tone: ok ? 'success' : 'error',
      duration: ok ? 1700 : 3200,
    });
    refresh();
  });
  refresh().catch(() => (text.textContent = 'Не удалось определить'));
  return node;
}

export function openSettingsSheet() {
  const theme = settingsControl(
    'Тема',
    'Авто следует настройкам телефона',
    Segmented({
      label: 'Тема',
      value: getTheme(),
      options: [
        { id: 'system', label: 'Авто' },
        { id: 'light', label: 'Светлая' },
        { id: 'dark', label: 'Тёмная' },
      ],
      onChange: (v) => setTheme(v),
    })
  );

  const bgHint = () => (getBackgroundState().blob ? 'Своё фото' : 'Не выбран');
  const bg = settingsRow({
    iconName: 'image',
    title: 'Фон приложения',
    hint: bgHint(),
    onClick: () => openBackgroundSheet({ onClose: () => bg.hintEl && (bg.hintEl.textContent = bgHint()) }),
  });

  const order = settingsControl(
    'Порядок элементов в папке',
    'Сначала новые, по названию или самые используемые',
    Segmented({
      label: 'Порядок элементов',
      value: getPref('sort'),
      options: [
        { id: 'new', label: 'Новые' },
        { id: 'name', label: 'А–Я' },
        { id: 'used', label: 'Частые' },
      ],
      onChange: (v) => setPref('sort', v),
    })
  );

  const autotags = settingsControl(
    'Автотеги при загрузке',
    'Цвет, форма, слова из названия файла и название папки',
    Segmented({
      label: 'Автотеги',
      value: getPref('autotags') ? 'on' : 'off',
      options: [
        { id: 'on', label: 'Включены' },
        { id: 'off', label: 'Выключены' },
      ],
      onChange: (v) => setPref('autotags', v === 'on'),
    })
  );

  const retag = settingsRow({
    iconName: 'plus',
    title: 'Проставить теги для старых элементов',
    hint: 'Добавит автотеги к тому, что уже в библиотеке. Свои теги сохранятся',
    onClick: async () => {
      if (retag.hintEl) retag.hintEl.textContent = 'Работаю…';
      const n = await autoTagExisting((d, t) => retag.hintEl && (retag.hintEl.textContent = `Обработано ${d} из ${t}`));
      if (retag.hintEl) retag.hintEl.textContent = 'Добавит автотеги к тому, что уже в библиотеке. Свои теги сохранятся';
      toast(n ? `Теги добавлены: ${n}` : 'Новых тегов нет', { icon: 'plus' });
    },
  });

  const backup = settingsRow({
    iconName: 'download',
    title: 'Резервная копия',
    hint: 'Сохранить или восстановить всё одним файлом',
    onClick: () => openBackupSheet(),
  });

  const reset = settingsRow({
    iconName: 'trash',
    title: 'Стереть все данные',
    hint: 'Удалить папки и элементы с этого устройства',
    danger: true,
    onClick: async () => {
      const ok = await confirmSheet({
        title: 'Стереть все данные?',
        message: 'Все папки, элементы и фон будут удалены с этого устройства без возможности восстановления. Сначала сделайте резервную копию.',
        confirmLabel: 'Стереть всё',
      });
      if (!ok) return;
      await repository.clearAll();
      location.hash = '#/';
      location.reload();
    },
  });

  const body = h(
    'div',
    { class: 'settings' },
    settingsGroup('Оформление', [theme, bg.node]),
    settingsGroup('Элементы', [order, autotags, retag.node]),
    settingsGroup('Данные', [backup.node, storageBlock()]),
    settingsGroup('Сброс', [reset.node]),
    h('p', { class: 'set-foot' }, 'Штуки. Всё хранится только на этом устройстве.')
  );
  openSheet({ title: 'Настройки', body, size: 'md' });
}
