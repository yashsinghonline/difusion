/* ------------------------------------------------------------------ */
/*  Left rail — imported image assets, samples, presets                */
/* ------------------------------------------------------------------ */

import { useRef, useState } from 'react';
import {
  ImagePlus, Trash2, Save, FileJson, FolderOpen, Image as ImageIcon, AlertTriangle, Check,
} from 'lucide-react';
import { useStudio } from '../state/store';
import { ActionBtn } from './ui';
import { cn } from '../utils/cn';

function fmtSize(b: number): string {
  if (!b) return 'sample';
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return Math.round(b / 1e3) + ' KB';
}

export default function LeftRail() {
  const assets = useStudio((s) => s.assets);
  const activeId = useStudio((s) => s.activeId);
  const addFiles = useStudio((s) => s.addFiles);
  const selectAsset = useStudio((s) => s.selectAsset);
  const removeAsset = useStudio((s) => s.removeAsset);
  const presets = useStudio((s) => s.presets);
  const savePreset = useStudio((s) => s.savePreset);
  const applyPreset = useStudio((s) => s.applyPreset);
  const deletePreset = useStudio((s) => s.deletePreset);
  const exportJSON = useStudio((s) => s.exportJSON);
  const importJSON = useStudio((s) => s.importJSON);

  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [saveMode, setSaveMode] = useState(false);
  const [presetName, setPresetName] = useState('');

  return (
    <aside className="w-[212px] shrink-0 border-r border-edge bg-panel flex flex-col min-h-0">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <span className="df-label !text-[10px]">Assets</span>
        <span className="df-value">{assets.length}</span>
      </div>

      <div className="px-3">
        <ActionBtn small label="Import image" icon={<ImagePlus size={11} />} onClick={() => fileRef.current?.click()} />
      </div>
      <input
        ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); e.target.value = ''; }}
      />

      <div className="flex-1 overflow-y-auto scroll-thin mt-2 px-2 space-y-1 pb-2">
        {assets.map((a) => (
          <div
            key={a.id}
            className={cn(
              'group relative rounded-lg border overflow-hidden cursor-pointer transition-all',
              a.id === activeId ? 'border-lime/70 ring-1 ring-lime/30' : 'border-edge hover:border-edge2',
            )}
            onClick={() => void selectAsset(a.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') void selectAsset(a.id); }}
          >
            <div className="h-[74px] bg-black relative">
              {a.thumb ? (
                <img src={a.thumb} alt={a.name} className="w-full h-full object-cover opacity-90" draggable={false} />
              ) : (
                <div className="w-full h-full grid place-items-center text-dim">
                  <ImageIcon size={16} />
                </div>
              )}
              <span className="absolute top-1 left-1 rounded px-1 py-px font-mono text-[8px] tracking-wider bg-black/70 text-lime border border-edge">
                IMG
              </span>
              {a.error && (
                <span className="absolute top-1 right-1 text-red-400"><AlertTriangle size={11} /></span>
              )}
              <button
                className="absolute bottom-1 right-1 w-5 h-5 rounded bg-black/70 border border-edge text-dim hover:text-red-400 hover:border-red-400/50 hidden group-hover:flex items-center justify-center"
                title="Remove asset"
                onClick={(e) => { e.stopPropagation(); removeAsset(a.id); }}
              >
                <Trash2 size={10} />
              </button>
            </div>
            <div className="px-2 py-1.5 border-t border-edge bg-panel2/60">
              <div className="text-[10px] text-zinc-300 truncate leading-tight">{a.name}</div>
              <div className="df-label !text-[8px] mt-0.5">{fmtSize(a.size)}</div>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="rounded-lg border border-dashed border-edge2 p-3 text-center df-label !normal-case !tracking-normal !text-[10px]">
            Drop an image anywhere on the canvas
          </div>
        )}
      </div>

      {/* presets */}
      <div className="border-t border-edge px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="df-label !text-[10px]">Presets</span>
          <button
            className="text-dim hover:text-lime transition-colors"
            title="Save current look as preset"
            onClick={() => setSaveMode((v) => !v)}
          >
            <Save size={12} />
          </button>
        </div>
        {saveMode && (
          <div className="flex gap-1 mb-2 df-fadein">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="preset name"
              className="flex-1 min-w-0 h-7 bg-panel2 border border-edge rounded px-2 text-[10px] font-mono outline-none focus:border-lime"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && presetName.trim()) {
                  savePreset(presetName.trim()); setPresetName(''); setSaveMode(false);
                }
              }}
            />
            <button
              className="w-7 h-7 rounded bg-lime text-black grid place-items-center disabled:opacity-30"
              disabled={!presetName.trim()}
              onClick={() => { savePreset(presetName.trim()); setPresetName(''); setSaveMode(false); }}
            >
              <Check size={12} />
            </button>
          </div>
        )}
        <div className="max-h-[104px] overflow-y-auto scroll-thin space-y-1">
          {presets.map((p, i) => (
            <div key={p.ts + p.name} className="group flex items-center gap-1 rounded border border-edge bg-panel2/50 px-2 h-7">
              <button className="flex-1 text-left text-[10px] font-mono text-zinc-300 truncate hover:text-lime" onClick={() => applyPreset(i)}>
                {p.name}
              </button>
              <button className="text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deletePreset(i)}>
                <Trash2 size={10} />
              </button>
            </div>
          ))}
          {presets.length === 0 && !saveMode && (
            <div className="df-label !normal-case !tracking-normal !text-[9.5px] opacity-70">No presets yet — save the current look.</div>
          )}
        </div>
      </div>

      {/* project io */}
      <div className="border-t border-edge p-3 grid grid-cols-2 gap-1.5">
        <ActionBtn small label="JSON" icon={<FileJson size={11} />} onClick={exportJSON} />
        <ActionBtn small label="Open" icon={<FolderOpen size={11} />} onClick={() => jsonRef.current?.click()} />
        <input
          ref={jsonRef} type="file" accept=".json,application/json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJSON(f); e.target.value = ''; }}
        />
      </div>
    </aside>
  );
}
