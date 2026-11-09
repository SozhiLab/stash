import { openMenu, confirmSheet } from './BottomSheet.js';
import { openFolderEditor } from './FolderEditor.js';
import { openUpload } from './UploadModal.js';
import { toast } from './Toast.js';
import { state, elementsIn, removeFolder, moveFolder } from '../store.js';
import { plural, EL_FORMS } from '../lib/format.js';

async function deleteFolderFlow(folder, inView) {
  const count = elementsIn(folder.id).length;
  const ok = await confirmSheet({
    title: 'Удалить папку?',
    message: count
      ? `Папка «${folder.name}» и ${plural(count, EL_FORMS)} в ней будут удалены без возможности восстановления.`
      : `Папка «${folder.name}» будет удалена.`,
  });
  if (!ok) return;
  await removeFolder(folder.id);
  toast('Папка удалена', { icon: 'trash' });
  if (inView) location.hash = '#/';
}

// inView: opened from the folder's own screen (adds "add elements", hides reordering)
export function openFolderMenu(folder, anchor, { inView = false } = {}) {
  const idx = state.folders.indexOf(folder);
  const items = [
    inView && { label: 'Добавить элементы', icon: 'plus', run: () => openUpload({ folderId: folder.id }) },
    { label: 'Изменить папку', icon: 'edit', run: () => openFolderEditor({ folder }) },
    !inView && idx > 0 && { label: 'Сдвинуть раньше', icon: 'arrowLeft', run: () => moveFolder(folder.id, -1) },
    !inView &&
      idx < state.folders.length - 1 && { label: 'Сдвинуть позже', icon: 'arrowRight', run: () => moveFolder(folder.id, 1) },
    { separator: true },
    { label: 'Удалить папку', icon: 'trash', danger: true, run: () => deleteFolderFlow(folder, inView) },
  ].filter(Boolean);
  openMenu(items, { anchor, title: folder.name });
}
