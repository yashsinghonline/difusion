/* ------------------------------------------------------------------ */
/*  Minimal store-only ZIP writer (no compression, real valid zip)     */
/* ------------------------------------------------------------------ */

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry { name: string; data: Uint8Array }

export class ZipWriter {
  private entries: Entry[] = [];

  add(name: string, data: Uint8Array) {
    this.entries.push({ name, data });
  }

  finalize(): Blob {
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;

    const u16 = (v: number) => new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
    const u32 = (v: number) => new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]);

    for (const e of this.entries) {
      const nameBytes = enc.encode(e.name);
      const crc = crc32(e.data);
      const size = e.data.length;
      const header = [
        u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0),
        nameBytes,
      ];
      for (const c of header) chunks.push(c);
      chunks.push(e.data);
      central.push(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), nameBytes,
      );
      offset += header.reduce((a, c) => a + c.length, 0) + size;
    }

    const centralStart = offset;
    let centralSize = 0;
    for (const c of central) { chunks.push(c); centralSize += c.length; offset += c.length; }
    chunks.push(
      u32(0x06054b50), u16(0), u16(0),
      u16(this.entries.length), u16(this.entries.length),
      u32(centralSize), u32(centralStart), u16(0),
    );
    return new Blob(chunks as BlobPart[], { type: 'application/zip' });
  }
}
