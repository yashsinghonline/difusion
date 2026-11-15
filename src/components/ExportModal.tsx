/* ------------------------------------------------------------------ */
/*  Export center — website code generator with live preview           */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Eye, RefreshCw, X, Info } from 'lucide-react';
import { engineAPI, useStudio } from '../state/store';
import { downloadText } from '../engine/export';
import {
  ATTR_DOCS, COMPONENT_DRIVER_JS, RUNTIME_JS, buildComponentUsage, buildEmbedSnippet,
  buildSelfContainedPage, buildSettingsJSON, buildStandaloneHTML, collapseForDisplay, paramsToAttrs,
} from '../runtime/codegen';
import { ActionBtn } from './ui';
import { cn } from '../utils/cn';

type Tab = 'embed' | 'component' | 'standalone' | 'settings';

export default function ExportModal() {
  const setModal = useStudio((s) => s.setModal);
  const tab = useStudio((s) => s.exportTab) as Tab;
  const setTab = useStudio((s) => s.setExportTab);
  const params = useStudio((s) => s.params);
  const assets = useStudio((s) => s.assets);
  const activeId = useStudio((s) => s.activeId);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const active = assets.find((a) => a.id === activeId);

  /* Sprites are stored as data URLs at upload time — one source of truth
     shared by the live engine, the modal preview and every download. */
  const spriteSrc = params.customSprite;

  /* current image as compact embeddable data-url (from the live renderer) */
  const imgDataUrl = useMemo(() => {
    if (!active) return null;
    return engineAPI.engine?.sourceDataURL(1200) ?? null;
  }, [active]);

  /* src per output kind — a real packaged asset or an explicit hosting placeholder */
  const exportSrc = useMemo(() => {
    if (!active) return '';
    return imgDataUrl ?? 'https://your-website.com/media/source.webp';
  }, [active, imgDataUrl]);

  const standaloneSrc = imgDataUrl ?? '';

  const standaloneNote = imgDataUrl
    ? 'Media embedded as a 1200px WebP data-url. Replace src with a full-resolution hosted URL for production. The file is fully self-contained — open it anywhere.'
    : 'Load a source image first — then this file ships with the media embedded.';

  const attrsEmbed = useMemo(() => paramsToAttrs(params, exportSrc, spriteSrc), [params, exportSrc, spriteSrc]);
  const attrsStandalone = useMemo(
    () => paramsToAttrs(params, standaloneSrc || 'https://your-website.com/media/source.webp', spriteSrc),
    [params, standaloneSrc, spriteSrc],
  );

  /* the exact visual output — same attrs and same runtime in preview + downloads */
  const outputs = useMemo(() => ({
    embed: {
      filename: 'difusion-embed.html',
      /* shown in the editor: compact snippet for integration */
      code: buildEmbedSnippet(attrsEmbed),
      /* downloaded: self-contained page — opens with the same result as the preview */
      download: buildSelfContainedPage(attrsEmbed, 'DIFUSION embed'),
      note: 'The code above is the integration snippet (host difusion-particles.js next to your page). The downloaded file is self-contained — runtime, media and settings inlined — so it renders exactly like the preview when opened directly.',
    },
    component: {
      filename: 'difusion-component.html',
      code: buildComponentUsage(attrsEmbed),
      download: buildSelfContainedPage(attrsEmbed, 'DIFUSION component', COMPONENT_DRIVER_JS),
      note: 'Reusable framework-agnostic custom element with events, methods and live attribute updates. Downloaded file includes the runtime inline and runs on open.',
    },
    standalone: {
      filename: 'difusion-standalone.html',
      code: buildStandaloneHTML(attrsStandalone, standaloneNote),
      download: buildStandaloneHTML(attrsStandalone, standaloneNote),
      note: standaloneNote,
    },
    settings: {
      filename: 'difusion-settings.json',
      code: buildSettingsJSON(attrsEmbed, params, active?.name ?? 'none'),
      download: buildSettingsJSON(attrsEmbed, params, active?.name ?? 'none'),
      note: 'Full configuration with every supported attribute, events and methods.',
    },
  }), [attrsEmbed, attrsStandalone, standaloneNote, params, active]);

  const out = outputs[tab];

  /*
   * The preview renders the EXACT file that gets downloaded — same HTML
   * document, same attributes, same inlined runtime — inside an iframe.
   * Parity by construction: preview === downloaded output.
   */
  const [srcDoc, setSrcDoc] = useState('');
  useEffect(() => {
    if (!preview || tab === 'settings') return;
    const t = window.setTimeout(() => setSrcDoc(out.download), 300);
    return () => window.clearTimeout(t);
  }, [preview, tab, out.download, reloadKey]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(out.code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = out.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const runtimeKB = Math.round(RUNTIME_JS.length / 102.4) / 10;
  const inlineKB = Math.round(outputs.standalone.code.length / 1024);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'embed', label: 'Embed' },
    { id: 'component', label: 'Component' },
    { id: 'standalone', label: 'Standalone' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 df-fadein" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
      <div className="relative w-[min(880px,100%)] max-h-[92vh] flex flex-col rounded-xl border border-edge2 bg-panel shadow-2xl df-fadeup">
        {/* header */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-edge shrink-0">
          <span className="font-bold text-[12px] tracking-[0.2em] text-white">EXPORT & EMBED</span>
          <span className="df-label hidden sm:inline">reusable interactive website code</span>
          <div className="flex-1" />
          <button onClick={() => setModal(null)} className="w-7 h-7 rounded-md border border-edge text-dim hover:text-white grid place-items-center">
            <X size={13} />
          </button>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'h-7 px-3 rounded-md font-mono text-[10px] uppercase tracking-wider border transition-colors',
                tab === t.id ? 'bg-lime text-black border-lime font-semibold' : 'border-edge text-dim hover:text-zinc-200 hover:border-edge2',
              )}
            >
              {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <span className="df-label hidden md:inline">runtime {runtimeKB} KB · download ≈{Math.max(1, Math.round(out.download.length / 1024))} KB</span>
        </div>

        {/* body */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-thin p-4 space-y-3">
          <div className="flex gap-2 items-start rounded-lg border border-edge bg-panel2/60 px-3 py-2">
            <Info size={11} className="text-lime mt-0.5 shrink-0" />
            <p className="text-[10.5px] leading-relaxed text-dim">{out.note}</p>
          </div>

          <div className="relative rounded-lg border border-edge bg-black/60 overflow-hidden">
            <pre className="df-code p-3.5 max-h-[300px] overflow-auto scroll-thin">{collapseForDisplay(out.code)}</pre>
          </div>

          {tab === 'settings' && (
            <div className="rounded-lg border border-edge overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-edge bg-panel2/60">
                    <th className="df-label px-3 py-1.5 font-normal">Attribute</th>
                    <th className="df-label px-3 py-1.5 font-normal">Purpose</th>
                    <th className="df-label px-3 py-1.5 font-normal">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {ATTR_DOCS.map(([a, d, def]) => (
                    <tr key={a} className="border-b border-edge/50 last:border-0">
                      <td className="px-3 py-1 font-mono text-[10px] text-lime">{a}</td>
                      <td className="px-3 py-1 text-[10.5px] text-zinc-400">{d}</td>
                      <td className="px-3 py-1 font-mono text-[10px] text-dim">{def}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* live preview — literally runs the downloaded file */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ActionBtn small label={preview ? 'Hide preview' : 'Live preview'} icon={<Eye size={11} />} onClick={() => setPreview((v) => !v)} primary={preview} />
              {preview && (
                <ActionBtn small label="Reload" icon={<RefreshCw size={11} />} onClick={() => setReloadKey((k) => k + 1)} />
              )}
              {preview && tab !== 'settings' && <span className="df-label">this is the actual downloaded file rendering</span>}
              {preview && tab === 'settings' && <span className="df-label">settings json has no visual output</span>}
            </div>
            {preview && tab !== 'settings' && (
              <div className="rounded-lg border border-edge bg-void h-[340px] overflow-hidden df-fadein">
                {srcDoc ? (
                  <iframe
                    key={reloadKey}
                    title="Downloaded-file preview"
                    srcDoc={srcDoc}
                    className="w-full h-full border-0 block"
                  />
                ) : (
                  <div className="h-full grid place-items-center font-mono text-[10px] tracking-widest text-dim uppercase df-pulse">
                    Building file…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-edge shrink-0">
          <ActionBtn label={copied ? 'Copied' : 'Copy code'} icon={copied ? <Check size={11} /> : <Copy size={11} />} onClick={() => void copy()} primary />
          <ActionBtn
            label={`Download ${out.filename}`}
            icon={<Download size={11} />}
            onClick={() => downloadText(
              out.download,
              out.filename,
              out.filename.endsWith('.html') ? 'text/html' : out.filename.endsWith('.json') ? 'application/json' : 'text/plain',
            )}
          />
          {(tab === 'embed' || tab === 'component') && (
            <ActionBtn label="difusion-particles.js" icon={<Download size={11} />} onClick={() => downloadText(RUNTIME_JS, 'difusion-particles.js', 'text/javascript')} />
          )}
          <div className="flex-1" />
          {tab !== 'standalone' && <span className="df-label hidden lg:inline">standalone bundle ≈{inlineKB} KB inline · preview = file</span>}
        </div>
      </div>
    </div>
  );
}
