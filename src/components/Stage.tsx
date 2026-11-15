/* ------------------------------------------------------------------ */
/*  Stage — the dominant real-time particle canvas                     */
/* ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, MousePointer2 } from 'lucide-react';
import { ParticleEngine } from '../engine/engine';
import { engineAPI, sharedParams, sharedVideo, useStudio } from '../state/store';
import { cn } from '../utils/cn';

function EmptyState() {
  const assets = useStudio((s) => s.assets);
  const addFiles = useStudio((s) => s.addFiles);
  const selectAsset = useStudio((s) => s.selectAsset);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-void/70 backdrop-blur-sm">
      <div className="df-fadeup w-[min(460px,90%)] rounded-2xl border border-edge bg-panel/90 p-6 text-center">
        <div className="mx-auto w-10 h-10 rounded-xl border border-edge2 bg-panel2 grid place-items-center mb-4">
          <MousePointer2 size={16} className="text-lime" />
        </div>
        <h1 className="text-lg font-semibold tracking-wide text-white">Feed the field</h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
          Drop an image anywhere — its pixels become a living particle
          field you can shape, record and embed on any website.
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-4 w-full h-9 rounded-lg bg-lime text-black font-mono text-[10px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2 hover:bg-lime/85"
        >
          <ImagePlus size={13} /> Import image
        </button>
        <input
          ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); e.target.value = ''; }}
        />
        <div className="mt-4 flex items-center justify-center gap-2">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => void selectAsset(a.id)}
              className="w-14 h-14 rounded-lg overflow-hidden border border-edge hover:border-lime transition-colors"
              title={a.name}
            >
              <img src={a.thumb || a.url} alt={a.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <div className="df-label mt-2">pick a sample</div>
      </div>
    </div>
  );
}

export default function Stage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ready = useRef(false);
  const drag = useRef<{ x: number; y: number; pan: boolean; moved: boolean } | null>(null);

  const activeId = useStudio((s) => s.activeId);
  const stats = useStudio((s) => s.stats);
  const hintSeen = useStudio((s) => s.hintSeen);
  const dismissHint = useStudio((s) => s.dismissHint);
  const [glError, setGlError] = useState<string | null>(null);
  const patch = useStudio((s) => s.patch);
  const resetCamera = useStudio((s) => s.resetCamera);

  useEffect(() => {
    if (ready.current || !canvasRef.current) return;
    ready.current = true;
    let eng: ParticleEngine;
    try {
      eng = new ParticleEngine(canvasRef.current, sharedParams, sharedVideo, {
        onStats: (s) => useStudio.getState().setStats({ fps: s.fps, count: s.count, scale: s.renderScale, cap: s.cap }),
        onError: (m) => useStudio.getState().setStatus('error', m),
        onSampling: (busy) => {
          const st = useStudio.getState();
          if (busy) st.setStatus('sampling', 'Sampling pixels…');
          else if (st.status.kind === 'sampling') st.setStatus('ready', 'Rendering field');
        },
      });
    } catch (e) {
      setGlError((e as Error).message);
      return;
    }
    engineAPI.engine = eng;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sharedParams.playing = false;
      useStudio.setState({ params: { ...sharedParams } });
    }
    eng.start();
    const io = new IntersectionObserver((es) => { eng.visible = es[0]?.isIntersecting ?? true; });
    io.observe(canvasRef.current);
    const first = useStudio.getState().assets[0];
    if (first) void useStudio.getState().selectAsset(first.id);
    return () => {
      io.disconnect();
      eng.destroy();
      engineAPI.engine = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (e: React.PointerEvent) => {
    const eng = engineAPI.engine;
    if (!eng) return;
    eng.setPointer(e.clientX, e.clientY, true, drag.current?.pan ? false : e.buttons === 1);
    if (drag.current?.pan) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const dx = ((e.clientX - drag.current.x) / rect.height) * 2;
      const dy = -((e.clientY - drag.current.y) / rect.height) * 2;
      drag.current.x = e.clientX; drag.current.y = e.clientY; drag.current.moved = true;
      patch({ panX: sharedParams.panX + dx, panY: sharedParams.panY + dy });
    }
  };

  return (
    <div ref={wrapRef} className="relative flex-1 min-h-0 bg-void overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
        onPointerMove={onMove}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, pan: e.altKey || e.button === 1, moved: false };
          if (drag.current.pan) (e.target as HTMLElement).setPointerCapture(e.pointerId);
          engineAPI.engine?.setPointer(e.clientX, e.clientY, true, !drag.current.pan);
          if (!hintSeen) dismissHint();
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (d && !d.pan && !d.moved) engineAPI.engine?.burst(e.clientX, e.clientY, 1);
          drag.current = null;
          engineAPI.engine?.setPointer(e.clientX, e.clientY, true, false);
        }}
        onPointerLeave={() => { drag.current = null; engineAPI.engine?.setPointer(0, 0, false, false); }}
        onWheel={(e) => {
          const z = sharedParams.zoom * Math.exp(-e.deltaY * 0.0012);
          patch({ zoom: Math.min(6, Math.max(0.25, z)) });
        }}
        onDoubleClick={resetCamera}
      />

      {/* vignette + corner marks */}
      <div className="pointer-events-none absolute inset-0 stage-vignette" />
      <div className="pointer-events-none absolute inset-3 opacity-40">
        {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
          <span key={c} className={cn('absolute w-4 h-4 border-edge2', c)} />
        ))}
      </div>

      {glError && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-void">
          <div className="max-w-sm text-center px-6">
            <div className="text-red-400 font-mono text-xs mb-2">WEBGL UNAVAILABLE</div>
            <p className="text-dim text-[11px] leading-relaxed">{glError} DIFUSION needs WebGL to render particle fields.</p>
          </div>
        </div>
      )}

      {!activeId && !glError && <EmptyState />}

      {/* HUD */}
      <div className="absolute bottom-3 left-4 z-10 font-mono text-[9px] text-dim/80 tracking-wider pointer-events-none hidden sm:block">
        {stats.count > 0 && (
          <>
            <span className="text-lime/80">{Math.round(stats.fps)} FPS</span>
            {' · '}{stats.count.toLocaleString()} PTS
            {' · '}×{stats.scale.toFixed(2)} SCALE
            {' · '}≈{Math.max(1, Math.round(stats.count * 48 / 1024))} KB VRAM-FRAME
          </>
        )}
      </div>

      {!hintSeen && activeId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full border border-edge bg-black/70 backdrop-blur px-4 py-1.5 pointer-events-none df-fadein">
          <span className="font-mono text-[9.5px] tracking-wider text-zinc-400">
            MOVE TO REPEL · CLICK TO PULSE · ALT+DRAG PANS · WHEEL ZOOMS
          </span>
        </div>
      )}
    </div>
  );
}
