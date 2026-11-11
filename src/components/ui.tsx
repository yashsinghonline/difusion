/* ------------------------------------------------------------------ */
/*  DIFUSION — compact dark control primitives                         */
/* ------------------------------------------------------------------ */

import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

export function SliderRow({
  label, value, min, max, step = 0.01, onChange, format, accent = true, disabled,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string; accent?: boolean; disabled?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={cn('block select-none', disabled && 'opacity-35 pointer-events-none')}>
      <span className="flex items-baseline justify-between mb-0.5">
        <span className="df-label">{label}</span>
        <span className="df-value">{format ? format(value) : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        className="df-range"
        min={min} max={max} step={step} value={value}
        style={{ ['--track' as string]: `linear-gradient(90deg, ${accent ? '#c9f158' : '#4a4f57'} ${pct}%, #23262b ${pct}%)` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

export function SegRow<T extends string>({
  label, value, options, onChange,
}: {
  label?: string; value: T;
  options: { v: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      {label && <div className="df-label mb-1">{label}</div>}
      <div className="flex rounded-md border border-edge bg-panel2 p-0.5 gap-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            title={o.title}
            onClick={() => onChange(o.v)}
            className={cn(
              'flex-1 h-6 rounded-[5px] text-[9.5px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-colors',
              value === o.v ? 'bg-lime text-black font-semibold' : 'text-dim hover:text-zinc-200 hover:bg-edge',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleRow({
  label, value, onChange, hint,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      title={hint}
      className="w-full flex items-center justify-between py-1 group"
      aria-pressed={value}
    >
      <span className="df-label group-hover:text-zinc-300 transition-colors">{label}</span>
      <span className={cn(
        'w-7 h-4 rounded-full border transition-colors relative',
        value ? 'bg-lime/90 border-lime' : 'bg-panel2 border-edge2',
      )}>
        <span className={cn(
          'absolute top-[2px] w-2.5 h-2.5 rounded-full transition-all',
          value ? 'left-[15px] bg-black' : 'left-[2px] bg-dim',
        )} />
      </span>
    </button>
  );
}

export function ColorRow({
  label, value, onChange, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between', disabled && 'opacity-35 pointer-events-none')}>
      <span className="df-label">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="df-value">{value.toUpperCase()}</span>
        <span className="relative w-6 h-6 rounded-md border border-edge2 overflow-hidden cursor-pointer hover:border-lime transition-colors">
          <span className="absolute inset-0" style={{ background: value }} />
          <input
            type="color" value={value} onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label={label}
          />
        </span>
      </span>
    </div>
  );
}

export function Section({
  title, icon, children, defaultOpen = true, badge,
}: {
  title: string; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-edge">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 h-9 hover:bg-panel2/60 transition-colors"
        aria-expanded={open}
      >
        {icon && <span className="text-dim">{icon}</span>}
        <span className="df-label !text-[10px] flex-1 text-left">{title}</span>
        {badge && <span className="df-value mr-1">{badge}</span>}
        <ChevronDown size={12} className={cn('text-dim transition-transform', !open && '-rotate-90')} />
      </button>
      {open && <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 df-fadein">{children}</div>}
    </div>
  );
}

export function IconBtn({
  title, onClick, children, active, disabled, accent,
}: {
  title: string; onClick: () => void; children: ReactNode; active?: boolean; disabled?: boolean; accent?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-7 h-7 rounded-md border flex items-center justify-center transition-colors',
        accent
          ? 'bg-lime text-black border-lime hover:bg-lime/85'
          : active
            ? 'bg-edge2 text-lime border-edge2'
            : 'bg-transparent text-dim border-edge hover:text-zinc-100 hover:border-edge2 hover:bg-panel2',
        disabled && 'opacity-35 pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

export function ActionBtn({
  label, icon, onClick, primary, disabled, small,
}: {
  label: string; icon?: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-md border font-mono uppercase tracking-[0.12em] transition-colors',
        small ? 'h-7 text-[9px] px-2' : 'h-8 text-[10px] px-3',
        primary
          ? 'bg-lime text-black border-lime hover:bg-lime/85 font-semibold'
          : 'bg-panel2 text-zinc-300 border-edge hover:border-edge2 hover:text-white',
        disabled && 'opacity-35 pointer-events-none',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
