// "Opened in a browser" card: suggests adding the app to the Home Screen, with short how-to steps.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { openBackupSheet } from './BackupSheet.js';

const SNOOZE_KEY = 'stash:installSnooze';
const SNOOZE_DAYS = 3;

let installEvent = null; // Chrome on Android can install straight from a button
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
});

function isStandalone() {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true
  );
}

function platform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function snoozed() {
  try {
    return Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0);
  } catch (e) {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
  } catch (e) {
    /* storage unavailable */
  }
}

function step(n, text) {
  return h('li', { class: 'howto__step' }, h('span', { class: 'howto__n' }, String(n)), h('span', null, text));
}

function openHowTo(onDone) {
  const p = platform();
  const steps =
    p === 'ios'
      ? [
          'Нажмите «Поделиться» (квадрат со стрелкой) внизу экрана Safari.',
          'Пролистайте меню вниз и выберите «На экран «Домой»».',
          'Нажмите «Добавить». На экране появится значок «Штуки».',
          'Дальше открывайте приложение только с этого значка.',
        ]
      : [
          'Откройте меню браузера (три точки справа вверху).',
          'Выберите «Установить приложение» или «Добавить на главный экран».',
          'Подтвердите. На экране появится значок «Штуки».',
          'Дальше открывайте приложение только с этого значка.',
        ];
  const body = h(
    'div',
    { class: 'howto' },
    installEvent
      ? h(
          'button',
          {
            class: 'btn btn--primary btn--block',
            type: 'button',
            onClick: async () => {
              installEvent.prompt();
              try {
                await installEvent.userChoice;
              } catch (e) {
                /* dismissed */
              }
              installEvent = null;
              sheet.close();
            },
          },
          'Установить сейчас'
        )
      : null,
    h('ol', { class: 'howto__list' }, steps.map((t, i) => step(i + 1, t))),
    h(
      'div',
      { class: 'howto__note' },
      h('strong', null, 'Важно про уже добавленные элементы. '),
      p === 'ios'
        ? 'Приложение с экрана «Домой» на iPhone хранит данные отдельно от браузера, поэтому сначала сделайте резервную копию здесь, а потом восстановите её в новом приложении (Настройки → Резервная копия).'
        : 'Если в браузере уже есть элементы, на всякий случай сделайте резервную копию (Настройки → Резервная копия). Её можно восстановить в любом месте.'
    ),
    h(
      'button',
      {
        class: 'btn btn--block',
        type: 'button',
        onClick: () => {
          sheet.close();
          openBackupSheet();
        },
      },
      icon('download', 18),
      'Сделать резервную копию'
    )
  );
  const sheet = openSheet({ title: 'Добавить на экран «Домой»', body, size: 'md', onClose: onDone });
}

export function InstallBanner() {
  const mobile = platform() !== 'other';
  if (!mobile || isStandalone() || snoozed()) return null;

  const node = h(
    'aside',
    { class: 'install', role: 'note' },
    h(
      'div',
      { class: 'install__text' },
      h('strong', null, 'Приложение открыто в браузере'),
      h(
        'p',
        null,
        'Чтобы не потерять добавленные элементы и пользоваться как полноценным приложением, добавьте значок на экран «Домой» и открывайте Штуки оттуда.'
      )
    ),
    h(
      'div',
      { class: 'install__actions' },
      h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => openHowTo() }, 'Как это сделать'),
      h(
        'button',
        {
          class: 'btn btn--sm',
          type: 'button',
          onClick: () => {
            snooze();
            node.remove();
          },
        },
        'Напомнить позже'
      )
    )
  );
  return node;
}
