/* ------------------------------------------------------------------ */
/*  Right panel — render, color, camera, animation, export             */
/* ------------------------------------------------------------------ */

import { useRef, useState } from 'react';
import {
  Activity, Camera, Code2, Download, FileImage, FileJson, Film,
  Layers, Palette, RotateCcw, Upload,
} from 'lucide-react';
import { engineAPI, useStudio } from '../state/store';
import { exportFrameSequence, exportStill, exportWebM } from '../engine/export';
import { ColorRow, Section, SegRow, SliderRow, ToggleRow, ActionBtn } from './ui';

export default function RightPanel() {
  const p = useStudio((s) => s.params);
  const patch = useStudio((s) => s.patch);
  const setModal = useStudio((s) => s.setModal);
  const setTask = useStudio((s) => s.setTask);
  const setStatus = useStudio((s) => s.setStatus);
  const status = useStudio((s) => s.status);
  const projectName = useStudio((s) => s.projectName);
  const exportJSON = useStudio((s) => s.exportJSON);
  const spriteRef = useRef<HTMLInputElement>(null);
  const [webmSecs, setWebmSecs] = useState(5);
  const [seqFrames, setSeqFrames] = useState(72);
  const busy = status.kind === 'recording' || status.kind === 'exporting';

  const outName = (ext: string) => `${projectName || 'difusion'}-particles.${ext}`;

  const doStill = async (fmt: 'png' | 'webp') => {
    const eng = engineAPI.engine;
    if (!eng) return;
    setStatus('exporting', `Rendering ${fmt.toUpperCase()}…`);
    try {
      await exportStill(eng, fmt, outName(fmt));
      setStatus('ready', `${fmt.toUpperCase()} downloaded`);
    } catch (e) {
      setStatus('error', (e as Error).message);
    }
  };

  const doWebM = () => {
    const eng = engineAPI.engine;
    if (!eng || busy) return;
    setStatus('recording', `Recording animation · realtime ${webmSecs}s`);
    exportWebM(
      eng, webmSecs, 30, outName('webm'),
      (pct) => setTask({ label: 'VIDEO', pct }),
      (ok, err) => {
        setTask(null);
        if (ok) setStatus('ready', 'Video downloaded');
        else if (err) setStatus('error', err);
      },
    );
  };

  const doSeq = async () => {
    const eng = engineAPI.engine;
    if (!eng || busy) return;
    setStatus('exporting', `Rendering ${seqFrames} frames…`);
    try {
      await exportFrameSequence(eng, seqFrames, 24, outName('frames.zip'), (pct) =>
        setTask({ label: 'PNG SEQ', pct }),
      );
      setTask(null);
      setStatus('ready', 'PNG sequence (.zip) downloaded');
    } catch (e) {
      setTask(null);
      setStatus('error', (e as Error).message);
    }
  };

  return (
    <aside className="w-[264px] shrink-0 border-l border-edge bg-panel flex flex-col min-h-0 overflow-y-auto scroll-thin">
      <div className="px-3.5 h-9 flex items-center border-b border-edge shrink-0">
        <span className="df-label !text-[10px]">Render · Export</span>
      </div>

      <Section title="Render" icon={<Layers size={11} />} badge={p.quality}>
        <SegRow
          label="Quality"
          value={p.quality}
          options={[
            { v: 'low' as const, label: 'low', title: 'Fast — lower DPR & count' },
            { v: 'balanced' as const, label: 'bal' },
            { v: 'high' as const, label: 'high' },
            { v: 'ultra' as const, label: 'ultra', title: 'Maximum — may reduce FPS' },
          ]}
          onChange={(q) => patch({ quality: q })}
        />
        <div>
          <SegRow
            label="Shape"
            value={p.shape}
            options={[
              { v: 'soft' as const, label: 'soft' },
              { v: 'circle' as const, label: 'circ' },
              { v: 'square' as const, label: 'sq' },
              { v: 'sprite' as const, label: 'spr' },
            ]}
            onChange={(s) => patch({ shape: s })}
          />
          {p.shape === 'sprite' && (
            <button
              onClick={() => spriteRef.current?.click()}
              className="mt-1.5 w-full h-7 rounded border border-dashed border-edge2 text-[9.5px] font-mono uppercase tracking-wider text-dim hover:text-lime hover:border-lime flex items-center justify-center gap-1.5"
            >
              <Upload size={10} /> {p.customSprite ? 'Replace sprite' : 'Upload sprite PNG'}
            </button>
          )}
          <input
            ref={spriteRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              /* store as a data URL so previews and exported files share the exact same asset */
              const reader = new FileReader();
              reader.onload = () => patch({ customSprite: String(reader.result) });
              reader.onerror = () => setStatus('error', 'Could not read sprite file');
              reader.readAsDataURL(f);
              e.target.value = '';
            }}
          />
        </div>
        <SliderRow label="Glow" value={p.glow} min={0} max={1} onChange={(x) => patch({ glow: x })} />
        <SliderRow label="Opacity" value={p.opacity} min={0.05} max={1} onChange={(x) => patch({ opacity: x })} />
        <ToggleRow label="Streak lines" value={p.lineMode === 'streaks'} onChange={(b) => patch({ lineMode: b ? 'streaks' : 'points' })} hint="Render each particle as a motion line" />
        <ColorRow label="Background" value={p.background} onChange={(c) => patch({ background: c })} disabled={p.transparent} />
        <ToggleRow label="Transparent bg" value={p.transparent} onChange={(b) => patch({ transparent: b, trails: b ? 0 : p.trails })} hint="PNG/WebP export keeps alpha; disables trails" />
      </Section>

      <Section title="Color" icon={<Palette size={11} />} badge={p.colorMode}>
        <SegRow
          value={p.colorMode}
          options={[
            { v: 'original' as const, label: 'orig' },
            { v: 'mono' as const, label: 'mono' },
            { v: 'gradient' as const, label: 'grad' },
            { v: 'palette' as const, label: 'pal' },
          ]}
          onChange={(m) => patch({ colorMode: m })}
        />
        <div className="flex items-center justify-between pt-1">
          <span className="df-label !text-[8.5px]">Image tuning</span>
          <button
            className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-wider text-dim hover:text-lime transition-colors"
            onClick={() => patch({ exposure: 0, brightness: 0, contrast: 1, saturation: 1, hue: 0, temperature: 0 })}
            title="Reset image color tuning"
          >
            <RotateCcw size={9} /> reset
          </button>
        </div>
        <SliderRow label="Exposure" value={p.exposure} min={-2} max={2} step={0.02} format={(x) => `${x > 0 ? '+' : ''}${x.toFixed(2)} EV`} onChange={(x) => patch({ exposure: x })} />
        <SliderRow label="Brightness" value={p.brightness} min={-0.5} max={0.5} step={0.01} format={(x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}`} onChange={(x) => patch({ brightness: x })} />
        <SliderRow label="Contrast" value={p.contrast} min={0} max={2} step={0.01} format={(x) => `${Math.round(x * 100)}%`} onChange={(x) => patch({ contrast: x })} />
        <SliderRow label="Saturation" value={p.saturation} min={0} max={2} step={0.01} format={(x) => `${Math.round(x * 100)}%`} onChange={(x) => patch({ saturation: x })} />
        <SliderRow label="Hue shift" value={p.hue} min={-Math.PI} max={Math.PI} step={0.01} format={(x) => `${Math.round((x * 180) / Math.PI)}°`} onChange={(x) => patch({ hue: x })} />
        <SliderRow label="Temperature" value={p.temperature} min={-1} max={1} step={0.01} format={(x) => x < -0.02 ? `cool ${Math.round(-x * 100)}` : x > 0.02 ? `warm ${Math.round(x * 100)}` : 'neutral'} onChange={(x) => patch({ temperature: x })} />
        {p.colorMode === 'mono' && <ColorRow label="Tint" value={p.monoColor} onChange={(c) => patch({ monoColor: c })} />}
        {p.colorMode === 'gradient' && (
          <>
            <ColorRow label="Shadows" value={p.gradientA} onChange={(c) => patch({ gradientA: c })} />
            <ColorRow label="Highlights" value={p.gradientB} onChange={(c) => patch({ gradientB: c })} />
          </>
        )}
        {p.colorMode === 'palette' && (
          <div className="space-y-1.5">
            {p.palette.map((c, i) => (
              <ColorRow
                key={i} label={`tone ${i + 1}`} value={c}
                onChange={(nc) => {
                  const next = [...p.palette];
                  next[i] = nc;
                  patch({ palette: next });
                }}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Camera" icon={<Camera size={11} />}>
        <SliderRow label="Zoom" value={p.zoom} min={0.25} max={6} onChange={(x) => patch({ zoom: x })} />
        <SliderRow label="Pan X" value={p.panX} min={-1.5} max={1.5} onChange={(x) => patch({ panX: x })} />
        <SliderRow label="Pan Y" value={p.panY} min={-1.5} max={1.5} onChange={(x) => patch({ panY: x })} />
        <SliderRow label="Rotate" value={p.rotation} min={-Math.PI} max={Math.PI} step={0.01} format={(x) => Math.round((x * 180) / Math.PI) + '°'} onChange={(x) => patch({ rotation: x })} />
        <SliderRow label="Perspective" value={p.perspective} min={0} max={1} onChange={(x) => patch({ perspective: x })} />
      </Section>

      <Section title="Animation" icon={<Activity size={11} />} badge={p.playing ? 'live' : 'held'}>
        <ToggleRow label="Motion playing" value={p.playing} onChange={(b) => patch({ playing: b })} />
        <SliderRow label="Speed" value={p.speed} min={0} max={3} onChange={(x) => patch({ speed: x })} />
        <SliderRow label="Amplitude" value={p.amplitude} min={0} max={2} onChange={(x) => patch({ amplitude: x })} />
      </Section>

      <Section title="Export media" icon={<Download size={11} />}>
        <div className="grid grid-cols-2 gap-1.5">
          <ActionBtn small label="PNG" icon={<FileImage size={11} />} onClick={() => void doStill('png')} disabled={busy} />
          <ActionBtn small label="WebP" icon={<FileImage size={11} />} onClick={() => void doStill('webp')} disabled={busy} />
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={webmSecs}
            onChange={(e) => setWebmSecs(parseInt(e.target.value))}
            className="h-7 bg-panel2 border border-edge rounded px-1 text-[10px] font-mono text-zinc-300 outline-none"
            aria-label="Video duration"
          >
            {[3, 5, 8, 12].map((s) => <option key={s} value={s}>{s}s</option>)}
          </select>
          <ActionBtn small label="Video clip" icon={<Film size={11} />} onClick={doWebM} disabled={busy} />
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={seqFrames}
            onChange={(e) => setSeqFrames(parseInt(e.target.value))}
            className="h-7 bg-panel2 border border-edge rounded px-1 text-[10px] font-mono text-zinc-300 outline-none"
            aria-label="Sequence frames"
          >
            {[48, 72, 120].map((s) => <option key={s} value={s}>{s}f</option>)}
          </select>
          <ActionBtn small label="PNG seq · zip" icon={<Layers size={11} />} onClick={() => void doSeq()} disabled={busy} />
        </div>
        <ActionBtn small label="Project JSON" icon={<FileJson size={11} />} onClick={exportJSON} disabled={busy} />
        <div className="df-label !normal-case !tracking-normal !text-[9px] opacity-70 leading-relaxed pt-0.5">
          Video records in real time (WebM / MP4 where supported) · PNG seq renders offline, flicker-free
        </div>
      </Section>

      <div className="p-3.5">
        <ActionBtn primary label="Generate website code" icon={<Code2 size={12} />} onClick={() => setModal('export')} />
      </div>
    </aside>
  );
}
