// First-run walkthrough: a spotlight moves over real parts of the app while a card explains each one.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { state } from '../store.js';
import { openUpload } from './UploadModal.js';

const TOUR_KEY = 'stash:tourDone';
const APP_ICON_URL = 'icons/icon-192.png';

const TOUR_STEPS = [
  {
    title: 'Добро пожаловать в Штучки',
    text: 'Личная библиотека элементов для монтажа: картинки, стикеры, шейпы. Покажу, как тут всё устроено, это займёт минуту.',
    hero: true,
  },
  {
    target: '.folder-grid .folder',
    title: 'Папки',
    text: 'Элементы лежат в папках. Нажмите на папку, чтобы открыть её. Удерживайте и перетащите, чтобы поменять порядок.',
  },
  {
    target: '.fab',
    title: 'Добавляйте элементы',
    text: 'PNG, SVG, JPG, WebP и GIF. Можно выбрать сразу много файлов, теги подберутся сами.',
  },
  {
    target: '.search',
    title: 'Поиск',
    text: 'Ищите по названию или тегу, нужный элемент найдётся за секунду.',
  },
  {
    target: '.pills',
    title: 'Разделы',
    text: 'В «Избранное» попадают отмеченные звёздочкой элементы, а «Недавние» дают быстрый доступ к тому, чем вы пользовались последним.',
  },
  {
    title: 'Внутри папки',
    text: 'Тап по карточке копирует картинку. Кнопка «Поделиться» под ней сразу открывает выбор приложения, например CapCut. Долгое нажатие включает выбор сразу нескольких элементов.',
    icon: 'copy',
  },
  {
    target: '.head__actions',
    title: 'Фон, настройки и копия',
    text: 'Меняйте фон и тему приложения. Там же резервная копия: все элементы хранятся только на этом устройстве, поэтому сохраняйте копию одним файлом, чтобы не потерять их при очистке браузера, смене телефона или переносе приложения на экран «Домой».',
  },
  {
    title: 'Попробуйте сами',
    text: 'Добавьте первый элемент, он появится в папке. Потом подскажем, как закрепить приложение на экране «Домой».',
    last: true,
  },
];

export const tourDone = () => {
  try {
    return localStorage.getItem(TOUR_KEY) === '1';
  } catch (e) {
    return true;
  }
};
const markDone = () => {
  try {
    localStorage.setItem(TOUR_KEY, '1');
    localStorage.setItem('stash:dragHint', '1');
  } catch (e) {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event('stash:tour-done'));
};

export function startTour() {
  if (document.querySelector('.tour')) return;
  if (location.hash && location.hash !== '#/' && location.hash !== '#') location.hash = '#/';
  let index = 0;

  const hole = h('div', { class: 'tour__hole' });
  const count = h('div', { class: 'tour__count' });
  const dots = h('div', { class: 'tour__dots' }, TOUR_STEPS.map(() => h('span')));
  const art = h('div', { class: 'tour__art' });
  const title = h('h2', { class: 'tour__title' });
  const text = h('p', { class: 'tour__text' });
  const later = h('button', { class: 'btn tour__later', type: 'button' });
  const next = h('button', { class: 'btn btn--primary tour__next', type: 'button' });
  const card = h('div', { class: 'tour__card' }, art, count, title, text, dots, h('div', { class: 'tour__actions' }, later, next));
  const layer = h('div', { class: 'tour', role: 'dialog', 'aria-label': 'Знакомство с приложением' }, hole, card);

  const finish = (andThen) => {
    markDone();
    window.removeEventListener('resize', place);
    layer.classList.remove('is-in');
    setTimeout(() => layer.remove(), 300);
    if (andThen) andThen();
  };

  function place() {
    const step = TOUR_STEPS[index];
    const el = step.target ? document.querySelector(step.target) : null;
    if (!el) {
      layer.classList.add('is-center');
      hole.style.cssText = 'left:50%;top:40%;width:0;height:0;opacity:0';
      card.classList.remove('is-top');
      return;
    }
    layer.classList.remove('is-center');
    const r = el.getBoundingClientRect();
    const pad = 8;
    hole.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;opacity:1`;
    card.classList.toggle('is-top', r.top + r.height / 2 > window.innerHeight * 0.52);
  }

  function show(i) {
    index = i;
    const step = TOUR_STEPS[i];
    const el = step.target ? document.querySelector(step.target) : null;
    if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    card.classList.remove('is-swap');
    void card.offsetWidth;
    card.classList.add('is-swap');
    title.textContent = step.title;
    text.textContent = step.text;
    count.textContent = `${i + 1} из ${TOUR_STEPS.length}`;
    [...dots.children].forEach((d, k) => d.classList.toggle('is-active', k === i));
    art.replaceChildren(
      step.hero ? h('img', { src: APP_ICON_URL, alt: '', draggable: 'false' }) : step.icon ? icon(step.icon, 26) : ''
    );
    art.hidden = !step.hero && !step.icon;
    later.textContent = step.last ? 'Позже' : 'Пропустить';
    next.textContent = step.last ? 'Добавить элемент' : i === 0 ? 'Начать' : 'Далее';
    requestAnimationFrame(place);
  }

  later.addEventListener('click', () => finish());
  next.addEventListener('click', () => {
    if (TOUR_STEPS[index].last) finish(() => openUpload());
    else show(index + 1);
  });
  window.addEventListener('resize', place);
  document.body.append(layer);
  show(0);
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-in')));
}

// First launch only. People who already have elements are not shown it automatically.
export function startOnboarding() {
  if (tourDone()) return;
  if (state.elements.length > 0) {
    markDone();
    return;
  }
  const tick = setInterval(() => {
    if (tourDone()) return clearInterval(tick);
    const root = document.getElementById('overlay-root');
    const onHome = !location.hash || location.hash === '#/' || location.hash === '#';
    if (!onHome || document.hidden || (root && root.childElementCount > 0) || document.querySelector('.promo')) return;
    clearInterval(tick);
    startTour();
  }, 1500);
}
