// Generates the extension icon set (16/32/48/128 px PNG) with zero dependencies.
// Design: dark lightning bolt on an amber rounded square.
// Usage: node tools/make-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- minimal PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function pngEncode(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Lightning bolt in unit coordinates (x, y from top-left).
const BOLT = [
  [0.585, 0.06],
  [0.22, 0.56],
  [0.44, 0.56],
  [0.37, 0.94],
  [0.80, 0.38],
  [0.55, 0.38],
];

const BG = [245, 158, 11];   // amber
const FG = [30, 30, 46];     // dark slate

function render(size) {
  const SS = 4; // 4x4 supersampling for smooth edges
  const big = size * SS;
  const radius = 0.22 * big;
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHits = 0, fgHits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x * SS + sx + 0.5;
          const py = y * SS + sy + 0.5;
          // rounded square covering the full canvas
          const cx = Math.min(Math.max(px, radius), big - radius);
          const cy = Math.min(Math.max(py, radius), big - radius);
          if (Math.hypot(px - cx, py - cy) <= radius) {
            bgHits++;
            if (pointInPoly(px / big, py / big, BOLT)) fgHits++;
          }
        }
      }
      const total = SS * SS;
      const mix = fgHits / total;
      const alpha = Math.round((bgHits / total) * 255);
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(BG[0] * (1 - mix) + FG[0] * mix);
      rgba[i + 1] = Math.round(BG[1] * (1 - mix) + FG[1] * mix);
      rgba[i + 2] = Math.round(BG[2] * (1 - mix) + FG[2] * mix);
      rgba[i + 3] = alpha;
    }
  }
  return rgba;
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const png = pngEncode(size, size, render(size));
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
