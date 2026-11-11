/* ------------------------------------------------------------------ */
/*  DIFUSION — ParticleEngine                                          */
/*  Raw WebGL points/lines renderer, CPU physics, stable video         */
/*  re-sampling, audio-reactive pulse, trails feedback.                */
/* ------------------------------------------------------------------ */

import {
  EngineParams, VideoParams, clamp, lerp, hexToRgb01,
  qualityCountMul, qualityDprCap, hardwareCap,
} from './types';
import { createProgram, makeBuffer, makeDotTexture, textureFromImage } from './gl';
import { POINT_VERT, POINT_FRAG, LINE_VERT, LINE_FRAG, FADE_VERT, FADE_FRAG } from './shaders';
import { sampleSource, readColorsAt, SampleData } from './sampler';

export interface EngineStats {
  fps: number;
  frameMs: number;
  count: number;
  renderScale: number;
  cap: number;
}

export interface VideoState {
  playing: boolean;
  time: number;
  duration: number;
  live: boolean;
  ended: boolean;
}

export interface EngineEvents {
  onStats?: (s: EngineStats) => void;
  onVideoState?: (v: VideoState) => void;
  onError?: (msg: string) => void;
  onSampling?: (active: boolean) => void;
}

interface Impulse { x: number; y: number; t0: number; str: number }

const MAX_IMPULSES = 6;

export class ParticleEngine {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private P: EngineParams;
  private V: VideoParams;
  private ev: EngineEvents;

  private pointProg!: WebGLProgram;
  private lineProg!: WebGLProgram;
  private fadeProg!: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private lu: Record<string, WebGLUniformLocation | null> = {};
  private dotTex!: WebGLTexture;
  private spriteTex: WebGLTexture | null = null;

  /* particle buffers */
  private cap = 0;
  private n = 0;
  private pos = new Float32Array(0);
  private col = new Float32Array(0);
  private tgt = new Float32Array(0);
  private raw = new Float32Array(0);
  private vel = new Float32Array(0);
  private home = new Float32Array(0);
  private sprd = new Float32Array(0);
  private seedA = new Float32Array(0);
  private seedB = new Float32Array(0);
  private sizeMul = new Float32Array(0);
  private luma = new Float32Array(0);
  private pixIndex = new Int32Array(0);
  private linePos = new Float32Array(0);
  private lineCol = new Float32Array(0);

  private posBuf!: WebGLBuffer;
  private colBuf!: WebGLBuffer;
  private sizeBuf!: WebGLBuffer;
  private linePosBuf!: WebGLBuffer;
  private lineColBuf!: WebGLBuffer;
  private lineTBuf!: WebGLBuffer;
  private bufCap = 0;

  private t = 0;
  private lastT = 0;
  private raf = 0;
  private running = false;
  visible = true;
  private intro = 0;
  private pointer = { nx: 0, ny: 0, active: false, down: false };
  private impulses: Impulse[] = [];

  /* media */
  mediaType: 'image' | 'video' | 'none' = 'none';
  private img: HTMLImageElement | null = null;
  private video: HTMLVideoElement | null = null;
  private live = false;
  private rasterW = 0;
  private rasterH = 0;
  private vCanvas: HTMLCanvasElement | null = null;
  private vCtx: CanvasRenderingContext2D | null = null;
  private lastSample = 0;
  private lastTrimRecheck = 0;

  /* audio reactive */
  private actx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private again: GainNode | null = null;
  private freq: Uint8Array<ArrayBuffer> | null = null;
  private pulse = 0;

  /* stats */
  private emaMs = 16;
  private emaDt = 16.7;
  private statTick = 0;
  private renderScale = 1;
  private adaptTick = 0;
  readonly deviceCap = hardwareCap();

  constructor(canvas: HTMLCanvasElement, params: EngineParams, video: VideoParams, ev: EngineEvents = {}) {
    this.canvas = canvas;
    this.P = params;
    this.V = video;
    this.ev = ev;
    const opts: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    };
    const gl = (canvas.getContext('webgl', opts) ||
      canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext | null;
    if (!gl) throw new Error('WebGL is not available on this device/browser.');
    this.gl = gl;
    this.initGL();
    this.onVisibility = this.onVisibility.bind(this);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /* ---------------------------------------------------------- setup */
  private initGL() {
    const gl = this.gl;
    this.pointProg = createProgram(gl, POINT_VERT, POINT_FRAG);
    this.lineProg = createProgram(gl, LINE_VERT, LINE_FRAG);
    this.fadeProg = createProgram(gl, FADE_VERT, FADE_FRAG);
    for (const name of ['uAspect', 'uZoom', 'uPan', 'uRot', 'uPersp', 'uParallax', 'uPointScale', 'uPulse',
      'uTex', 'uUseTex', 'uShape', 'uOpacity', 'uGlow']) {
      this.u[name] = gl.getUniformLocation(this.pointProg, name);
    }
    for (const name of ['uAspect', 'uZoom', 'uPan', 'uRot', 'uPersp', 'uParallax', 'uOpacity', 'uGlow']) {
      this.lu[name] = gl.getUniformLocation(this.lineProg, name);
    }
    this.dotTex = makeDotTexture(gl);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
  }

  private ensureBuffers(n: number) {
    if (n <= this.bufCap) return;
    const gl = this.gl;
    const cap = Math.max(1024, Math.pow(2, Math.ceil(Math.log2(n))));
    this.posBuf = makeBuffer(gl, new Float32Array(cap * 3), gl.DYNAMIC_DRAW);
    this.colBuf = makeBuffer(gl, new Float32Array(cap * 3), gl.DYNAMIC_DRAW);
    this.sizeBuf = makeBuffer(gl, new Float32Array(cap), gl.DYNAMIC_DRAW);
    this.linePosBuf = makeBuffer(gl, new Float32Array(cap * 6), gl.DYNAMIC_DRAW);
    this.lineColBuf = makeBuffer(gl, new Float32Array(cap * 6), gl.DYNAMIC_DRAW);
    const lt = new Float32Array(cap * 2);
    for (let i = 0; i < cap; i++) { lt[i * 2] = 0; lt[i * 2 + 1] = 1; }
    this.lineTBuf = makeBuffer(gl, lt, gl.STATIC_DRAW);
    this.linePos = new Float32Array(cap * 6);
    this.lineCol = new Float32Array(cap * 6);
    if (cap > this.cap) {
      const grow = <T extends Float32Array | Int32Array>(a: T, C: new (n: number) => T, mul = 1): T => {
        const b = new C(cap * mul); b.set(a); return b;
      };
      this.pos = grow(this.pos, Float32Array, 3);
      this.col = grow(this.col, Float32Array, 3);
      this.tgt = grow(this.tgt, Float32Array, 3);
      this.raw = grow(this.raw, Float32Array, 3);
      this.vel = grow(this.vel, Float32Array, 3);
      this.home = grow(this.home, Float32Array, 3);
      this.sprd = grow(this.sprd, Float32Array, 3);
      this.seedA = grow(this.seedA, Float32Array);
      this.seedB = grow(this.seedB, Float32Array);
      this.sizeMul = grow(this.sizeMul, Float32Array);
      this.luma = grow(this.luma, Float32Array);
      this.pixIndex = grow(this.pixIndex, Int32Array);
      this.cap = cap;
    }
    this.bufCap = cap;
  }

  /* ---------------------------------------------------------- media */
  get effCount(): number {
    return Math.min(this.P.count * qualityCountMul(this.P.quality), this.deviceCap, 80000);
  }

  setImage(img: HTMLImageElement) {
    this.detachVideo();
    this.img = img;
    this.mediaType = 'image';
    this.resample();
  }

  private detachVideo() {
    if (this.video) {
      try { this.video.pause(); } catch { /* noop */ }
      if (!this.live) { this.video.removeAttribute('src'); this.video.load(); }
      else this.video.srcObject = null;
    }
    this.video = null;
    this.live = false;
    this.mediaType = 'none';
    this.pulse = 0;
  }

  async setVideo(url: string | null, stream: MediaStream | null): Promise<number> {
    this.img = null;
    this.detachVideo();
    const v = document.createElement('video');
    v.playsInline = true;
    v.crossOrigin = 'anonymous';
    v.preload = 'auto';
    v.muted = this.V.muted;
    v.loop = false;
    this.video = v;
    this.live = !!stream;
    const dur = await new Promise<number>((resolve, reject) => {
      const to = window.setTimeout(() => reject(new Error('Video metadata timed out')), 15000);
      v.onloadedmetadata = () => { window.clearTimeout(to); resolve(v.duration); };
      v.onerror = () => { window.clearTimeout(to); reject(new Error('Could not decode this video (unsupported codec?).')); };
      if (stream) v.srcObject = stream;
      else if (url) v.src = url;
      else reject(new Error('No video source'));
    });
    await new Promise<void>((resolve) => {
      if (v.readyState >= 2) return resolve();
      v.onloadeddata = () => resolve();
      window.setTimeout(resolve, 3000);
    });
    this.mediaType = 'video';
    this.vCanvas = document.createElement('canvas');
    this.vCtx = this.vCanvas.getContext('2d', { willReadFrequently: true });
    if (this.V.trimEnd === 0 || this.V.trimEnd > (isFinite(dur) ? dur : 0)) {
      this.V.trimEnd = isFinite(dur) ? dur : 0;
    }
    if (this.V.trimStart > 0 && isFinite(dur)) v.currentTime = this.V.trimStart;
    this.resample();
    v.playbackRate = this.V.rate;
    try { await v.play(); } catch { /* user gesture will start it */ }
    this.pushVideoState();
    return dur;
  }

  videoEl(): HTMLVideoElement | null { return this.video; }

  /* video transport */
  vPlay() { if (this.video) { void this.video.play(); this.pushVideoState(); } }
  vPause() { if (this.video) { this.video.pause(); this.pushVideoState(); } }
  vSeek(t: number) {
    if (this.video && isFinite(this.video.duration)) {
      this.video.currentTime = clamp(t, 0, this.video.duration);
      this.lastSample = 0; // force immediate resample
      this.pushVideoState();
    }
  }
  vRestart() { this.vSeek(this.V.trimStart); this.vPlay(); }

  setMuted(m: boolean) {
    this.V.muted = m;
    if (this.video) this.video.muted = m || !!this.actx;
    if (this.again) this.again.gain.value = m ? 0 : 1;
  }

  ensureAudioReactive(): boolean {
    if (!this.video) return false;
    if (this.actx) return true;
    try {
      this.actx = new AudioContext();
      const src = this.actx.createMediaElementSource(this.video);
      this.analyser = this.actx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.72;
      this.again = this.actx.createGain();
      this.again.gain.value = this.V.muted ? 0 : 1;
      src.connect(this.again);
      this.again.connect(this.analyser);
      this.analyser.connect(this.actx.destination);
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.video.muted = false; // routing goes through the graph now
      return true;
    } catch {
      this.ev.onError?.('Audio analysis unavailable for this source.');
      return false;
    }
  }

  /* -------------------------------------------------------- sampling */
  resample() {
    const src = this.mediaType === 'image' ? this.img : this.video;
    if (!src) return;
    const sw = this.mediaType === 'image' ? (this.img!.naturalWidth || this.img!.width) : this.video!.videoWidth;
    const sh = this.mediaType === 'image' ? (this.img!.naturalHeight || this.img!.height) : this.video!.videoHeight;
    if (!sw || !sh) return;
    this.ev.onSampling?.(true);
    const rect = this.canvas.getBoundingClientRect();
    const aspectWorld = Math.max(0.2, rect.width / Math.max(1, rect.height));
    const maxDim = this.mediaType === 'video'
      ? (this.P.quality === 'low' ? 300 : this.P.quality === 'balanced' ? 380 : 460)
      : (this.P.quality === 'ultra' ? 1100 : this.P.quality === 'low' ? 640 : 900);
    const data: SampleData | null = sampleSource(src, sw, sh, {
      maxDim,
      density: this.P.density,
      countCap: Math.floor(this.effCount),
      aspectWorld,
    });
    if (!data) { this.ev.onSampling?.(false); this.ev.onError?.('Sampling failed — image may be blocked by CORS.'); return; }
    this.ensureBuffers(data.count);
    this.n = data.count;
    this.rasterW = data.width;
    this.rasterH = data.height;
    this.home.set(data.home);
    this.sprd.set(data.spreadDir);
    this.seedA.set(data.seedA);
    this.seedB.set(data.seedB);
    this.sizeMul.set(data.sizeMul);
    this.luma.set(data.luma);
    this.pixIndex.set(data.pixIndex);
    this.raw.set(data.color);
    this.recolorTargets();
    this.scatter();
    for (let i = 0; i < this.n; i++) {
      this.col[i * 3] = this.tgt[i * 3]; this.col[i * 3 + 1] = this.tgt[i * 3 + 1]; this.col[i * 3 + 2] = this.tgt[i * 3 + 2];
    }
    this.uploadSize();
    this.intro = 0;
    if (this.mediaType === 'video') {
      this.vCanvas!.width = this.rasterW;
      this.vCanvas!.height = this.rasterH;
      this.lastSample = 0;
    }
    this.t = 0;
    this.ev.onSampling?.(false);
  }

  /** scatter particles outward and zero velocity (intro formation start) */
  private scatter() {
    for (let i = 0; i < this.n; i++) {
      const a = this.seedA[i] * 7.13, r = 1.6 + this.seedB[i] * 2.4;
      this.pos[i * 3] = Math.cos(a) * r;
      this.pos[i * 3 + 1] = Math.sin(a) * r * 0.8;
      this.pos[i * 3 + 2] = (this.seedB[i] - 0.5) * 2;
      this.vel[i * 3] = 0; this.vel[i * 3 + 1] = 0; this.vel[i * 3 + 2] = 0;
    }
  }

  /** replay the formation: scatter the field and let it re-converge */
  reform() {
    if (!this.n) return;
    this.scatter();
    this.intro = 0;
    this.impulses.length = 0;
  }

  /** map the latest sampled RGB through the active color mode */
  recolorTargets() {
    const P = this.P;
    for (let i = 0; i < this.n; i++) {
      const r = this.raw[i * 3], g = this.raw[i * 3 + 1], b = this.raw[i * 3 + 2];
      let R = r, G = g, B = b;
      if (P.colorMode === 'mono') {
        const [mr, mg, mb] = hexToRgb01(P.monoColor);
        const k = 0.18 + this.luma[i] * 1.05;
        R = mr * k; G = mg * k; B = mb * k;
      } else if (P.colorMode === 'gradient') {
        const [ar, ag, ab] = hexToRgb01(P.gradientA);
        const [br, bg, bb] = hexToRgb01(P.gradientB);
        const t = clamp(0.12 + this.luma[i] * 0.9, 0, 1);
        R = lerp(ar, br, t); G = lerp(ag, bg, t); B = lerp(ab, bb, t);
      } else if (P.colorMode === 'palette') {
        const pal = P.palette.filter(Boolean);
        if (pal.length) {
          const pi = Math.min(pal.length - 1, Math.floor(this.luma[i] * pal.length * 0.999));
          const [pr, pg, pb] = hexToRgb01(pal[pi]);
          const k = 0.35 + this.luma[i] * 0.85;
          R = pr * k; G = pg * k; B = pb * k;
        }
      }
      this.tgt[i * 3] = R; this.tgt[i * 3 + 1] = G; this.tgt[i * 3 + 2] = B;
    }
  }

  setSprite(img: HTMLImageElement | null) {
    if (img) {
      this.spriteTex = textureFromImage(this.gl, img);
    } else if (this.spriteTex) {
      this.gl.deleteTexture(this.spriteTex);
      this.spriteTex = null;
    }
  }

  /** recompute per-particle size multipliers (e.g. after variance change) */
  resampleSize() {
    this.uploadSize();
  }

  private uploadSize() {
    const gl = this.gl;
    const m = 0.25 + this.P.sizeVariance * 0.75;
    const tmp = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) tmp[i] = 1 + (this.sizeMul[i] - 1) * m;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, tmp);
  }

  /* -------------------------------------------------------- pointer */
  setPointer(clientX: number, clientY: number, active: boolean, down: boolean) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.nx = ((clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    this.pointer.ny = -(((clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
    this.pointer.active = active;
    this.pointer.down = down;
  }

  burst(clientX: number, clientY: number, strength = 1) {
    const w = this.screenToWorld(clientX, clientY);
    this.impulses.push({ x: w[0], y: w[1], t0: this.t, str: 6.5 * strength });
    if (this.impulses.length > MAX_IMPULSES) this.impulses.shift();
  }

  private screenToWorld(clientX: number, clientY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const nx = ((clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
    const ny = -(((clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
    const aspect = r.width / Math.max(1, r.height);
    return this.viewToWorld(nx * aspect, ny);
  }

  private viewToWorld(vx: number, vy: number): [number, number] {
    const P = this.P;
    const x0 = (vx - P.panX) / Math.max(0.05, P.zoom);
    const y0 = (vy - P.panY) / Math.max(0.05, P.zoom);
    const c = Math.cos(-P.rotation), s = Math.sin(-P.rotation);
    return [x0 * c - y0 * s, x0 * s + y0 * c];
  }

  /* ---------------------------------------------------------- loop */
  start() {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(frame);
      if (!this.visible || document.hidden) { this.lastT = now; return; }
      const raw = now - this.lastT;
      const dt = Math.min(0.05, raw / 1000);
      this.lastT = now;
      this.emaDt = this.emaDt * 0.92 + Math.min(250, Math.max(4, raw)) * 0.08;
      const t0 = performance.now();
      this.step(dt);
      this.render();
      const ms = performance.now() - t0;
      this.emaMs = this.emaMs * 0.94 + ms * 0.06;
      this.statTick++;
      if (this.statTick % 24 === 0) this.pushStats();
      this.adapt(dt);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.detachVideo();
    if (this.actx) { void this.actx.close().catch(() => undefined); this.actx = null; }
    /* keep the GL context: remounts on the same canvas must be able to re-acquire it */
  }

  private onVisibility() {
    this.lastT = performance.now();
  }

  private adapt(dt: number) {
    this.adaptTick++;
    if (this.adaptTick % 150 !== 0) return;
    const fps = 1 / Math.max(0.001, dt);
    if (fps < 44 && this.renderScale > 0.55) this.renderScale = Math.max(0.55, this.renderScale - 0.12);
    else if (fps > 58 && this.renderScale < 1) this.renderScale = Math.min(1, this.renderScale + 0.08);
  }

  private pushStats() {
    this.ev.onStats?.({
      fps: 1000 / Math.max(1, this.emaDt),
      frameMs: this.emaMs,
      count: this.n,
      renderScale: this.renderScale,
      cap: this.deviceCap,
    });
  }

  private pushVideoState() {
    if (!this.video) return;
    this.ev.onVideoState?.({
      playing: !this.video.paused && !this.video.ended,
      time: this.video.currentTime,
      duration: isFinite(this.video.duration) ? this.video.duration : 0,
      live: this.live,
      ended: this.video.ended,
    });
  }

  /* ----------------------------------------------------------- step */
  step(dt: number) {
    const P = this.P;
    const n = this.n;
    if (!n) { this.t += dt; return; }
    if (this.intro < 3) this.intro += dt;
    const timeMul = P.playing ? 1 : 0;
    this.t += dt * P.speed * timeMul;
    const t = this.t;

    /* audio reactive pulse */
    let pulse = 0;
    if (this.analyser && this.freq && this.V.audioReactive) {
      this.analyser.getByteFrequencyData(this.freq);
      let s = 0;
      for (let i = 2; i < 26; i++) s += this.freq[i];
      pulse = clamp((s / 24 / 255 - 0.18) * 1.9, 0, 1);
    }
    this.pulse = this.pulse * 0.85 + pulse * 0.15;

    /* video frame re-sampling at stable pixel indices */
    if (this.mediaType === 'video' && this.video && this.vCtx && this.video.readyState >= 2) {
      const interval = 1 / clamp(this.V.sampleRate, 2, 30);
      if (t - this.lastSample >= interval || this.lastSample === 0) {
        this.lastSample = t;
        const vc = this.vCtx;
        vc.drawImage(this.video, 0, 0, this.rasterW, this.rasterH);
        try {
          const id = vc.getImageData(0, 0, this.rasterW, this.rasterH).data;
          readColorsAt(id, this.pixIndex, this.raw, n);
          if (P.colorMode !== 'original') this.recolorTargets();
          else this.tgt.set(this.raw.subarray(0, n * 3));
        } catch { /* tainted — keep previous */ }
      }
      /* trim window + loop handling */
      if (t - this.lastTrimRecheck > 0.2) {
        this.lastTrimRecheck = t;
        const d = this.video.duration;
        if (isFinite(d)) {
          const end = this.V.trimEnd > 0 ? Math.min(this.V.trimEnd, d) : d;
          if (this.video.currentTime >= end - 0.05) {
            if (this.V.loop) this.video.currentTime = this.V.trimStart;
            else this.video.pause();
          } else if (this.video.currentTime < this.V.trimStart) {
            this.video.currentTime = this.V.trimStart;
          }
          if (this.video.ended && this.V.loop) { this.video.currentTime = this.V.trimStart; void this.video.play(); }
          this.pushVideoState();
        }
      }
    }

    const amp = P.amplitude;
    const eff = timeMul;
    const flowX = Math.cos(P.flowAngle) * P.flow * 0.55 * amp * eff;
    const flowY = Math.sin(P.flowAngle) * P.flow * 0.55 * amp * eff;
    const swirl = P.swirl * 0.85 * amp * eff;
    const turb = P.turbulence * 2.7 * amp * eff;
    const drift = P.drift * 0.34 * amp * eff;
    const spreadD = P.spread * 0.9 + this.pulse * 0.35;
    const depthK = P.depth * 1.15;
    const introBoost = this.intro < 2.2 ? 1 + (2.2 - this.intro) * 1.4 : 1;
    const k = (1.4 + P.returnForce * 9.5) * (P.playing ? 1 : 1.6) * introBoost;
    const dampC = Math.exp(-dt * 4.4);

    /* pointer in world coords */
    const r = this.canvas.getBoundingClientRect();
    const aspect = r.width / Math.max(1, r.height);
    let pwx = 0, pwy = 0, R = 0;
    if (this.pointer.active) {
      [pwx, pwy] = this.viewToWorld(this.pointer.nx * aspect, this.pointer.ny);
      R = ((P.pointerRadius * 2) / Math.max(1, r.height)) / Math.max(0.05, P.zoom);
    }
    const R2 = R * R;
    const repS = P.repulsion * 30 * (this.pointer.down ? 1.9 : 1);
    const attS = P.attraction * 11 * (this.pointer.down ? 2.2 : 1);
    const pulses = this.impulses;
    for (let i = pulses.length - 1; i >= 0; i--) if (t - pulses[i].t0 > 2.2) pulses.splice(i, 1);

    const pos = this.pos, vel = this.vel, home = this.home, sprd = this.sprd, col = this.col, tgt = this.tgt;
    const colorLerp = Math.min(1, dt * (this.mediaType === 'video' ? 2 + this.V.smoothing * 12 : 14));

    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      let x = pos[ix], y = pos[ix + 1], z = pos[ix + 2];
      let vx = vel[ix], vy = vel[ix + 1];

      const sA = this.seedA[i], sB = this.seedB[i];
      const tx = home[ix] + sprd[ix] * spreadD;
      const ty = home[ix + 1] + sprd[ix + 1] * spreadD;
      const tz = home[ix + 2] * depthK + sprd[ix + 2] * spreadD * 0.55 + this.pulse * 0.3 * (sB - 0.5);

      vx += (tx - x) * k * dt;
      vy += (ty - y) * k * dt;

      if (turb > 0) {
        const n1 = Math.sin(x * 2.1 + t * 1.15 + sA) + Math.sin(y * 2.9 - t * 0.8 + sB * 6.28);
        const n2 = Math.sin(y * 1.7 + t * 1.35 + sA * 2.0) + Math.sin(x * 3.3 + t * 0.6 + sB * 3.0);
        vx += n1 * turb * dt;
        vy += n2 * turb * dt;
      }
      if (drift > 0) {
        vx += Math.sin(t * 0.35 + sA * 3.0) * drift * dt;
        vy += Math.cos(t * 0.29 + sB * 6.0) * drift * dt;
      }
      if (flowX !== 0 || flowY !== 0 || swirl !== 0) {
        const d = Math.sqrt(x * x + y * y) + 0.15;
        const cl = Math.min(1, d);
        vx += (flowX + (-y / d) * swirl * cl) * dt;
        vy += (flowY + (x / d) * swirl * cl) * dt;
      }
      if (R2 > 0) {
        const dx = x - pwx, dy = y - pwy;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const fall = (1 - d / R);
          const f = fall * fall;
          vx += (dx / d) * repS * f * dt;
          vy += (dy / d) * repS * f * dt;
          vx -= (dx / d) * attS * f * dt;
          vy -= (dy / d) * attS * f * dt;
        }
      }
      for (let p = 0; p < pulses.length; p++) {
        const im = pulses[p];
        const age = t - im.t0;
        const dx = x - im.x, dy = y - im.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-4;
        const wave = age * 2.4;
        const band = Math.exp(-Math.pow(d - wave, 2) / 0.045) * Math.exp(-age * 2.1) * im.str;
        vx += (dx / d) * band * dt * 10;
        vy += (dy / d) * band * dt * 10;
      }

      vx *= dampC;
      vy *= dampC;
      x += vx * dt;
      y += vy * dt;
      z += (tz - z) * Math.min(1, dt * 5);

      pos[ix] = x; pos[ix + 1] = y; pos[ix + 2] = z;
      vel[ix] = vx; vel[ix + 1] = vy;

      col[ix] += (tgt[ix] - col[ix]) * colorLerp;
      col[ix + 1] += (tgt[ix + 1] - col[ix + 1]) * colorLerp;
      col[ix + 2] += (tgt[ix + 2] - col[ix + 2]) * colorLerp;
    }
  }

  /* ---------------------------------------------------------- draw */
  resizeIfNeeded() {
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, qualityDprCap(this.P.quality));
    const w = Math.max(2, Math.floor(c.clientWidth * dpr * this.renderScale));
    const h = Math.max(2, Math.floor(c.clientHeight * dpr * this.renderScale));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }

  private bgRgba(alpha: number): [number, number, number, number] {
    const [r, g, b] = hexToRgb01(this.P.background);
    return [r, g, b, alpha];
  }

  render() {
    this.draw(this.P.transparent && this.P.trails <= 0.02, undefined);
  }

  /** one clean frame for still export */
  renderStill() {
    this.draw(this.P.transparent, 1, true);
  }

  private draw(clearTransparent: boolean, forceFade?: number, still = false) {
    const gl = this.gl;
    const P = this.P;
    this.resizeIfNeeded();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    const fadeA = forceFade !== undefined ? forceFade : (P.transparent ? 1 : clamp(1 - P.trails * 0.985, 0.02, 1));
    if (clearTransparent || P.transparent) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (P.trails > 0.02 && !P.transparent) { /* unreachable guard */ }
    }
    if (!P.transparent && fadeA >= 0.02) {
      gl.useProgram(this.fadeProg);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      const loc = gl.getUniformLocation(this.fadeProg, 'uFade');
      const [r, g, b] = this.bgRgba(fadeA);
      gl.uniform4f(loc, r, g, b, fadeA);
      const aXY = gl.getAttribLocation(this.fadeProg, 'aXY');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fadeTri());
      gl.enableVertexAttribArray(aXY);
      gl.vertexAttribPointer(aXY, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(aXY);
    }
    if (!this.n) return;

    /* upload dynamic buffers */
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos.subarray(0, this.n * 3));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.col.subarray(0, this.n * 3));

    const r = this.canvas.getBoundingClientRect();
    const aspect = r.width / Math.max(1, r.height);
    const px = this.pointer.active && !still ? this.pointer.nx * P.parallax * 0.16 : 0;
    const py = this.pointer.active && !still ? this.pointer.ny * P.parallax * 0.16 : 0;

    const additive = P.glow > 0.02;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);

    if (P.lineMode === 'streaks') {
      /* build line vertex pairs: prev ≈ pos - vel*dt*k */
      const lp = this.linePos, lc = this.lineCol, pos = this.pos, vel = this.vel, col = this.col;
      const back = 0.045 * P.speed + 0.02;
      for (let i = 0; i < this.n; i++) {
        const ix = i * 3, o = i * 6;
        const x = pos[ix], y = pos[ix + 1], z = pos[ix + 2];
        lp[o] = x - vel[ix] * back; lp[o + 1] = y - vel[ix + 1] * back; lp[o + 2] = z;
        lp[o + 3] = x; lp[o + 4] = y; lp[o + 5] = z;
        const cr = col[ix], cg = col[ix + 1], cb = col[ix + 2];
        lc[o] = cr; lc[o + 1] = cg; lc[o + 2] = cb;
        lc[o + 3] = cr; lc[o + 4] = cg; lc[o + 5] = cb;
      }
      gl.useProgram(this.lineProg);
      gl.uniform1f(this.lu.uAspect, aspect);
      gl.uniform1f(this.lu.uZoom, P.zoom);
      gl.uniform2f(this.lu.uPan, P.panX, P.panY);
      gl.uniform1f(this.lu.uRot, P.rotation);
      gl.uniform1f(this.lu.uPersp, P.perspective * 1.6);
      gl.uniform2f(this.lu.uParallax, px, py);
      gl.uniform1f(this.lu.uOpacity, P.opacity);
      gl.uniform1f(this.lu.uGlow, P.glow);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.linePosBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lp.subarray(0, this.n * 6));
      const aPos = gl.getAttribLocation(this.lineProg, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineColBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lc.subarray(0, this.n * 6));
      const aCol = gl.getAttribLocation(this.lineProg, 'aCol');
      gl.enableVertexAttribArray(aCol);
      gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineTBuf);
      const aT = gl.getAttribLocation(this.lineProg, 'aT');
      gl.enableVertexAttribArray(aT);
      gl.vertexAttribPointer(aT, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, this.n * 2);
      gl.disableVertexAttribArray(aPos);
      gl.disableVertexAttribArray(aCol);
      gl.disableVertexAttribArray(aT);
      return;
    }

    gl.useProgram(this.pointProg);
    gl.uniform1f(this.u.uAspect, aspect);
    gl.uniform1f(this.u.uZoom, P.zoom);
    gl.uniform2f(this.u.uPan, P.panX, P.panY);
    gl.uniform1f(this.u.uRot, P.rotation);
    gl.uniform1f(this.u.uPersp, P.perspective * 1.6);
    gl.uniform2f(this.u.uParallax, px, py);
    gl.uniform1f(this.u.uPointScale, P.size * this.canvas.height * 0.0036);
    gl.uniform1f(this.u.uPulse, this.pulse * 0.9);
    gl.uniform1f(this.u.uOpacity, P.opacity);
    gl.uniform1f(this.u.uGlow, P.glow);
    gl.uniform1i(this.u.uTex, 0);
    const useSprite = P.shape === 'sprite' && this.spriteTex;
    gl.uniform1f(this.u.uUseTex, useSprite ? 1 : 0);
    gl.uniform1f(this.u.uShape, P.shape === 'circle' ? 0 : P.shape === 'square' ? 2 : 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, useSprite ? this.spriteTex : this.dotTex);

    const aPos = gl.getAttribLocation(this.pointProg, 'aPos');
    const aCol = gl.getAttribLocation(this.pointProg, 'aCol');
    const aSize = gl.getAttribLocation(this.pointProg, 'aSize');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuf);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuf);
    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, this.n);
    gl.disableVertexAttribArray(aPos);
    gl.disableVertexAttribArray(aCol);
    gl.disableVertexAttribArray(aSize);
  }

  private _fadeTri: WebGLBuffer | null = null;
  private fadeTri(): WebGLBuffer {
    if (!this._fadeTri) {
      this._fadeTri = makeBuffer(this.gl, new Float32Array([-1, -1, 3, -1, -1, 3]), this.gl.STATIC_DRAW);
    }
    return this._fadeTri;
  }

  /* -------------------------------------------------------- export */
  captureBlob(type: 'image/png' | 'image/webp', quality = 0.94): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), type, quality);
    });
  }

  /** current source image as a compact data-url (for code export) */
  sourceDataURL(maxDim = 640): string | null {
    try {
      const src = this.mediaType === 'image' ? this.img : this.video;
      if (!src) return null;
      const sw = this.mediaType === 'image' ? this.img!.naturalWidth : this.video!.videoWidth;
      const sh = this.mediaType === 'image' ? this.img!.naturalHeight : this.video!.videoHeight;
      if (!sw || !sh) return null;
      const s = Math.min(1, maxDim / Math.max(sw, sh));
      const cv = document.createElement('canvas');
      cv.width = Math.round(sw * s);
      cv.height = Math.round(sh * s);
      cv.getContext('2d')!.drawImage(src, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/webp', 0.82);
    } catch {
      return null;
    }
  }
}
