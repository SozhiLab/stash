import { toPngBlob } from '../lib/image.js';

export function canCopyImage() {
  return !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);
}

// getBlob must be called synchronously inside the tap handler. A Promise is passed to
// ClipboardItem so Safari keeps the user gesture while the blob loads from storage.
export async function copyImage(getBlob) {
  if (!canCopyImage()) throw new Error('clipboard-unsupported');
  const pngPromise = getBlob().then(toPngBlob);
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngPromise })]);
  } catch (e) {
    // Older engines need a resolved Blob instead of a Promise
    const png = await pngPromise;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  }
}
