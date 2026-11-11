/* ------------------------------------------------------------------ */
/*  Help — shortcuts, pipeline notes, privacy                          */
/* ------------------------------------------------------------------ */

import { X } from 'lucide-react';
import { useStudio } from '../state/store';

const SHORTCUTS: [string, string][] = [
  ['Space', 'Pause / resume field motion'],
  ['B', 'Re-form the field (scatter → converge)'],
  ['F', 'Fullscreen'],
  ['R', 'Reset camera'],
  ['E', 'Export & embed center'],
  ['?', 'This panel'],
  ['Move', 'Repel particles'],
  ['Click', 'Shockwave pulse'],
  ['Alt + drag', 'Pan camera'],
  ['Wheel', 'Zoom camera'],
];

export default function HelpModal() {
  const setModal = useStudio((s) => s.setModal);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 df-fadein" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
      <div className="relative w-[min(560px,100%)] max-h-[88vh] overflow-y-auto scroll-thin rounded-xl border border-edge2 bg-panel p-5 df-fadeup">
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-[12px] tracking-[0.2em] text-white">DIFUSION MANUAL</span>
          <button onClick={() => setModal(null)} className="w-7 h-7 rounded-md border border-edge text-dim hover:text-white grid place-items-center">
            <X size={13} />
          </button>
        </div>

        <div className="df-label mb-2">Workflow</div>
        <ol className="space-y-1.5 mb-5">
          {[
            'Import an image — every pixel region becomes a real particle with its source color.',
            'Shape the field: density, size, spread, turbulence, depth and pointer forces.',
            'Steer it: the direction pad sets 8-way flow, center stops it; swirl adds rotation.',
            'Restyle: original colors, monochrome, gradient or a custom palette; glow, trails, streak lines.',
            'Export media: PNG/WebP stills, a recorded video clip, or a PNG frame sequence (zip).',
            'Generate code: copy an embed snippet, a reusable web component, or a standalone HTML file.',
          ].map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[11px] text-zinc-400 leading-relaxed">
              <span className="font-mono text-[9px] text-lime mt-0.5">0{i + 1}</span>{s}
            </li>
          ))}
        </ol>

        <div className="df-label mb-2">Shortcuts & gestures</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-5">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between border-b border-edge/40 py-1">
              <span className="text-[10.5px] text-zinc-400">{d}</span>
              <kbd className="font-mono text-[9px] text-lime bg-panel2 border border-edge rounded px-1.5 py-0.5">{k}</kbd>
            </div>
          ))}
        </div>

        <div className="df-label mb-2">Reliability</div>
        <ul className="space-y-1.5 text-[11px] text-zinc-400 leading-relaxed list-none">
          <li>· Everything runs locally — media never leaves your browser.</li>
          <li>· Particle sampling is deterministic: resizing the density or count never scrambles the layout.</li>
          <li>· Rendering auto-adapts resolution when the device cannot sustain the selected particle count.</li>
          <li>· Exported components respect prefers-reduced-motion, emit lifecycle events, and expose play / pause / destroy.</li>
          <li>· CORS: media referenced by generated components must allow cross-origin reads (or be embedded as a data-url).</li>
        </ul>
      </div>
    </div>
  );
}
