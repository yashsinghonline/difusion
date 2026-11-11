/* ------------------------------------------------------------------ */
/*  Bottom bar — particle field physics + direction controls           */
/* ------------------------------------------------------------------ */

import {
  ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp,
  ArrowUpLeft, ArrowUpRight, Pause, Play, RotateCcw, Sparkles, Undo2, X, Zap,
} from 'lucide-react';
import { ReactNode } from 'react';
import { engineAPI, useStudio } from '../state/store';
import { SliderRow } from './ui';
import { cn } from '../utils/cn';

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="shrink-0">
      <div className="df-label !text-[8.5px] mb-1 pl-0.5">{label}</div>
      <div className="flex gap-3">{children}</div>
    </div>
  );
}

const DIRS: { angle: number; Icon: typeof ArrowUp; label: string }[] = [
  { angle: (3 * Math.PI) / 4, Icon: ArrowUpLeft, label: 'North-West' },
  { angle: Math.PI / 2, Icon: ArrowUp, label: 'North' },
  { angle: Math.PI / 4, Icon: ArrowUpRight, label: 'North-East' },
  { angle: Math.PI, Icon: ArrowLeft, label: 'West' },
  { angle: 0, Icon: ArrowRight, label: 'East' },
  { angle: (-3 * Math.PI) / 4, Icon: ArrowDownLeft, label: 'South-West' },
  { angle: -Math.PI / 2, Icon: ArrowDown, label: 'South' },
  { angle: -Math.PI / 4, Icon: ArrowDownRight, label: 'South-East' },
];

function DirectionPad() {
  const flow = useStudio((s) => s.params.flow);
  const flowAngle = useStudio((s) => s.params.flowAngle);
  const patch = useStudio((s) => s.patch);
  const stopped = flow <= 0.02;

  const pick = (angle: number) => {
    const active = !stopped && Math.abs(norm(flowAngle - angle)) < 0.3;
    if (active) patch({ flow: 0 });                      // click again to release
    else patch({ flowAngle: angle, flow: Math.max(flow, 0.42) });
  };

  return (
    <div className="grid grid-cols-3 gap-[3px] w-[78px]">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const i = row * 3 + col;
          if (i === 4) {
            return (
              <button
                key="stop"
                title="Stop directional flow"
                aria-label="Stop directional flow"
                aria-pressed={stopped}
                onClick={() => patch({ flow: 0 })}
                className={cn(
                  'w-6 h-6 rounded-[5px] border grid place-items-center transition-colors',
                  stopped
                    ? 'bg-lime text-black border-lime'
                    : 'bg-panel2 text-dim border-edge hover:text-zinc-100 hover:border-edge2',
                )}
              >
                <X size={10} />
              </button>
            );
          }
          const d = DIRS[i < 4 ? i : i - 1];
          const active = !stopped && Math.abs(norm(flowAngle - d.angle)) < 0.3;
          return (
            <button
              key={d.label}
              title={`Flow ${d.label}`}
              aria-label={`Flow ${d.label}`}
              aria-pressed={active}
              onClick={() => pick(d.angle)}
              className={cn(
                'w-6 h-6 rounded-[5px] border grid place-items-center transition-colors',
                active
                  ? 'bg-lime text-black border-lime'
                  : 'bg-panel2 text-dim border-edge hover:text-lime hover:border-edge2',
              )}
            >
              <d.Icon size={11} />
            </button>
          );
        }),
      )}
    </div>
  );
}

function norm(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export default function BottomBar() {
  const p = useStudio((s) => s.params);
  const patch = useStudio((s) => s.patch);
  const resetCamera = useStudio((s) => s.resetCamera);
  const reform = useStudio((s) => s.reform);
  const resetParams = useStudio((s) => s.resetParams);
  const W = 'w-[104px]';

  return (
    <div className="shrink-0 border-t border-edge bg-panel">
      <div className="flex items-stretch gap-4 px-3 py-2 overflow-x-auto scroll-none">
        {/* field transport */}
        <div className="shrink-0 flex flex-col justify-center gap-1.5 pr-4 border-r border-edge">
          <button
            onClick={() => patch({ playing: !p.playing })}
            className="w-9 h-9 rounded-lg bg-lime text-black grid place-items-center hover:bg-lime/85 transition-colors"
            title={p.playing ? 'Freeze motion (space)' : 'Resume motion (space)'}
            aria-label={p.playing ? 'Pause animation' : 'Play animation'}
          >
            {p.playing ? <Pause size={14} /> : <Play size={14} className="translate-x-px" />}
          </button>
          <div className="grid grid-cols-2 gap-1 w-9">
            <Mini title="Shockwave from center" onClick={() => {
              const c = canvasCenter();
              engineAPI.engine?.burst(c[0], c[1], 1.4);
            }}><Zap size={10} /></Mini>
            <Mini title="Re-form field — scatter and converge again (B)" onClick={reform}><Sparkles size={10} /></Mini>
            <Mini title="Reset camera (R)" onClick={resetCamera}><RotateCcw size={10} /></Mini>
            <Mini title="Reset all controls to defaults" onClick={resetParams}><Undo2 size={10} /></Mini>
          </div>
        </div>

        <Group label="Field">
          <div className={W}><SliderRow label="Count" value={p.count} min={500} max={64000} step={100} format={(v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v)} onChange={(v) => patch({ count: v })} /></div>
          <div className={W}><SliderRow label="Density" value={p.density} min={0.05} max={1} onChange={(v) => patch({ density: v })} /></div>
          <div className={W}><SliderRow label="Size" value={p.size} min={0.4} max={8} onChange={(v) => patch({ size: v })} /></div>
          <div className={W}><SliderRow label="Size var" value={p.sizeVariance} min={0} max={1} onChange={(v) => patch({ sizeVariance: v })} /></div>
        </Group>

        <Divider />

        <Group label="Direction">
          <DirectionPad />
          <div className={W}><SliderRow label="Flow" value={p.flow} min={0} max={1} onChange={(v) => patch({ flow: v })} /></div>
          <div className={W}><SliderRow label="Flow dir" value={p.flowAngle} min={-Math.PI} max={Math.PI} step={0.02} format={(v) => Math.round((v * 180) / Math.PI) + '°'} onChange={(v) => patch({ flowAngle: v })} /></div>
          <div className={W}><SliderRow label="Swirl" value={p.swirl} min={-1} max={1} onChange={(v) => patch({ swirl: v })} /></div>
          <div className={W}><SliderRow label="Return" value={p.returnForce} min={0} max={1} onChange={(v) => patch({ returnForce: v })} /></div>
        </Group>

        <Divider />

        <Group label="Motion">
          <div className={W}><SliderRow label="Drift" value={p.drift} min={0} max={1} onChange={(v) => patch({ drift: v })} /></div>
          <div className={W}><SliderRow label="Spread" value={p.spread} min={0} max={1} onChange={(v) => patch({ spread: v })} /></div>
          <div className={W}><SliderRow label="Turbulence" value={p.turbulence} min={0} max={1} onChange={(v) => patch({ turbulence: v })} /></div>
        </Group>

        <Divider />

        <Group label="Pointer">
          <div className={W}><SliderRow label="Repulsion" value={p.repulsion} min={0} max={2} onChange={(v) => patch({ repulsion: v })} /></div>
          <div className={W}><SliderRow label="Attraction" value={p.attraction} min={0} max={1} onChange={(v) => patch({ attraction: v })} /></div>
          <div className={W}><SliderRow label="Radius" value={p.pointerRadius} min={20} max={420} step={2} format={(v) => Math.round(v) + 'px'} onChange={(v) => patch({ pointerRadius: v })} /></div>
        </Group>

        <Divider />

        <Group label="Depth · Trails">
          <div className={W}><SliderRow label="Depth" value={p.depth} min={0} max={1} onChange={(v) => patch({ depth: v })} /></div>
          <div className={W}><SliderRow label="Parallax" value={p.parallax} min={0} max={1.5} onChange={(v) => patch({ parallax: v })} /></div>
          <div className={cn(W)}><SliderRow label="Trails" value={p.trails} min={0} max={0.97} onChange={(v) => patch({ trails: v })} disabled={p.transparent} /></div>
        </Group>
      </div>
    </div>
  );
}

function Mini({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-4 h-4 rounded border border-edge bg-panel2 grid place-items-center text-dim hover:text-lime hover:border-lime/60 transition-colors"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px bg-edge my-1 shrink-0" />;
}

function canvasCenter(): [number, number] {
  const cvs = document.querySelector('canvas');
  if (!cvs) return [0, 0];
  const r = cvs.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}
