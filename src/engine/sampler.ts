/* ------------------------------------------------------------------ */
/*  Pixel sampler — converts a raster source into stable particle data */
/* ------------------------------------------------------------------ */

export interface SampleData {
  count: number;
  width: number;
  height: number;
  /** world-space home positions (x,y,z) */
  home: Float32Array;
  /** target colors rgb 0..1 */
  color: Float32Array;
  /** sampling uv in source pixel space (for video re-sampling) */
  pixIndex: Int32Array;
  /** per-particle random seeds */
  seedA: Float32Array;
  seedB: Float32Array;
  /** unit-ish spread directions (x,y,z) * random magnitude */
  spreadDir: Float32Array;
  /** size multiplier per particle */
  sizeMul: Float32Array;
  luma: Float32Array;
}

/** deterministic 0..1 hash */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export interface SampleOptions {
  maxDim: number;      // sampling raster cap
  density: number;     // 0..1
  countCap: number;    // hard particle cap
  aspectWorld: number; // world half-height fit scale for y
}

/**
 * Importance-guided grid sampling. Cells are visited on a fixed jittered
 * grid; each particle stores the exact pixel index so video re-sampling
 * is temporally stable (no flicker).
 */
export function sampleSource(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  sw: number,
  sh: number,
  opts: SampleOptions,
): SampleData | null {
  const { maxDim, density, countCap, aspectWorld } = opts;
  if (!sw || !sh) return null;

  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const w = Math.max(2, Math.round(sw * scale));
  const h = Math.max(2, Math.round(sh * scale));

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (!cx) return null;
  cx.drawImage(source, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = cx.getImageData(0, 0, w, h).data;
  } catch {
    return null; // CORS-tainted
  }

  /* world-space fit (contain): y in [-fit, fit] */
  const imgAspect = sw / sh;
  const s = Math.min(0.88, (aspectWorld * 0.88) / imgAspect);
  const halfH = s;
  const halfW = s * imgAspect;

  /* cell size: density 0 => 14px cells, 1 => 2px cells */
  const cell = Math.max(1.6, 14 - density * 12);
  const jitter = cell * 0.34;

  interface Cand { w: number; px: number; py: number; i: number; r: number; g: number; b: number; l: number }
  const cands: Cand[] = [];
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
  }

  let idx = 0;
  for (let gy = 0; gy < h; gy += cell) {
    for (let gx = 0; gx < w; gx += cell) {
      idx++;
      const jx = (hash(idx) - 0.5) * 2 * jitter;
      const jy = (hash(idx * 1.7 + 9) - 0.5) * 2 * jitter;
      const px = Math.min(w - 1, Math.max(0, Math.round(gx + cell / 2 + jx)));
      const py = Math.min(h - 1, Math.max(0, Math.round(gy + cell / 2 + jy)));
      const pi = py * w + px;
      const a = data[pi * 4 + 3] / 255;
      if (a < 0.06) continue;
      const l = lum[pi];
      /* edge strength from horizontal luma gradient */
      const lL = px > 0 ? lum[pi - 1] : l;
      const lR = px < w - 1 ? lum[pi + 1] : l;
      const edge = Math.min(1, Math.abs(lR - lL) * 2.4);
      const weight = a * (0.26 + 0.62 * Math.min(1, l * 1.5) + edge * 0.55);
      cands.push({
        w: weight, px, py, i: pi,
        r: data[pi * 4] / 255, g: data[pi * 4 + 1] / 255, b: data[pi * 4 + 2] / 255, l,
      });
    }
  }
  if (!cands.length) return null;

  /* deterministic weighted trimming with slight hash fuzz */
  let picked = cands;
  if (cands.length > countCap) {
    picked = cands
      .map((c, k) => ({ c, key: c.w * (0.72 + 0.5 * hash(k * 3.3 + 1)) }))
      .sort((a, b) => b.key - a.key)
      .slice(0, countCap)
      .map((o) => o.c);
    picked.sort((a, b) => a.i - b.i);
  }

  const n = picked.length;
  const home = new Float32Array(n * 3);
  const color = new Float32Array(n * 3);
  const pixIndex = new Int32Array(n);
  const seedA = new Float32Array(n);
  const seedB = new Float32Array(n);
  const spreadDir = new Float32Array(n * 3);
  const sizeMul = new Float32Array(n);
  const luma = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const c = picked[i];
    const u = c.px / (w - 1);
    const v = c.py / (h - 1);
    home[i * 3] = (u * 2 - 1) * halfW;
    home[i * 3 + 1] = (1 - v * 2) * halfH;
    home[i * 3 + 2] = (c.l - 0.5) * 0.9;
    color[i * 3] = c.r;
    color[i * 3 + 1] = c.g;
    color[i * 3 + 2] = c.b;
    pixIndex[i] = c.i;
    seedA[i] = hash(i * 1.31 + 0.7) * Math.PI * 2;
    seedB[i] = hash(i * 2.17 + 4.2);
    /* random spread direction */
    const th = hash(i * 3.7 + 2) * Math.PI * 2;
    const ph = hash(i * 4.9 + 8) * Math.PI - Math.PI / 2;
    const mag = 0.25 + hash(i * 5.3 + 3) * 0.75;
    spreadDir[i * 3] = Math.cos(th) * Math.cos(ph) * mag;
    spreadDir[i * 3 + 1] = Math.sin(th) * Math.cos(ph) * mag;
    spreadDir[i * 3 + 2] = Math.sin(ph) * mag * 0.7;
    sizeMul[i] = 0.55 + hash(i * 6.1 + 5) * 1.15;
    luma[i] = c.l;
  }

  return { count: n, width: w, height: h, home, color, pixIndex, seedA, seedB, spreadDir, sizeMul, luma };
}

/** read rgb targets for stable pixel indices from a freshly drawn raster */
export function readColorsAt(
  data: Uint8ClampedArray,
  pixIndex: Int32Array,
  out: Float32Array,
  n: number,
) {
  for (let i = 0; i < n; i++) {
    const o = pixIndex[i] * 4;
    out[i * 3] = data[o] / 255;
    out[i * 3 + 1] = data[o + 1] / 255;
    out[i * 3 + 2] = data[o + 2] / 255;
  }
}
