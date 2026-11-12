// Content fingerprint used to spot duplicates. SHA-256 when available, a simple fallback otherwise.
export async function hashBlob(blob) {
  const buf = await blob.arrayBuffer();
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    /* insecure context: use the fallback below */
  }
  const bytes = new Uint8Array(buf);
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < bytes.length; i++) {
    a = Math.imul(a ^ bytes[i], 0x01000193) >>> 0;
    b = (Math.imul(b, 31) + bytes[i]) >>> 0;
  }
  return `f${bytes.length.toString(16)}-${a.toString(16)}-${b.toString(16)}`;
}
