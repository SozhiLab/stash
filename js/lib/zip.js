// Minimal ZIP support for backups. The writer stores files without compression
// (images are already compressed). The reader understands "stored" and "deflate" entries.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const zipEncoder = new TextEncoder();

// files: [{ name, data: Blob | string }]. Returns a Blob (application/zip).
export async function zipCreate(files, onProgress) {
  if (files.length > 65535) throw new Error('Слишком много файлов для одной копии');
  const { time, date } = dosDateTime(new Date());
  const parts = [];
  const central = [];
  let offset = 0;
  let done = 0;

  for (const f of files) {
    const nameBytes = zipEncoder.encode(f.name);
    const blob = f.data instanceof Blob ? f.data : new Blob([zipEncoder.encode(String(f.data))]);
    const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
    const size = blob.size;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, nameBytes.length, true);
    parts.push(local.buffer, nameBytes, blob);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, time, true);
    entry.setUint16(14, date, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, size, true);
    entry.setUint32(24, size, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(entry.buffer, nameBytes);

    offset += 30 + nameBytes.length + size;
    if (offset > 0xfffffff0) throw new Error('Копия получилась слишком большой');
    done++;
    if (onProgress) onProgress(done, files.length);
  }

  const centralSize = central.reduce((sum, p) => sum + (p.byteLength ?? p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

// Returns { names, text(name), blob(name, mime) } for a File/Blob containing a ZIP.
export async function zipRead(file) {
  const tailLen = Math.min(file.size, 22 + 65535);
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not-a-zip');
  const count = tail.getUint16(eocd + 10, true);
  const cdSize = tail.getUint32(eocd + 12, true);
  const cdOffset = tail.getUint32(eocd + 16, true);
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const decoder = new TextDecoder();
  const entries = new Map();
  let p = 0;
  for (let i = 0; i < count; i++) {
    if (p + 46 > cd.byteLength || cd.getUint32(p, true) !== 0x02014b50) throw new Error('bad-zip');
    const nameLen = cd.getUint16(p + 28, true);
    const name = decoder.decode(new Uint8Array(cd.buffer, p + 46, nameLen));
    entries.set(name, {
      method: cd.getUint16(p + 10, true),
      csize: cd.getUint32(p + 20, true),
      offset: cd.getUint32(p + 42, true),
    });
    p += 46 + nameLen + cd.getUint16(p + 30, true) + cd.getUint16(p + 32, true);
  }

  async function entryBlob(name, mime) {
    const e = entries.get(name);
    if (!e) return null;
    const lh = new DataView(await file.slice(e.offset, e.offset + 30).arrayBuffer());
    const start = e.offset + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    const raw = file.slice(start, start + e.csize);
    if (e.method === 0) return new Blob([raw], { type: mime || '' });
    if (e.method === 8 && typeof DecompressionStream !== 'undefined') {
      const out = await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      return new Blob([out], { type: mime || '' });
    }
    throw new Error('Неподдерживаемый способ сжатия в архиве');
  }

  return {
    names: [...entries.keys()],
    blob: entryBlob,
    async text(name) {
      const b = await entryBlob(name, 'text/plain');
      if (!b) throw new Error('missing-entry');
      return b.text();
    },
  };
}
