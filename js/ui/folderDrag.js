// Drag folders to reorder them. Mouse: drag after a few pixels. Touch: long press, then drag.
// root: a stable container that holds the .folder-grid. Cards are its children with data-folder-id.
export function enableFolderDrag(root, { onDrop, onActiveChange }) {
  let drag = null; // { card, ghost, offX, offY, id }
  let press = null; // { timer, card, x, y, pointerId, type }
  let scrollRaf = 0;
  let lastY = 0;
  const cards = () => {
    const grid = root.querySelector('.folder-grid');
    return grid ? [...grid.children].filter((c) => c.dataset.folderId) : [];
  };

  function begin(card, x, y) {
    const r = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('folder--ghost');
    ghost.style.width = r.width + 'px';
    ghost.style.left = r.left + 'px';
    ghost.style.top = r.top + 'px';
    document.body.append(ghost);
    card.classList.add('is-placeholder');
    drag = { card, ghost, offX: x - r.left, offY: y - r.top };
    document.body.classList.add('is-dragging');
    if (navigator.vibrate) navigator.vibrate(10);
    if (onActiveChange) onActiveChange(true);
    autoScroll();
  }

  function move(x, y) {
    lastY = y;
    drag.ghost.style.left = x - drag.offX + 'px';
    drag.ghost.style.top = y - drag.offY + 'px';
    const target = cards().find((c) => {
      if (c === drag.card) return false;
      const r = c.getBoundingClientRect();
      return x > r.left && x < r.right && y > r.top && y < r.bottom;
    });
    if (!target) return;
    const list = cards();
    const from = list.indexOf(drag.card);
    const to = list.indexOf(target);
    if (from < to) target.after(drag.card);
    else target.before(drag.card);
  }

  function autoScroll() {
    cancelAnimationFrame(scrollRaf);
    const tick = () => {
      if (!drag) return;
      const edge = 90;
      if (lastY < edge) window.scrollBy(0, -Math.ceil((edge - lastY) / 6));
      else if (lastY > window.innerHeight - edge) window.scrollBy(0, Math.ceil((lastY - (window.innerHeight - edge)) / 6));
      scrollRaf = requestAnimationFrame(tick);
    };
    scrollRaf = requestAnimationFrame(tick);
  }

  function end(commit) {
    clearTimeout(press && press.timer);
    press = null;
    if (!drag) return;
    cancelAnimationFrame(scrollRaf);
    const { card, ghost } = drag;
    drag = null;
    ghost.remove();
    card.classList.remove('is-placeholder');
    document.body.classList.remove('is-dragging');
    // the click that follows a drag must not open the folder
    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 350);
    if (commit && onDrop) onDrop(cards().map((c) => c.dataset.folderId));
    if (onActiveChange) onActiveChange(false);
  }

  root.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.folder');
    if (!card || !card.dataset.folderId || e.target.closest('.folder__more') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    press = { card, x: e.clientX, y: e.clientY, type: e.pointerType };
    if (e.pointerType !== 'mouse') {
      press.timer = setTimeout(() => {
        if (press) begin(card, press.x, press.y);
      }, 380);
    }
  });

  const onMove = (e) => {
    if (drag) {
      e.preventDefault();
      move(e.clientX, e.clientY);
      return;
    }
    if (!press) return;
    const dist = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if (press.type === 'mouse') {
      if (dist > 8) {
        begin(press.card, press.x, press.y);
        move(e.clientX, e.clientY);
      }
    } else if (dist > 10) {
      clearTimeout(press.timer);
      press = null;
    }
  };
  const onUp = () => {
    if (drag) end(true);
    else {
      clearTimeout(press && press.timer);
      press = null;
    }
  };
  const onCancel = () => end(false);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  // once a drag has started the page must not scroll under the finger
  root.addEventListener('touchmove', (e) => drag && e.cancelable && e.preventDefault(), { passive: false });
  // no system menu on long press while dragging
  root.addEventListener(
    'contextmenu',
    (e) => {
      if (!(press || drag)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
  root.addEventListener('dragstart', (e) => e.preventDefault());

  return () => {
    end(false);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };
}
