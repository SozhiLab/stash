// Copy / share / download for one element, with user feedback.
import { getBlob, markUsed } from '../store.js';
import { copyImage } from '../services/clipboard.js';
import { shareFile, downloadBlob } from '../services/share.js';
import { toPngBlob } from '../lib/image.js';
import { safeFileName } from '../lib/format.js';
import { toast } from '../ui/Toast.js';

// Share/download as PNG when the original is SVG/GIF (most apps cannot take those)
async function exportBlob(el) {
  const blob = await getBlob(el.id);
  if (!blob) throw new Error('Файл не найден');
  if (el.kind === 'svg' || el.kind === 'gif') {
    return { blob: await toPngBlob(blob), ext: 'png' };
  }
  return { blob, ext: el.kind };
}

export async function copyElement(el, cardNode) {
  try {
    await copyImage(() => getBlob(el.id));
    markUsed(el.id);
    toast('Скопировано');
    if (cardNode) {
      cardNode.classList.add('is-copied');
      setTimeout(() => cardNode.classList.remove('is-copied'), 900);
    }
  } catch (e) {
    console.warn('Copy failed', e);
    toast('Не удалось скопировать. Откройте ••• и выберите «Поделиться» или «Скачать»', {
      tone: 'error',
      icon: 'close',
      duration: 3200,
    });
  }
}

export async function shareElement(el) {
  try {
    const { blob, ext } = await exportBlob(el);
    const name = safeFileName(el.name, ext);
    const result = await shareFile(blob, name);
    if (result === 'shared') {
      markUsed(el.id);
    } else if (result === 'unsupported') {
      downloadBlob(blob, name);
      markUsed(el.id);
      toast('Меню «Поделиться» недоступно здесь, файл скачан', { icon: 'download', duration: 2600 });
    }
  } catch (e) {
    console.warn('Share failed', e);
    toast('Не удалось поделиться', { tone: 'error', icon: 'close' });
  }
}

export async function downloadElement(el) {
  try {
    const { blob, ext } = await exportBlob(el);
    downloadBlob(blob, safeFileName(el.name, ext));
    markUsed(el.id);
    toast('Файл скачан', { icon: 'download' });
  } catch (e) {
    console.warn('Download failed', e);
    toast('Не удалось скачать', { tone: 'error', icon: 'close' });
  }
}
