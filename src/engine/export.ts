/* ------------------------------------------------------------------ */
/*  DIFUSION — media export (still / WebM / PNG sequence) + downloads  */
/* ------------------------------------------------------------------ */

import { ParticleEngine } from './engine';
import { ZipWriter } from './zip';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, filename: string, mime = 'text/plain') {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export async function exportStill(
  engine: ParticleEngine,
  format: 'png' | 'webp',
  filename: string,
): Promise<void> {
  engine.renderStill();
  const blob = await engine.captureBlob(format === 'png' ? 'image/png' : 'image/webp', 0.94);
  downloadBlob(blob, filename);
}

export function pickVideoMime(): { mime: string; ext: string } | null {
  const candidates: [string, string][] = [
    ['video/webm;codecs=vp9', 'webm'],
    ['video/webm;codecs=vp8', 'webm'],
    ['video/webm', 'webm'],
    ['video/mp4;codecs=avc1', 'mp4'],
    ['video/mp4', 'mp4'],
  ];
  for (const [mime, ext] of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  }
  return null;
}

/**
 * Real-time WebM recording from the live canvas (MediaRecorder).
 * Records exactly `seconds` of the current animated field.
 */
export function exportWebM(
  engine: ParticleEngine,
  seconds: number,
  fps: number,
  filename: string,
  onProgress: (pct: number) => void,
  onDone: (ok: boolean, err?: string) => void,
): () => void {
  const picked = pickVideoMime();
  if (!picked) {
    onDone(false, 'Video recording is not supported in this browser.');
    return () => undefined;
  }
  const mime = picked.mime;
  const outName = filename.replace(/\.\w+$/, '') + '.' + picked.ext;
  const stream = engine.canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 12_000_000,
  });
  const chunks: Blob[] = [];
  let cancelled = false;
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onerror = () => { if (!cancelled) onDone(false, 'Recorder error.'); };
  rec.onstop = () => {
    window.clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
    if (cancelled) return;
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    if (!blob.size) { onDone(false, 'Recording produced no data.'); return; }
    downloadBlob(blob, outName);
    onDone(true);
  };
  const t0 = performance.now();
  const total = Math.max(1, seconds * 1000);
  const timer = window.setInterval(() => {
    const pct = Math.min(1, (performance.now() - t0) / total);
    onProgress(pct);
    if (pct >= 1) {
      window.clearInterval(timer);
      if (rec.state !== 'inactive') rec.stop();
    }
  }, 120);
  rec.start(250);
  return () => {
    cancelled = true;
    window.clearInterval(timer);
    if (rec.state !== 'inactive') { try { rec.stop(); } catch { onDone(false, 'cancelled'); } }
    stream.getTracks().forEach((t) => t.stop());
  };
}

/**
 * Deterministic PNG frame sequence packed into a real ZIP archive.
 * Advances the simulation in fixed steps so output is flicker-free.
 */
export async function exportFrameSequence(
  engine: ParticleEngine,
  frames: number,
  fps: number,
  filename: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  const zip = new ZipWriter();
  const dt = 1 / Math.max(1, fps);
  for (let f = 0; f < frames; f++) {
    engine.step(dt);
    engine.render();
    const blob = await engine.captureBlob('image/png');
    zip.add(`difusion_${String(f + 1).padStart(4, '0')}.png`, new Uint8Array(await blob.arrayBuffer()));
    onProgress((f + 1) / frames);
    if (f % 6 === 5) await new Promise((r) => setTimeout(r, 0));
  }
  const out = zip.finalize();
  downloadBlob(out, filename);
}
