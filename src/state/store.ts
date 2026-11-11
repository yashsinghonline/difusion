/* ------------------------------------------------------------------ */
/*  DIFUSION — studio state (zustand) · image particle studio          */
/* ------------------------------------------------------------------ */

import { create } from 'zustand';
import {
  DEFAULT_PARAMS, DEFAULT_VIDEO, EngineParams, VideoParams, clamp,
} from '../engine/types';
import type { ParticleEngine } from '../engine/engine';
import { downloadText } from '../engine/export';

/* Stable param objects the engine reads every frame (mutation-safe). */
export const sharedParams: EngineParams = { ...DEFAULT_PARAMS };
export const sharedVideo: VideoParams = { ...DEFAULT_VIDEO };

/* Engine handle — set by the Stage once the canvas exists. */
export const engineAPI: { engine: ParticleEngine | null } = { engine: null };

export interface Asset {
  id: string;
  name: string;
  type: 'image';
  url: string;             // object URL or /samples path
  thumb: string;
  size: number;            // bytes (0 for samples)
  error?: boolean;
  fileBlob?: Blob;
}

export type StatusKind = 'idle' | 'sampling' | 'rendering' | 'recording' | 'exporting' | 'error' | 'ready';

export interface Task { label: string; pct: number }

export interface Preset { name: string; params: EngineParams; ts: number }

export type Modal = null | 'export' | 'help';
export type Sheet = null | 'field' | 'style' | 'assets';

interface Studio {
  params: EngineParams;
  patch: (p: Partial<EngineParams>) => void;

  projectName: string;
  setProjectName: (n: string) => void;

  assets: Asset[];
  activeId: string | null;
  addFiles: (files: FileList | File[]) => Promise<void>;
  selectAsset: (id: string) => Promise<void>;
  removeAsset: (id: string) => void;

  status: { kind: StatusKind; text: string };
  setStatus: (kind: StatusKind, text: string) => void;

  task: Task | null;
  setTask: (t: Task | null) => void;

  stats: { fps: number; count: number; scale: number; cap: number };
  setStats: (s: Studio['stats']) => void;

  modal: Modal;
  setModal: (m: Modal) => void;
  exportTab: string;
  setExportTab: (t: string) => void;

  sheet: Sheet;
  setSheet: (s: Sheet) => void;

  hintSeen: boolean;
  dismissHint: () => void;

  presets: Preset[];
  savePreset: (name: string) => void;
  applyPreset: (i: number) => void;
  deletePreset: (i: number) => void;

  reform: () => void;
  resetParams: () => void;
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
  resetCamera: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

const RESAMPLE_KEYS: (keyof EngineParams)[] = ['density', 'count', 'quality'];
const RECOLOR_KEYS: (keyof EngineParams)[] = ['colorMode', 'monoColor', 'gradientA', 'gradientB', 'palette'];
const SIZE_KEYS: (keyof EngineParams)[] = ['sizeVariance'];

let resampleTimer = 0;

async function makeThumb(src: HTMLImageElement, w: number, h: number): Promise<string> {
  const cv = document.createElement('canvas');
  const s = Math.min(1, 120 / Math.max(w, h));
  cv.width = Math.max(2, Math.round(w * s));
  cv.height = Math.max(2, Math.round(h * s));
  const c = cv.getContext('2d')!;
  c.fillStyle = '#0a0a0c';
  c.fillRect(0, 0, cv.width, cv.height);
  c.drawImage(src, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.72);
}

function seedSamples(): Asset[] {
  const mk = (name: string, path: string): Asset => ({
    id: uid(), name, type: 'image', url: path, thumb: path, size: 0,
  });
  return [
    mk('neon-portrait.jpg', '/samples/portrait.jpg'),
    mk('scarlet-macaw.jpg', '/samples/macaw.jpg'),
    mk('chrome-orb.jpg', '/samples/orb.jpg'),
  ];
}

function loadPresets(): Preset[] {
  try {
    return (JSON.parse(localStorage.getItem('difusion.presets.v1') || '[]') as Preset[]).filter(
      (p) => p && p.params,
    );
  } catch {
    return [];
  }
}

export const useStudio = create<Studio>((set, get) => ({
  params: { ...sharedParams },

  patch: (p) => {
    Object.assign(sharedParams, p);
    set({ params: { ...sharedParams } });
    const eng = engineAPI.engine;
    if (!eng) return;
    if (RESAMPLE_KEYS.some((k) => k in p)) {
      window.clearTimeout(resampleTimer);
      resampleTimer = window.setTimeout(() => engineAPI.engine?.resample(), 220);
    }
    if (RECOLOR_KEYS.some((k) => k in p)) eng.recolorTargets();
    if (SIZE_KEYS.some((k) => k in p)) eng.resampleSize();
    if ('customSprite' in p) {
      const url = p.customSprite;
      if (!url) eng.setSprite(null);
      else {
        const img = new Image();
        img.onload = () => eng.setSprite(img);
        img.src = url;
      }
    }
  },

  projectName: 'untitled-field',
  setProjectName: (n) => set({ projectName: n }),

  assets: seedSamples(),
  activeId: null,

  addFiles: async (files) => {
    const list = Array.from(files).slice(0, 12);
    const added: Asset[] = [];
    for (const f of list) {
      if (!/^image\//.test(f.type)) {
        set({ status: { kind: 'error', text: `Images only in this build — skipped ${f.name}` } });
        continue;
      }
      const url = URL.createObjectURL(f);
      const asset: Asset = {
        id: uid(), name: f.name, type: 'image', url, thumb: '', size: f.size, fileBlob: f,
      };
      asset.thumb = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = async () => resolve(await makeThumb(img, img.naturalWidth, img.naturalHeight));
        img.onerror = () => { asset.error = true; resolve(''); };
        img.src = url;
      });
      added.push(asset);
    }
    if (added.length) {
      set((s) => ({ assets: [...added, ...s.assets] }));
      await get().selectAsset(added[0].id);
    }
  },

  selectAsset: async (id) => {
    const a = get().assets.find((x) => x.id === id);
    const eng = engineAPI.engine;
    if (!a || !eng) return;
    set({ activeId: id, status: { kind: 'sampling', text: 'Sampling pixels…' } });
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { eng.setImage(img); resolve(); };
        img.onerror = () => reject(new Error(`Could not load ${a.name}`));
        img.src = a.url;
      });
      set({ status: { kind: 'ready', text: 'Rendering field' } });
    } catch (e) {
      set({ status: { kind: 'error', text: (e as Error).message } });
    }
  },

  removeAsset: (id) => {
    const s = get();
    const a = s.assets.find((x) => x.id === id);
    if (!a) return;
    if (a.url.startsWith('blob:')) URL.revokeObjectURL(a.url);
    const rest = s.assets.filter((x) => x.id !== id);
    set({ assets: rest });
    if (s.activeId === id) {
      set({ activeId: null, status: { kind: 'idle', text: 'No source loaded' } });
      if (rest.length) void get().selectAsset(rest[0].id);
    }
  },

  status: { kind: 'idle', text: 'No source loaded' },
  setStatus: (kind, text) => set({ status: { kind, text } }),

  task: null,
  setTask: (t) => set({ task: t }),

  stats: { fps: 60, count: 0, scale: 1, cap: 20000 },
  setStats: (s) => set({ stats: s }),

  modal: null,
  setModal: (m) => set({ modal: m }),
  exportTab: 'embed',
  setExportTab: (t) => set({ exportTab: t }),

  sheet: null,
  setSheet: (s) => set({ sheet: s }),

  hintSeen: typeof localStorage !== 'undefined' && localStorage.getItem('difusion.hint') === '1',
  dismissHint: () => {
    localStorage.setItem('difusion.hint', '1');
    set({ hintSeen: true });
  },

  presets: loadPresets(),
  savePreset: (name) => {
    const p: Preset = { name, params: { ...sharedParams }, ts: Date.now() };
    const presets = [p, ...get().presets].slice(0, 24);
    localStorage.setItem('difusion.presets.v1', JSON.stringify(presets));
    set({ presets, status: { kind: 'ready', text: `Preset "${name}" saved locally` } });
  },
  applyPreset: (i) => {
    const p = get().presets[i];
    if (!p) return;
    Object.assign(sharedParams, p.params);
    set({ params: { ...sharedParams } });
    const eng = engineAPI.engine;
    eng?.recolorTargets();
    eng?.resample();
    set({ status: { kind: 'ready', text: `Preset "${p.name}" applied` } });
  },
  deletePreset: (i) => {
    const presets = get().presets.filter((_, k) => k !== i);
    localStorage.setItem('difusion.presets.v1', JSON.stringify(presets));
    set({ presets });
  },

  reform: () => {
    engineAPI.engine?.reform();
    set({ status: { kind: 'ready', text: 'Field re-forming…' } });
  },

  resetParams: () => {
    /* preserve the media-independent sane defaults */
    Object.assign(sharedParams, DEFAULT_PARAMS);
    set({ params: { ...sharedParams } });
    const eng = engineAPI.engine;
    eng?.recolorTargets();
    eng?.resampleSize();
    set({ status: { kind: 'ready', text: 'Controls reset to defaults' } });
  },

  exportJSON: () => {
    const s = get();
    const payload = {
      app: 'DIFUSION',
      version: 1,
      project: s.projectName,
      savedAt: new Date().toISOString(),
      params: sharedParams,
    };
    downloadText(JSON.stringify(payload, null, 2), `${s.projectName || 'difusion'}.difusion.json`, 'application/json');
    set({ status: { kind: 'ready', text: 'Project JSON downloaded' } });
  },

  importJSON: async (file) => {
    try {
      const data = JSON.parse(await file.text()) as {
        app?: string; params?: Partial<EngineParams>; project?: string;
      };
      if (data.app !== 'DIFUSION' || !data.params) throw new Error('Not a DIFUSION project file');
      Object.assign(sharedParams, DEFAULT_PARAMS, data.params);
      set({
        params: { ...sharedParams },
        projectName: data.project || get().projectName,
        status: { kind: 'ready', text: 'Configuration restored' },
      });
      const eng = engineAPI.engine;
      eng?.recolorTargets();
      eng?.resample();
    } catch (e) {
      set({ status: { kind: 'error', text: (e as Error).message } });
    }
  },

  resetCamera: () => {
    get().patch({ zoom: 1, panX: 0, panY: 0, rotation: 0 });
  },
}));

export { clamp as clampValue };
