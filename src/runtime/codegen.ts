/* ------------------------------------------------------------------ */
/*  DIFUSION — website code generator                                  */
/*  Produces a real, self-contained <difusion-particles> web component */
/*  (WebGL renderer, editor-parity physics, events, methods).          */
/* ------------------------------------------------------------------ */

import { EngineParams } from '../engine/types';

export { RUNTIME_JS } from './runtimeSource';
import { RUNTIME_JS } from './runtimeSource';

/* The exported renderer lives separately so it can be validated as standalone JavaScript. */

/* ---------------------------------------------------------------- */
/*  attribute derivation                                             */
/* ---------------------------------------------------------------- */

export function paramsToAttrs(P: EngineParams, src: string, spriteSrc?: string | null): Record<string, string> {
  const a: Record<string, string> = { src };
  a['particle-count'] = String(Math.round(P.count));
  a.density = P.density.toFixed(2);
  a['particle-size'] = P.size.toFixed(2);
  a['size-variance'] = P.sizeVariance.toFixed(2);
  a.shape = P.shape === 'sprite' && !spriteSrc ? 'soft' : P.shape;
  if (P.shape === 'sprite' && spriteSrc) a['sprite-src'] = spriteSrc;
  a['color-mode'] = P.colorMode === 'palette' ? 'custom' : P.colorMode === 'mono' ? 'monochrome' : P.colorMode;
  a['mono-color'] = P.monoColor;
  a['gradient-a'] = P.gradientA;
  a['gradient-b'] = P.gradientB;
  a.palette = P.palette.filter(Boolean).join(',');
  a.exposure = P.exposure.toFixed(2);
  a.brightness = P.brightness.toFixed(2);
  a.contrast = P.contrast.toFixed(2);
  a.saturation = P.saturation.toFixed(2);
  a.hue = P.hue.toFixed(4);
  a.temperature = P.temperature.toFixed(2);
  a.background = P.background;
  a.transparent = P.transparent ? 'true' : 'false';
  a.opacity = P.opacity.toFixed(2);
  a.glow = P.glow.toFixed(2);
  a.trails = P.trails.toFixed(2);
  a['line-mode'] = P.lineMode;
  a.quality = P.quality;
  a.depth = P.depth.toFixed(2);
  a.parallax = P.parallax.toFixed(2);
  a.perspective = P.perspective.toFixed(2);
  a.zoom = P.zoom.toFixed(2);
  a['pan-x'] = P.panX.toFixed(3);
  a['pan-y'] = P.panY.toFixed(3);
  a.rotation = P.rotation.toFixed(4);
  a.drift = P.drift.toFixed(2);
  a.spread = P.spread.toFixed(2);
  a.turbulence = P.turbulence.toFixed(2);
  a.flow = P.flow.toFixed(2);
  a['flow-angle'] = P.flowAngle.toFixed(4);
  a.swirl = P.swirl.toFixed(2);
  a['return-force'] = P.returnForce.toFixed(2);
  a.interactive = 'true';
  a['interaction-radius'] = String(Math.round(P.pointerRadius));
  a.repulsion = P.repulsion.toFixed(2);
  a.attraction = P.attraction.toFixed(2);
  a.motion = P.playing ? 'true' : 'false';
  a.speed = P.speed.toFixed(2);
  a.amplitude = P.amplitude.toFixed(2);
  a.autoplay = 'true';
  return a;
}

export function attrsToString(attrs: Record<string, string>, indent: string): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${indent}${k}="${v}"`)
    .join('\n');
}

/** collapse long attribute values for on-screen display only */
export function collapseForDisplay(code: string): string {
  return code.replace(/="([^"]{96,})"/g, (_m) => '="(embedded media data — full value in downloaded file)"');
}

export function attrsToInlineJS(attrs: Record<string, string>): Record<string, string> { return attrs; }

/* ---------------------------------------------------------------- */
/*  code outputs                                                     */
/* ---------------------------------------------------------------- */

export const EMBED_SNIPPET_HEAD =
  '<!-- DIFUSION embed — interactive particle field -->\n' +
  '<!-- 1. Host difusion-particles.js on your site, or keep it next to this page -->\n' +
  '<script src="./difusion-particles.js" defer></scr' + 'ipt>';

export function buildEmbedSnippet(attrs: Record<string, string>): string {
  return (
    EMBED_SNIPPET_HEAD +
    '\n\n<!-- 2. Place the interactive effect anywhere on your page -->\n' +
    '<difusion-particles\n' + attrsToString(attrs, '  ') + '\n></difusion-particles>\n\n' +
    '<style>\n' +
    '  difusion-particles {\n' +
    '    display: block;\n' +
    '    width: 100%;\n' +
    '    height: 560px; /* the component is fully responsive */\n' +
    '    overflow: hidden;\n' +
    (attrs.background && attrs.background !== 'transparent'
      ? `    background: ${attrs.background};\n`
      : '') +
    '  }\n' +
    '</style>'
  );
}

export const COMPONENT_DRIVER_JS =
  "const fx = document.querySelector('difusion-particles');\n" +
  "fx.addEventListener('difusion-ready',  (e) => console.log('ready', e.detail));\n" +
  "fx.addEventListener('difusion-error',  (e) => console.warn(e.detail));\n" +
  "fx.addEventListener('difusion-pause',  ()  => console.log('paused'));\n\n" +
  '// fx.pause();  fx.play();  fx.reform();  fx.destroy();\n' +
  '// Every exported setting live-updates, including physics and color tuning:\n' +
  "// fx.setAttribute('flow-angle', '1.57');\n" +
  "// fx.setAttribute('saturation', '1.25');";

export function buildComponentUsage(attrs: Record<string, string>): string {
  return (
    '<!-- Register the runtime once, then reuse the element anywhere. -->\n' +
    '<script src="./difusion-particles.js" defer></scr' + 'ipt>\n\n' +
    '<difusion-particles\n' + attrsToString(attrs, '  ') + '\n></difusion-particles>\n\n' +
    '<!-- Optional: drive it from your own code -->\n' +
    '<script>\n' + COMPONENT_DRIVER_JS + '\n</scr' + 'ipt>'
  );
}

/** A download-ready page whose rendered result matches the studio preview exactly. */
export function buildSelfContainedPage(
  attrs: Record<string, string>,
  title: string,
  driverScript = '',
): string {
  const rawBg = attrs.background || '#050506';
  /* editor parity: a transparent canvas still previews over the stage color */
  const bg = rawBg;
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    `<title>${title}</title>\n` +
    '<style>\n' +
    `  html,body{margin:0;min-height:100%;background:${bg};font-family:ui-sans-serif,system-ui,sans-serif}\n` +
    '  .df-wrap{max-width:1200px;margin:0 auto;padding:48px 20px 72px}\n' +
    `  difusion-particles{display:block;width:100%;height:min(72vh,720px);overflow:hidden;border-radius:12px;background:${bg}}\n` +
    '</style>\n</head>\n<body>\n' +
    '<div class="df-wrap">\n' +
    '<difusion-particles\n' + attrsToString(attrs, '  ') + '\n></difusion-particles>\n' +
    '</div>\n' +
    (driverScript ? '<script>\n' + driverScript + '\n</scr' + 'ipt>\n' : '') +
    '<!-- DIFUSION self-contained runtime (no dependencies) -->\n' +
    '<script>\n' + RUNTIME_JS + '\n</scr' + 'ipt>\n' +
    '</body>\n</html>'
  );
}

export function buildStandaloneHTML(attrs: Record<string, string>, note: string): string {
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '<title>DIFUSION — standalone particle export</title>\n' +
    '<style>\n' +
    '  html,body{margin:0;height:100%;background:' +
    (attrs.background && attrs.background !== 'transparent' ? attrs.background : '#050506') +
    ';display:grid;place-items:center}\n' +
    '  difusion-particles{display:block;width:min(1100px,94vw);height:min(72vh,720px);overflow:hidden;border-radius:12px}\n' +
    '</style>\n</head>\n<body>\n' +
    (note ? `<!-- ${note} -->\n` : '') +
    '<difusion-particles\n' + attrsToString(attrs, '  ') + '\n></difusion-particles>\n\n' +
    '<!-- DIFUSION self-contained runtime (no dependencies) -->\n' +
    '<script>\n' + RUNTIME_JS + '\n</scr' + 'ipt>\n' +
    '</body>\n</html>'
  );
}

export function buildSettingsJSON(
  attrs: Record<string, string>,
  P: EngineParams,
  assetName: string,
): string {
  return JSON.stringify(
    {
      $schema: 'https://difusion.studio/schema/v2.json',
      generator: 'DIFUSION 2.0',
      asset: assetName,
      component: {
        tag: 'difusion-particles',
        attributes: attrs,
        events: ['difusion-ready', 'difusion-error', 'difusion-play', 'difusion-pause'],
        methods: ['play()', 'pause()', 'reform()', 'burst(clientX, clientY)', 'destroy()', 'setAttribute(name, value)'],
        notes: [
          'The export uses the same sampling, color correction, physics, camera, and render modes as the editor.',
          'All listed attributes live-update. Source, density, count, and quality changes re-sample the image.',
          'The component respects prefers-reduced-motion and pauses while hidden.',
          'destroy() releases WebGL resources, observers, and listeners.',
        ],
      },
      editor: { particles: P },
    },
    null,
    2,
  );
}

/* attribute documentation for the Settings tab */
export const ATTR_DOCS: Array<[string, string, string]> = [
  ['src', 'Image URL or data URL. CORS-accessible when external.', '—'],
  ['particle-count', 'Maximum number of particles', '18000'],
  ['density', 'Source sampling density 0..1', '0.62'],
  ['particle-size', 'Base particle size px', '2.1'],
  ['size-variance', 'Per-particle size variation 0..1', '0.62'],
  ['sprite-src', 'Sprite image URL or data URL when shape="sprite"', '—'],
  ['color-mode', 'original · monochrome · gradient · custom', 'original'],
  ['mono-color', 'Color used by monochrome mode', '#c9f158'],
  ['gradient-a / gradient-b', 'Gradient endpoints', 'lime / violet'],
  ['palette', 'Comma list of colors for custom mode', '—'],
  ['exposure', 'Photographic exposure in stops', '0'],
  ['brightness / contrast', 'Image luminance correction', '0 / 1'],
  ['saturation / hue', 'Color intensity and hue rotation', '1 / 0'],
  ['temperature', 'Cool (-1) to warm (+1)', '0'],
  ['background / transparent', 'Canvas background treatment', '#050506 / false'],
  ['depth / perspective', 'Z displacement and camera projection', '0.55 / 0.5'],
  ['zoom / pan-x / pan-y / rotation', 'Camera transform', '1 / 0 / 0 / 0'],
  ['drift / spread / turbulence', 'Ambient particle movement', '0.22 / 0.12 / 0.32'],
  ['flow / flow-angle / swirl', 'Directional and rotational movement', '0.22 / 0.6 / 0.18'],
  ['return-force', 'Spring strength restoring source positions', '0.48'],
  ['interactive', 'Enable pointer interaction', 'true'],
  ['interaction-radius', 'Pointer influence radius px', '150'],
  ['repulsion / attraction', 'Pointer push and pull strengths', '0.9 / 0.2'],
  ['motion', 'Ambient animation on/off', 'true'],
  ['speed / amplitude', 'Animation timing and range', '0.8 / 0.85'],
  ['trails', 'Motion-trail persistence 0..0.97', '0.22'],
  ['line-mode', 'points or streaks rendering', 'points'],
  ['glow', 'Additive luminous rendering 0..1', '0.45'],
  ['opacity', 'Particle alpha 0..1', '0.95'],
  ['shape', 'circle · square · soft', 'soft'],
  ['quality', 'low · balanced · high · ultra', 'high'],
  ['autoplay', 'Start the component renderer automatically', 'true'],
];
