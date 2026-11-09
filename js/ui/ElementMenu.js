import { openMenu, confirmSheet } from './BottomSheet.js';
import { openElementEditor, openMoveSheet, openPreview } from './ElementSheets.js';
import { toast } from './Toast.js';
import { toggleFavorite, removeElement } from '../store.js';
import { copyElement, shareElement, downloadElement } from '../actions/elementActions.js';

export function openElementMenu(el, anchor) {
  openMenu(
    [
      { label: 'Скопировать', icon: 'copy', run: () => copyElement(el) },
      { label: 'Поделиться', icon: 'share', run: () => shareElement(el) },
      { label: 'Скачать', icon: 'download', run: () => downloadElement(el) },
      { label: 'Открыть', icon: 'eye', run: () => openPreview(el) },
      { separator: true },
      { label: 'Название и теги', icon: 'edit', run: () => openElementEditor(el) },
      { label: 'Переместить в папку', icon: 'folder', run: () => openMoveSheet(el) },
      {
        label: el.favorite ? 'Убрать из избранного' : 'В избранное',
        icon: el.favorite ? 'starFill' : 'star',
        run: () => toggleFavorite(el.id),
      },
      { separator: true },
      {
        label: 'Удалить',
        icon: 'trash',
        danger: true,
        run: async () => {
          const ok = await confirmSheet({
            title: 'Удалить элемент?',
            message: `«${el.name}» будет удалён без возможности восстановления.`,
          });
          if (ok) {
            await removeElement(el.id);
            toast('Удалено', { icon: 'trash' });
          }
        },
      },
    ],
    { anchor, title: el.name }
  );
}
