/* ------------------------------------------------------------------ */
/*  DIFUSION — application shell                                       */
/* ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus, Layers, Palette, SlidersHorizontal, X } from 'lucide-react';
import TopBar from './components/TopBar';
import LeftRail from './components/LeftRail';
import Stage from './components/Stage';
import BottomBar from './components/BottomBar';
import RightPanel from './components/RightPanel';
import ExportModal from './components/ExportModal';
import HelpModal from './components/HelpModal';
import { engineAPI, useStudio } from './state/store';
import { cn } from './utils/cn';

export default function App() {
  const modal = useStudio((s) => s.modal);
  const setModal = useStudio((s) => s.setModal);
  const sheet = useStudio((s) => s.sheet);
  const setSheet = useStudio((s) => s.setSheet);
  const addFiles = useStudio((s) => s.addFiles);
  const patch = useStudio((s) => s.patch);
  const resetCamera = useStudio((s) => s.resetCamera);
  const playing = useStudio((s) => s.params.playing);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  /* global shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.key === ' ') { e.preventDefault(); patch({ playing: !useStudio.getState().params.playing }); }
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      } else if (e.key === 'r' || e.key === 'R') resetCamera();
      else if (e.key === 'b' || e.key === 'B') engineAPI.engine?.reform();
      else if (e.key === 'e' || e.key === 'E') setModal(useStudio.getState().modal === 'export' ? null : 'export');
      else if (e.key === '?') setModal(useStudio.getState().modal === 'help' ? null : 'help');
      else if (e.key === 'Escape') { setModal(null); setSheet(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [patch, resetCamera, setModal, setSheet]);

  return (
    <div
      className="h-full w-full flex flex-col bg-void text-zinc-200 overflow-hidden font-display"
      onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; if (e.dataTransfer.types.includes('Files')) setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); dragDepth.current--; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
      }}
    >
      <TopBar />

      <div className="flex flex-1 min-h-0">
        <div className="hidden md:flex min-h-0">
          <LeftRail />
        </div>

        <main className="flex flex-col flex-1 min-w-0 min-h-0">
          <Stage />
          <div className={cn('hidden sm:block', !playing && '')}>
            <BottomBar />
          </div>
        </main>

        <div className="hidden lg:flex min-h-0">
          <RightPanel />
        </div>
      </div>

      {/* mobile / tablet bottom tab bar */}
      <nav className="lg:hidden shrink-0 border-t border-edge bg-panel grid grid-cols-4 h-12">
        {([
          ['assets', 'Media', ImagePlus],
          ['field', 'Field', SlidersHorizontal],
          ['style', 'Style', Palette],
          ['exportx', 'Export', Download],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => (id === 'exportx' ? setModal('export') : setSheet(sheet === id ? null : (id as 'assets' | 'field' | 'style')))}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 font-mono text-[8px] uppercase tracking-widest',
              sheet === id ? 'text-lime' : 'text-dim',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </nav>

      {/* mobile sheet */}
      {sheet && (
        <div className="lg:hidden fixed inset-x-0 bottom-12 z-40 df-fadeup">
          <div className="mx-2 mb-2 rounded-xl border border-edge2 bg-panel shadow-2xl max-h-[62vh] overflow-y-auto scroll-thin">
            <div className="sticky top-0 flex items-center justify-between px-3 h-9 bg-panel border-b border-edge z-10">
              <span className="df-label !text-[10px] flex items-center gap-1.5">
                <Layers size={11} className="text-lime" />
                {sheet === 'assets' ? 'Media assets' : sheet === 'field' ? 'Particle field' : 'Render & style'}
              </span>
              <button onClick={() => setSheet(null)} className="w-6 h-6 grid place-items-center text-dim"><X size={12} /></button>
            </div>
            {sheet === 'assets' && <MobileWrap><LeftRail /></MobileWrap>}
            {sheet === 'field' && <BottomBar />}
            {sheet === 'style' && <MobileWrap><RightPanel /></MobileWrap>}
          </div>
        </div>
      )}

      {/* drop overlay */}
      {dragging && (
        <div className="fixed inset-3 z-40 rounded-2xl border-2 border-dashed border-lime bg-lime/5 grid place-items-center pointer-events-none df-fadein">
          <div className="text-center">
            <ImagePlus size={22} className="text-lime mx-auto mb-2" />
            <div className="font-mono text-[11px] tracking-[0.2em] text-lime uppercase">Drop to particle-ize</div>
            <div className="df-label mt-1">image</div>
          </div>
        </div>
      )}

      {modal === 'export' && <ExportModal />}
      {modal === 'help' && <HelpModal />}
    </div>
  );
}

function MobileWrap({ children }: { children: React.ReactNode }) {
  /* neutralize fixed rail widths inside the sheet */
  return <div className="[&>aside]:!w-full [&>aside]:!border-0">{children}</div>;
}
