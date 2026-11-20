// "Opened in a browser" prompts: a bottom card after 10 seconds, then a card at the top of Home.
// Both lead to an animated step-by-step guide for adding the app to the Home Screen.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { openBackupSheet } from './BackupSheet.js';

const SNOOZE_KEY = 'stash:installSnooze';
const POPUP_DONE_KEY = 'stash:installPopupDone';
const SNOOZE_DAYS = 3;
const POPUP_DELAY_MS = 10000;
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
  const list = h(
    'ol',
    { class: 'howto__list' },
    steps.map((t, i) =>
      h(
        'li',
        { class: 'howto__step' },
        h('button', { class: 'howto__btn', type: 'button', onClick: () => go(i) }, h('span', { class: 'howto__n' }, String(i + 1)), h('span', null, t))
      )
    )
  );
  const node = h('div', { class: 'demo' }, h('div', { class: 'demo__phone' }, stage), list);
  let index = 0;
  let timer = null;

  function go(i) {
    index = (i + steps.length) % steps.length;
    scenes.forEach((s, k) => s.classList.toggle('is-active', k === index));
    scenes.forEach((s, k) => s.classList.toggle('is-past', k < index));
    [...list.children].forEach((li, k) => li.classList.toggle('is-active', k === index));
    stage.dataset.step = String(index);
    clearInterval(timer);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = setInterval(() => go(index + 1), STEP_MS);
  }
  go(0);
  return { node, stop: () => clearInterval(timer), go };
}

export function openHowTo(initial) {
  let p = initial || platform();
  if (p === 'other') p = 'ios';
  let demo = null;
  const content = h('div', { class: 'howto__content' });
  const seg = h('div', { class: 'seg', role: 'tablist' });
  const render = () => {
    if (demo) demo.stop();
    seg.replaceChildren(
      ...[['ios', 'iPhone'], ['android', 'Android']].map(([k, label]) =>
        h('button', { class: 'seg__btn' + (k === p ? ' is-active' : ''), type: 'button', role: 'tab', onClick: () => { p = k; render(); } }, label)
      )
    );
    content.replaceChildren(buildHowTo(p));
  };
  const buildHowTo = (p) => {
  const steps =
    p === 'ios'
      ? [
          'Нажмите три точки «•••» в нижней панели Safari.',
          'Выберите «Поделиться».',
          'Выберите «На экран «Домой»».',
          'Нажмите «Добавить» в правом верхнем углу.',
          'Открывайте Штучки с нового значка на экране.',
        ]
      : [
          'Откройте меню браузера (три точки).',
          'Выберите «Установить приложение».',
          'Подтвердите установку.',
          'Открывайте Штучки с нового значка на экране.',
        ];
  demo = HowToDemo(steps, p === 'ios' ? iosScenes() : androidScenes());
  return h(
    'div',
    null,
    installEvent && p === 'android'
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
    demo.node,
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
  };
  const body = h('div', { class: 'howto' }, seg, content);
  render();
  const sheet = openSheet({ title: 'Добавить на экран «Домой»', body, size: 'md', onClose: () => demo && demo.stop() });
  return sheet;
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

export function startInstallPrompt() {
  if (!canPrompt() || popupDone()) return;
  const tryShow = () => {
    const root = document.getElementById('overlay-root');
    const busy = (root && root.childElementCount > 0) || document.querySelector('.promo');
    if (busy || document.hidden) return setTimeout(tryShow, 4000);
    showPopup();
  };
  setTimeout(tryShow, POPUP_DELAY_MS);
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
