/* ------------------------------------------------------------------ */
/*  Top bar — logo, project, media type, status, global actions        */
/* ------------------------------------------------------------------ */

import { Maximize, Minimize, HelpCircle, Code2, AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStudio } from '../state/store';
import { IconBtn } from './ui';
import { cn } from '../utils/cn';

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#101114" stroke="#23262b" />
      <g fill="#c9f158">
        <circle cx="20" cy="22" r="4.5" /><circle cx="33" cy="18" r="3" /><circle cx="45" cy="23" r="2.1" />
        <circle cx="23" cy="34" r="3.4" /><circle cx="36" cy="33" r="2.6" /><circle cx="48" cy="36" r="1.7" />
        <circle cx="21" cy="46" r="2.2" /><circle cx="32" cy="47" r="1.6" /><circle cx="44" cy="47" r="1.1" />
      </g>
    </svg>
  );
}

export default function TopBar() {
  const status = useStudio((s) => s.status);
  const task = useStudio((s) => s.task);
  const stats = useStudio((s) => s.stats);
  const assets = useStudio((s) => s.assets);
  const activeId = useStudio((s) => s.activeId);
  const projectName = useStudio((s) => s.projectName);
  const setProjectName = useStudio((s) => s.setProjectName);
  const setModal = useStudio((s) => s.setModal);
  const active = assets.find((a) => a.id === activeId);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const f = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);

  const busy = status.kind === 'sampling' || status.kind === 'recording' || status.kind === 'exporting';

  return (
    <header className="h-12 shrink-0 border-b border-edge bg-panel flex items-center gap-3 px-3 relative z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        <Logo />
        <div className="leading-none">
          <div className="font-bold text-[13px] tracking-[0.22em] text-white">DIFUSION</div>
          <div className="df-label mt-0.5 !text-[8px]">particle media studio</div>
        </div>
      </div>

      <div className="h-5 w-px bg-edge mx-1 hidden sm:block" />

      <input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="hidden sm:block bg-transparent border-0 outline-none text-[11px] font-mono text-zinc-400 hover:text-zinc-200 focus:text-lime w-40 truncate transition-colors"
        spellCheck={false}
        aria-label="Project name"
      />

      {active && (
        <span className="hidden md:inline-flex items-center gap-1.5 rounded border border-edge bg-panel2 px-1.5 py-0.5">
          <span className="df-label !text-[8.5px] !text-lime">IMG</span>
          <span className="font-mono text-[9.5px] text-zinc-400 max-w-[130px] truncate">{active.name}</span>
        </span>
      )}

      <div className="flex-1" />

      {/* status */}
      <div className="flex items-center gap-2 min-w-0">
        {status.kind === 'error' ? (
          <AlertTriangle size={11} className="text-red-400 shrink-0" />
        ) : busy ? (
          <Loader2 size={11} className="text-lime animate-spin shrink-0" />
        ) : (
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status.kind === 'ready' ? 'bg-lime' : 'bg-dim', task && 'df-pulse')} />
        )}
        <span className={cn('font-mono text-[9.5px] truncate max-w-[180px] sm:max-w-[260px]', status.kind === 'error' ? 'text-red-400' : 'text-dim')}>
          {task ? `${task.label} ${Math.round(task.pct * 100)}%` : status.text}
        </span>
        {task && (
          <div className="w-20 h-[3px] bg-edge rounded overflow-hidden hidden sm:block">
            <div className="h-full bg-lime transition-all" style={{ width: `${Math.round(task.pct * 100)}%` }} />
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-edge hidden sm:block" />

      <div className="hidden lg:flex items-center gap-2 font-mono text-[9px] text-dim">
        <span className="df-value">{Math.round(stats.fps)} FPS</span>
        <span>{stats.count.toLocaleString()} PTS</span>
      </div>

      <div className="flex items-center gap-1.5">
        <IconBtn title="Export / generate website code" onClick={() => setModal('export')} accent>
          <Code2 size={13} />
        </IconBtn>
        <IconBtn title="Help & shortcuts" onClick={() => setModal('help')}>
          <HelpCircle size={13} />
        </IconBtn>
        <IconBtn
          title={fs ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void document.documentElement.requestFullscreen().catch(() => undefined);
          }}
        >
          {fs ? <Minimize size={13} /> : <Maximize size={13} />}
        </IconBtn>
      </div>
    </header>
  );
}
