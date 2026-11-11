// "Фон" sheet: choose a photo from the library, tune how visible it is, remove it.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openSheet } from './BottomSheet.js';
import { toast } from './Toast.js';
import {
  getBackgroundState,
  setBackgroundPhoto,
  clearBackground,
  previewVisibility,
  saveVisibility,
} from '../services/background.js';

export function openBackgroundSheet({ onClose } = {}) {
  let previewUrl = null;
  const body = h('div', { class: 'form' });

  const input = h('input', { type: 'file', accept: 'image/*', hidden: true, id: 'bg-input' });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    try {
      await setBackgroundPhoto(file);
      toast('Фон обновлён', { icon: 'image' });
      paint();
    } catch (e) {
      console.warn('Background failed', e);
      toast('Не удалось открыть фото', { tone: 'error', icon: 'close' });
    }
  });

  function paint() {
    const { blob, visibility, min, max } = getBackgroundState();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = blob ? URL.createObjectURL(blob) : null;

    const preview = h(
      'div',
      { class: 'bg-preview' + (blob ? '' : ' is-empty') },
      previewUrl
        ? h('img', { src: previewUrl, alt: 'Текущий фон' })
        : h('span', null, icon('image', 26), h('em', null, 'Фон не выбран'))
    );

    const range = h('input', {
      class: 'range',
      id: 'bg-visibility',
      type: 'range',
      min: Math.round(min * 100),
      max: Math.round(max * 100),
      step: 5,
      value: Math.round(visibility * 100),
      'aria-label': 'Видимость фото',
    });
    range.addEventListener('input', () => previewVisibility(range.value / 100));
    range.addEventListener('change', () => saveVisibility());

    body.replaceChildren(
      input,
      preview,
      h(
        'button',
        { class: 'btn btn--primary btn--block', type: 'button', onClick: () => input.click() },
        icon('image', 18),
        blob ? 'Выбрать другое фото' : 'Выбрать фото'
      ),
      blob
        ? h(
            'label',
            { class: 'field', for: 'bg-visibility' },
            h('span', { class: 'field__label' }, 'Видимость фото'),
            range,
            h('span', { class: 'field__hint' }, 'Если текст плохо читается, сдвиньте ползунок влево.')
          )
        : h('p', { class: 'field__hint' }, 'Выберите любую фотографию из галереи телефона. Она останется только на этом устройстве.'),
      blob
        ? h(
            'button',
            {
              class: 'btn btn--block',
              type: 'button',
              onClick: async () => {
                await clearBackground();
                toast('Фон убран', { icon: 'trash' });
                paint();
              },
            },
            'Убрать фон'
          )
        : null
    );
  }

  paint();
  openSheet({
    title: 'Фон приложения',
    body,
    size: 'sm',
    onClose: () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (onClose) onClose();
    },
  });
}
