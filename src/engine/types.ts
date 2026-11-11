/* ------------------------------------------------------------------ */
/*  DIFUSION — shared parameter model                                  */
/* ------------------------------------------------------------------ */

export type ShapeMode = 'circle' | 'square' | 'soft' | 'sprite';
export type ColorMode = 'original' | 'mono' | 'gradient' | 'palette';
export type LineMode = 'points' | 'streaks';
export type Quality = 'low' | 'balanced' | 'high' | 'ultra';

export interface EngineParams {
  /* field */
  count: number;          // requested particle count
  density: number;        // 0..1 sampling density
  size: number;           // base particle size
  sizeVariance: number;   // 0..1
  shape: ShapeMode;
  /* motion */
  drift: number;          // slow wander
  spread: number;         // displacement from source
  turbulence: number;     // irregular movement
  flow: number;           // directional movement
  flowAngle: number;      // radians
  swirl: number;          // -1..1 rotational
  returnForce: number;    // spring to origin
  /* pointer */
  attraction: number;     // pull toward pointer
  repulsion: number;      // push from pointer
  pointerRadius: number;  // px
  /* depth + camera */
  depth: number;          // z displacement
  parallax: number;       // pointer parallax
  perspective: number;    // projection strength
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;       // radians
  /* color + render */
  colorMode: ColorMode;
  monoColor: string;
  gradientA: string;
  gradientB: string;
  palette: string[];
  opacity: number;        // 0..1
  glow: number;           // 0..1 additive
  trails: number;         // 0..1 persistence
  lineMode: LineMode;
  background: string;
  transparent: boolean;
  quality: Quality;
  /* animation */
  speed: number;
  amplitude: number;
  playing: boolean;
  customSprite: string | null;
}

export const DEFAULT_PARAMS: EngineParams = {
  count: 18000,
  density: 0.62,
  size: 2.1,
  sizeVariance: 0.62,
  shape: 'soft',
  drift: 0.22,
  spread: 0.12,
  turbulence: 0.32,
  flow: 0.22,
  flowAngle: 0.6,
  swirl: 0.18,
  returnForce: 0.48,
  attraction: 0.2,
  repulsion: 0.9,
  pointerRadius: 150,
  depth: 0.55,
  parallax: 0.7,
  perspective: 0.5,
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  colorMode: 'original',
  monoColor: '#c9f158',
  gradientA: '#c9f158',
  gradientB: '#7a5cff',
  palette: ['#c9f158', '#ff5c38', '#7a5cff', '#f5f5f5'],
  opacity: 0.95,
  glow: 0.45,
  trails: 0.22,
  lineMode: 'points',
  background: '#050506',
  transparent: false,
  quality: 'high',
  speed: 0.8,
  amplitude: 0.85,
  playing: true,
  customSprite: null,
};

/* video-specific parameters */
export interface VideoParams {
  loop: boolean;
  muted: boolean;
  rate: number;          // playback speed
  trimStart: number;     // seconds
  trimEnd: number;       // seconds (0 = duration)
  sampleRate: number;    // fps at which pixels are re-read
  smoothing: number;     // 0..1 color interpolation
  audioReactive: boolean;
}

export const DEFAULT_VIDEO: VideoParams = {
  loop: true,
  muted: true,
  rate: 1,
  trimStart: 0,
  trimEnd: 0,
  sampleRate: 18,
  smoothing: 0.45,
  audioReactive: false,
};

export function hardwareCap(): number {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  if (mobile) return 16000;
  if (mem >= 8 && cores >= 8) return 64000;
  if (mem >= 4) return 40000;
  return 22000;
}

export function qualityCountMul(q: Quality): number {
  return q === 'low' ? 0.4 : q === 'balanced' ? 0.7 : q === 'ultra' ? 1.25 : 1;
}
export function qualityDprCap(q: Quality): number {
  return q === 'low' ? 1 : q === 'balanced' ? 1.5 : q === 'ultra' ? 2.25 : 2;
}

export function hexToRgb01(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h || '000000', 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
