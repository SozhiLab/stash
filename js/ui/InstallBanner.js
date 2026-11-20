// "Opened in a browser" prompts: a bottom card once the person has used the app for a while, then a card at the top of Home.
// Both lead to an animated step-by-step guide for adding the app to the Home Screen.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { state } from '../store.js';
import { openBackupSheet } from './BackupSheet.js';

const SNOOZE_KEY = 'stash:installSnooze';
const POPUP_DONE_KEY = 'stash:installPopupDone';
const SNOOZE_DAYS = 3;
const STEP_MS = 2800;
const APP_ICON = 'icons/icon-192.png';

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

function readKey(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function writeKey(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    /* storage unavailable */
  }
}

const snoozed = () => Date.now() < Number(readKey(SNOOZE_KEY) || 0);
const snooze = () => writeKey(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
const popupDone = () => readKey(POPUP_DONE_KEY) === '1';
const canPrompt = () => platform() !== 'other' && !isStandalone();

// ---------- animated guide ----------
const appIconImg = (cls) =>
  h('img', {
    class: cls,
    src: APP_ICON,
    alt: '',
    draggable: 'false',
    onError: (e) => e.target.classList.add('is-missing'),
  });

const tap = () => h('span', { class: 'demo__tap', 'aria-hidden': 'true' });
const bar = (w) => h('span', { class: 'demo__bar', style: `width:${w}%` });

function pageMock() {
  return h(
    'div',
    { class: 'demo__page' },
    h('div', { class: 'demo__h' }, 'Штучки'),
    h('div', { class: 'demo__cards' }, h('span'), h('span'), h('span'), h('span'))
  );
}

function homeScene() {
  const cells = Array.from({ length: 12 }, (_, i) => h('span', { class: 'demo__cell' + (i === 5 ? ' is-new' : '') }));
  const grid = h('div', { class: 'demo__grid' }, cells);
  cells[5].append(appIconImg('demo__appicon'), h('em', null, 'Штучки'));
  return h('div', { class: 'demo__scene demo__scene--home' }, grid);
}

function iosScenes() {
  return [
    h(
      'div',
      { class: 'demo__scene' },
      pageMock(),
      h(
        'div',
        { class: 'demo__toolbar' },
        h('span', null, '‹'),
        h('span', null, '›'),
        h('span', { class: 'is-target demo__more' }, '•••', tap()),
        h('span', { class: 'demo__book' }),
        h('span', { class: 'demo__tabs' })
      )
    ),
    h(
      'div',
      { class: 'demo__scene' },
      pageMock(),
      h(
        'div',
        { class: 'demo__menu demo__menu--ios' },
        h('div', { class: 'demo__row' }, 'Закладки'),
        h('div', { class: 'demo__row is-target' }, 'Поделиться', icon('share', 16), tap()),
        h('div', { class: 'demo__row' }, 'Найти на странице')
      )
    ),
    h(
      'div',
      { class: 'demo__scene' },
      pageMock(),
      h('div', { class: 'demo__dim' }),
      h(
        'div',
        { class: 'demo__sheet' },
        h('div', { class: 'demo__row' }, 'Скопировать'),
        h('div', { class: 'demo__row' }, 'Добавить в закладки'),
        h('div', { class: 'demo__row is-target' }, 'На экран «Домой»', h('span', { class: 'demo__plus' }, '+'), tap()),
        h('div', { class: 'demo__row' }, 'Напечатать')
      )
    ),
    h(
      'div',
      { class: 'demo__scene demo__scene--dialog' },
      h('div', { class: 'demo__dim is-solid' }),
      h(
        'div',
        { class: 'demo__dialog' },
        h(
          'div',
          { class: 'demo__dialog-head' },
          h('span', null, 'Отменить'),
          h('strong', null, 'На экран «Домой»'),
          h('span', { class: 'is-target' }, 'Добавить', tap())
        ),
        h('div', { class: 'demo__dialog-body' }, appIconImg('demo__appicon'), h('div', { class: 'demo__field' }, 'Штучки'))
      )
    ),
    homeScene(),
  ];
}

function androidScenes() {
  return [
    h(
      'div',
      { class: 'demo__scene' },
      h('div', { class: 'demo__urlbar' }, h('span', { class: 'demo__url' }, 'sozhilab.github.io'), h('span', { class: 'is-target demo__dots' }, '⋮', tap())),
      pageMock()
    ),
    h(
      'div',
      { class: 'demo__scene' },
      h('div', { class: 'demo__urlbar' }, h('span', { class: 'demo__url' }, 'sozhilab.github.io'), h('span', { class: 'demo__dots' }, '⋮')),
      pageMock(),
      h(
        'div',
        { class: 'demo__menu' },
        h('div', { class: 'demo__row' }, 'Новая вкладка'),
        h('div', { class: 'demo__row is-target' }, 'Установить приложение', tap()),
        h('div', { class: 'demo__row' }, 'Настройки')
      )
    ),
    h(
      'div',
      { class: 'demo__scene demo__scene--dialog' },
      h('div', { class: 'demo__dim is-solid' }),
      h(
        'div',
        { class: 'demo__dialog demo__dialog--android' },
        h('div', { class: 'demo__dialog-body' }, appIconImg('demo__appicon'), h('strong', null, 'Установить приложение?')),
        h('div', { class: 'demo__dialog-actions' }, h('span', null, 'Отмена'), h('span', { class: 'is-target' }, 'Установить', tap()))
      )
    ),
    homeScene(),
  ];
}

function HowToDemo(steps, scenes) {
  const stage = h('div', { class: 'demo__stage' }, scenes);
  const count = h('div', { class: 'demo__count' });
  const cap = h('p', { class: 'demo__cap' });
  const dots = h(
    'div',
    { class: 'demo__dots-nav' },
    steps.map((t, i) => h('button', { class: 'demo__dot', type: 'button', 'aria-label': 'Шаг ' + (i + 1), onClick: () => go(i) }))
  );
  const side = h('div', { class: 'demo__side' }, count, cap, dots);
  const node = h('div', { class: 'demo' }, h('div', { class: 'demo__frame' }, h('div', { class: 'demo__phone' }, stage)), side);
  let index = 0;
  let timer = null;

  function go(i) {
    index = (i + steps.length) % steps.length;
    scenes.forEach((s, k) => s.classList.toggle('is-active', k === index));
    [...dots.children].forEach((d, k) => d.classList.toggle('is-active', k === index));
    count.textContent = `Шаг ${index + 1} из ${steps.length}`;
    cap.textContent = steps[index];
    cap.classList.remove('is-swap');
    void cap.offsetWidth;
    cap.classList.add('is-swap');
    clearInterval(timer);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = setInterval(() => go(index + 1), STEP_MS);
  }
  go(0);
  return { node, stop: () => clearInterval(timer), go };
}

const STEPS = {
  ios: [
    'Нажмите три точки «•••» в нижней панели Safari.',
    'Выберите «Поделиться».',
    'Выберите «На экран „Домой“».',
    'Нажмите «Добавить» в правом верхнем углу.',
    'Открывайте Штучки с нового значка на экране.',
  ],
  android: [
    'Откройте меню браузера (три точки).',
    'Выберите «Установить приложение».',
    'Подтвердите установку.',
    'Открывайте Штучки с нового значка на экране.',
  ],
};

export function openHowTo(initial) {
  let p = initial || platform();
  if (p === 'other') p = 'ios';
  let demo = null;
  let noBackup = false;
  const content = h('div', { class: 'howto__content' });
  const seg = h('div', { class: 'seg', role: 'tablist' });

  const close = () => {
    if (demo) demo.stop();
    layer.classList.remove('is-in');
    setTimeout(() => layer.remove(), 320);
  };

  const render = () => {
    if (demo) demo.stop();
    seg.replaceChildren(
      ...[['ios', 'iPhone'], ['android', 'Android']].map(([k, label]) =>
        h('button', { class: 'seg__btn' + (k === p ? ' is-active' : ''), type: 'button', role: 'tab', onClick: () => { p = k; render(); } }, label)
      )
    );
    demo = HowToDemo(STEPS[p], p === 'ios' ? iosScenes() : androidScenes());
    const backup = noBackup
      ? h('p', { class: 'howto__ok' }, 'Отлично, переносить пока нечего. Просто добавьте значок по шагам выше, а резервную копию можно сделать позже в Настройках.')
      : h(
          'div',
          { class: 'howto__backup' },
          h(
            'p',
            { class: 'howto__note' },
            p === 'ios'
              ? 'Приложение на экране «Домой» хранит данные отдельно от браузера. Если элементы уже добавлены, сначала сохраните их в резервную копию.'
              : 'Если в браузере уже есть элементы, на всякий случай сохраните их в резервную копию.'
          ),
          h(
            'div',
            { class: 'howto__btns' },
            h('button', { class: 'btn howto__b', type: 'button', onClick: () => { close(); openBackupSheet(); } }, icon('download', 18), 'Сделать копию'),
            h('button', { class: 'btn howto__b', type: 'button', onClick: () => { noBackup = true; render(); } }, 'Копии нет')
          )
        );
    const direct =
      installEvent && p === 'android'
        ? h(
            'button',
            {
              class: 'btn btn--primary btn--block',
              type: 'button',
              onClick: async () => {
                installEvent.prompt();
                try { await installEvent.userChoice; } catch (e) { /* dismissed */ }
                installEvent = null;
                close();
              },
            },
            'Установить сейчас'
          )
        : null;
    content.replaceChildren(...[direct, demo.node, backup].filter(Boolean));
  };

  const layer = h(
    'div',
    { class: 'promo promo--guide', role: 'dialog', 'aria-label': 'Как добавить на экран «Домой»' },
    h('div', { class: 'promo__dim', onClick: close }),
    h(
      'div',
      { class: 'promo__card' },
      h('button', { class: 'promo__x icon-btn icon-btn--sm', type: 'button', 'aria-label': 'Закрыть', onClick: close }, icon('close', 18)),
      h('h2', { class: 'promo__title promo__title--sm' }, 'Добавить на экран «Домой»'),
      seg,
      content
    )
  );
  render();
  document.body.append(layer);
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-in')));
  return { close };
}

// ---------- bottom card, shown once after 10 seconds ----------
function showPopup() {
  const close = (andThen) => {
    writeKey(POPUP_DONE_KEY, '1');
    layer.classList.remove('is-in');
    setTimeout(() => layer.remove(), 320);
    const home = document.querySelector('.view.home');
    const banner = home && !home.querySelector('.install') ? InstallBanner() : null;
    if (banner) home.prepend(banner);
    if (andThen) andThen();
  };
  const layer = h(
    'div',
    { class: 'promo', role: 'dialog', 'aria-label': 'Приложение открыто в браузере' },
    h('div', { class: 'promo__dim', onClick: () => close() }),
    h(
      'div',
      { class: 'promo__card' },
      h('button', { class: 'promo__x icon-btn icon-btn--sm', type: 'button', 'aria-label': 'Закрыть', onClick: () => close() }, icon('close', 18)),
      h('div', { class: 'promo__art' }, h('span', { class: 'promo__stack' }), appIconImg('promo__icon')),
      h('h2', { class: 'promo__title' }, 'Приложение открыто в браузере'),
      h(
        'p',
        { class: 'promo__text' },
        'Чтобы не потерять добавленные элементы и пользоваться как полноценным приложением, добавьте значок на экран «Домой» и открывайте Штучки оттуда.'
      ),
      h(
        'div',
        { class: 'promo__actions' },
        h('button', { class: 'btn promo__later', type: 'button', onClick: () => close() }, 'Напомнить позже'),
        h('button', { class: 'btn btn--primary promo__go', type: 'button', onClick: () => close(openHowTo) }, 'Как это сделать')
      )
    )
  );
  document.body.append(layer);
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-in')));
}

// Wait until the person has actually used the app: some time spent and something added.
const VISITS_KEY = 'stash:visits';
const ACTIVE_KEY = 'stash:activeSec';
const ready = () => {
  const visits = Number(readKey(VISITS_KEY) || 0);
  const active = Number(readKey(ACTIVE_KEY) || 0);
  const has = state.elements.length > 0;
  return (has && (active >= 120 || visits >= 2)) || (visits >= 3 && active >= 60);
};

export function startInstallPrompt() {
  if (!canPrompt() || popupDone()) return;
  writeKey(VISITS_KEY, String(Number(readKey(VISITS_KEY) || 0) + 1));
  setInterval(() => {
    if (!document.hidden) writeKey(ACTIVE_KEY, String(Number(readKey(ACTIVE_KEY) || 0) + 5));
  }, 5000);
  const tick = setInterval(() => {
    if (document.hidden || popupDone() || !ready()) return;
    const root = document.getElementById('overlay-root');
    if ((root && root.childElementCount > 0) || document.querySelector('.promo')) return;
    clearInterval(tick);
    showPopup();
  }, 5000);
}

// ---------- top card on Home (after the bottom card was closed) ----------
export function InstallBanner() {
  if (!canPrompt() || !popupDone() || snoozed()) return null;

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
        'Чтобы не потерять добавленные элементы и пользоваться как полноценным приложением, добавьте значок на экран «Домой» и открывайте Штучки оттуда.'
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
