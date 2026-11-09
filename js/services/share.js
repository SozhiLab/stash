// Returns 'shared' | 'cancelled' | 'unsupported'
export async function shareFile(blob, fileName) {
  const file = new File([blob], fileName, { type: blob.type });
  if (!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }))) {
    return 'unsupported';
  }
  try {
    await navigator.share({ files: [file], title: fileName });
    return 'shared';
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
