// Fixed round "+" button. Tap -> system file picker -> upload sheet where the folder is chosen.
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { openUpload, ACCEPT } from './UploadModal.js';
import { openMenu } from './BottomSheet.js';
import { importFolderFromFile } from './FolderTransfer.js';

export function FabAdd({ folderId = null } = {}) {
  const input = h('input', { type: 'file', multiple: true, accept: ACCEPT, hidden: true, id: 'fab-input' });
  input.addEventListener('change', () => {
    const files = [...input.files];
    input.value = '';
    if (files.length) openUpload({ files, folderId });
  });
  let button = null;
  button = h(
    'button',
    { class: 'fab fab--round', type: 'button', 'aria-label': 'Добавить элементы', onClick: () => openMenu(
        [
          { label: 'Добавить элементы', icon: 'plus', run: () => input.click() },
          { label: 'Импортировать папку', icon: 'upload', run: () => importFolderFromFile() },
        ],
        { anchor: button }
      ),
    },
    icon('plus', 28)
  );
  return h('div', { class: 'fab-host' }, input, button);
}
