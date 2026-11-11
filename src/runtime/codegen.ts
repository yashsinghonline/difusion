/* ------------------------------------------------------------------ */
/*  DIFUSION — website code generator                                  */
/*  Produces a real, self-contained <difusion-particles> web component */
/*  (WebGL renderer, physics, video pipeline, events, methods).        */
/* ------------------------------------------------------------------ */

import { EngineParams, VideoParams } from '../engine/types';

/* ---------------------------------------------------------------- */
/*  The component runtime. Written with plain string concatenation   */
/*  so it stays a clean single-file script when exported.            */
/* ---------------------------------------------------------------- */
export const RUNTIME_JS = [
  '/*! DIFUSION particles runtime v1.0 — self-contained, no dependencies.',
  ' *  <difusion-particles> — https://difusion.studio · MIT              */',
  '(function () {',
  "  'use strict';",
  "  var TAG = 'difusion-particles';",
  '  if (customElements.get(TAG)) return;',
  '',
  "  var VERT = [",
  "    'attribute vec3 aPos;attribute vec3 aCol;attribute float aSize;',",
  "    'uniform float uAspect;uniform float uZoom;uniform vec2 uPar;uniform float uPointScale;',",
  "    'varying vec3 vCol;varying float vFade;',",
  "    'void main(){vec3 p=aPos;p.xy+=uPar*p.z;float persp=1.0/max(0.25,1.0+p.z*1.1);p.xy*=persp;',",
  "    'vFade=clamp(persp*persp,0.35,1.3);gl_Position=vec4(p.x*uZoom/uAspect,p.y*uZoom,0.0,1.0);',",
  "    'gl_PointSize=clamp(aSize*uPointScale*persp,1.0,90.0);vCol=aCol;}'",
  "  ].join('\\n');",
  "  var FRAG = [",
  "    'precision mediump float;varying vec3 vCol;varying float vFade;',",
  "    'uniform sampler2D uTex;uniform float uShape;uniform float uOpacity;uniform float uGlow;',",
  "    'void main(){vec2 uv=gl_PointCoord-0.5;float a=1.0;',",
  "    'if(uShape<0.5){float d=length(uv);a=1.0-smoothstep(0.40,0.5,d);if(a<=0.002)discard;}',",
  "    'else if(uShape<1.5){float d=length(uv)*2.0;a=exp(-d*d*2.6);if(a<=0.004)discard;}',",
  "    'gl_FragColor=vec4(vCol*mix(1.0,1.5,uGlow),a*uOpacity*vFade);}'",
  "  ].join('\\n');",
  "  var FVERT = 'attribute vec2 aXY;void main(){gl_Position=vec4(aXY,0,1);}';",
  "  var FFRAG = 'precision mediump float;uniform vec4 uFade;void main(){gl_FragColor=uFade;}';",
  '',
  '  function hex(c, d) {',
  "    var h = String(c || '').replace('#', '');",
  "    if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join('');",
  '    var n = parseInt(h || "000000", 16);',
  '    if (isNaN(n)) return d;',
  '    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];',
  '  }',
  '  function compile(gl, type, src) {',
  '    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);',
  '    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");',
  '    return s;',
  '  }',
  '  function program(gl, vs, fs) {',
  '    var p = gl.createProgram();',
  '    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));',
  '    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));',
  '    gl.linkProgram(p);',
  '    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link");',
  '    return p;',
  '  }',
  '  function dotTexture(gl) {',
  '    var S = 64, cv = document.createElement("canvas"); cv.width = cv.height = S;',
  '    var cx = cv.getContext("2d");',
  '    var g = cx.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);',
  '    g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(0.4,"rgba(255,255,255,0.8)");',
  '    g.addColorStop(1,"rgba(255,255,255,0)");',
  '    cx.fillStyle = g; cx.fillRect(0,0,S,S);',
  '    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);',
  '    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);',
  '    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);',
  '    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);',
  '    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);',
  '    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);',
  '    return t;',
  '  }',
  '',
  '  function DifusionParticles() { return Reflect.construct(HTMLElement, [], DifusionParticles); }',
  '  DifusionParticles.prototype = Object.create(HTMLElement.prototype);',
  '  DifusionParticles.prototype.constructor = DifusionParticles;',
  '  Object.setPrototypeOf(DifusionParticles, HTMLElement);',
  '',
  '  var ATTRS = ["src","particle-count","particle-size","color-mode","background","depth",',
  '    "interactive","interaction-radius","repulsion","attraction","motion","speed","trails",',
  '    "autoplay","loop","quality","shape","glow","opacity","palette","tint","muted","aspect"];',
  '  Object.defineProperty(DifusionParticles, "observedAttributes", { get: function () { return ATTRS; } });',
  '',
  '  DifusionParticles.prototype.connectedCallback = function () {',
  '    var el = this;',
  '    if (el._boot) { if (el._ready && el._cfg && el._cfg.autoplay && !el._running) el._start(); return; }',
  '    el._boot = true;',
  '    el._readCfg();',
  '    var root = el.attachShadow({ mode: "open" });',
  '    var style = document.createElement("style");',
  '    style.textContent = ":host{display:block;position:relative;overflow:hidden;contain:content}" +',
  '      "canvas{position:absolute;inset:0;width:100%;height:100%;display:block}" +',
  '      ".df-msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +',
  '      "font:12px/1.5 system-ui,sans-serif;color:#888;padding:16px;text-align:center}";',
  '    var cv = document.createElement("canvas");',
  '    root.appendChild(style); root.appendChild(cv);',
  '    el._cv = cv;',
  '    try {',
  '      el._gl = cv.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });',
  '      if (!el._gl) throw new Error("no webgl");',
  '      el._initGL();',
  '    } catch (e) {',
  '      var m = document.createElement("div"); m.className = "df-msg";',
  '      m.textContent = "DIFUSION requires WebGL, which is unavailable in this browser.";',
  '      root.appendChild(m);',
  '      el._emit("difusion-error", { message: "webgl-unavailable" });',
  '      return;',
  '    }',
  '    el._ptr = { x: 0, y: 0, on: false };',
  '    el._raf = 0; el._running = false; el._t = 0; el._last = 0;',
  '    el._onMove = function (ev) {',
  '      var r = cv.getBoundingClientRect();',
  '      var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);',
  '      var cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);',
  '      el._ptr.x = ((cx - r.left) / Math.max(1, r.width)) * 2 - 1;',
  '      el._ptr.y = -(((cy - r.top) / Math.max(1, r.height)) * 2 - 1);',
  '      el._ptr.on = true;',
  '    };',
  '    el._onLeave = function () { el._ptr.on = false; };',
  '    el._onVis = function () { if (document.hidden) el._stop(); else if (el._cfg.autoplay) el._start(); };',
  '    if (el._cfg.interactive) {',
  '      cv.addEventListener("pointermove", el._onMove, { passive: true });',
  '      cv.addEventListener("pointerdown", el._onMove, { passive: true });',
  '      cv.addEventListener("touchmove", el._onMove, { passive: true });',
  '      cv.addEventListener("pointerleave", el._onLeave);',
  '    }',
  '    document.addEventListener("visibilitychange", el._onVis);',
  '    el._ro = new ResizeObserver(function () { el._resize(); });',
  '    el._ro.observe(el);',
  '    el._resize();',
  '    if (el._cfg.src) el._load(el._cfg.src);',
  '    else el._note("Add a src attribute with an image or video URL.");',
  '  };',
  '',
  '  DifusionParticles.prototype.disconnectedCallback = function () { this.destroy(); };',
  '',
  '  DifusionParticles.prototype.attributeChangedCallback = function (name, oldV, newV) {',
  '    if (oldV === newV || !this._boot) return;',
  '    this._readCfg();',
  '    if (!this._gl) return;',
  '    if (name === "src") { if (newV) this._load(newV); return; }',
  '    if (name === "particle-count" || name === "shape" || name === "color-mode" || name === "palette" || name === "tint") {',
  '      if (this._source) this._sample();',
  '    }',
  '  };',
  '',
  '  DifusionParticles.prototype._emit = function (name, detail) {',
  '    this.dispatchEvent(new CustomEvent(name, { detail: detail || {}, bubbles: true }));',
  '  };',
  '',
  '  DifusionParticles.prototype._note = function (msg) {',
  '    var d = this.shadowRoot.querySelector(".df-msg");',
  '    if (!d) { d = document.createElement("div"); d.className = "df-msg"; this.shadowRoot.appendChild(d); }',
  '    d.textContent = msg;',
  '  };',
  '',
  '  DifusionParticles.prototype._readCfg = function () {',
  '    var g = this.getAttribute.bind(this);',
  '    var num = function (v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; };',
  '    var bool = function (v, d) { return v == null ? d : !(v === "false" || v === "0" || v === "no"); };',
  '    var q = g("quality") || "balanced";',
  '    var qCap = q === "low" ? 9000 : q === "high" ? 60000 : 22000;',
  '    var qDpr = q === "low" ? 1 : q === "high" ? 2 : 1.5;',
  '    var reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;',
  '    this._cfg = {',
  '      src: g("src") || "",',
  '      count: Math.min(num(g("particle-count"), 12000), qCap),',
  '      size: num(g("particle-size"), 1.6),',
  '      colorMode: g("color-mode") || "original",',
  '      background: g("background") || "#000000",',
  '      depth: num(g("depth"), 0.5),',
  '      interactive: bool(g("interactive"), true),',
  '      radius: num(g("interaction-radius"), 120),',
  '      repulsion: num(g("repulsion"), 0.7),',
  '      attraction: num(g("attraction"), 0.3),',
  '      motion: bool(g("motion"), true) && !reduced,',
  '      speed: num(g("speed"), 0.8),',
  '      trails: bool(g("trails"), false),',
  '      autoplay: bool(g("autoplay"), true),',
  '      loop: bool(g("loop"), true),',
  '      quality: q, dprCap: qDpr,',
  '      shape: g("shape") || "soft",',
  '      glow: num(g("glow"), 0.4),',
  '      opacity: num(g("opacity"), 0.95),',
  '      palette: (g("palette") || "").split(",").filter(Boolean),',
  '      tint: g("tint") || "#c9f158",',
  '      muted: bool(g("muted"), true),',
  '      isVideo: bool(g("video"), false),',
  '      aspect: num(g("aspect"), 0)',
  '    };',
  '  };',
  '',
  '  DifusionParticles.prototype._initGL = function () {',
  '    var gl = this._gl;',
  '    this._prog = program(gl, VERT, FRAG);',
  '    this._fprog = program(gl, FVERT, FFRAG);',
  '    this._tex = dotTexture(gl);',
  '    var tri = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tri);',
  '    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);',
  '    this._tri = tri;',
  '    gl.disable(gl.DEPTH_TEST);',
  '  };',
  '',
  '  DifusionParticles.prototype._resize = function () {',
  '    var cv = this._cv, dpr = Math.min(window.devicePixelRatio || 1, this._cfg ? this._cfg.dprCap : 1.5);',
  '    var w = Math.max(2, Math.floor(cv.clientWidth * dpr));',
  '    var h = Math.max(2, Math.floor(cv.clientHeight * dpr));',
  '    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }',
  '  };',
  '',
  '  DifusionParticles.prototype._load = function (src) {',
  '    var el = this, cfg = el._cfg;',
  '    var looksVideo = cfg.isVideo || src.indexOf("data:video") === 0 || /\\.(mp4|webm|mov|m4v|ogv)(\\?|#|$)/i.test(src);',
  '    if (this._video) { try { this._video.pause(); } catch (e) {} this._video = null; }',
  '    this._image = null;',
  '    if (looksVideo) {',
  '      var v = document.createElement("video");',
  '      v.playsInline = true; v.crossOrigin = "anonymous"; v.loop = cfg.loop;',
  '      v.muted = cfg.muted; v.preload = "auto";',
  '      v.addEventListener("loadeddata", function () {',
  '        el._video = v; el._source = v; el._kind = "video"; el._sample();',
  '        if (cfg.autoplay || cfg.motion) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }',
  '        el._emit("difusion-ready", { particles: el._n, video: true });',
  '      });',
  '      v.addEventListener("error", function () {',
  '        el._note("Could not load video: " + src);',
  '        el._emit("difusion-error", { message: "video-load", src: src });',
  '      });',
  '      v.src = src;',
  '    } else {',
  '      var img = new Image();',
  '      img.crossOrigin = "anonymous";',
  '      img.onload = function () {',
  '        el._image = img; el._source = img; el._kind = "image"; el._sample();',
  '        el._emit("difusion-ready", { particles: el._n });',
  '      };',
  '      img.onerror = function () {',
  '        el._note("Could not load image: " + src);',
  '        el._emit("difusion-error", { message: "image-load", src: src });',
  '      };',
  '      img.src = src;',
  '    }',
  '  };',
  '',
  '  DifusionParticles.prototype._sample = function () {',
  '    var el = this, gl = el._gl, cfg = el._cfg, src = el._source;',
  '    if (!src) return;',
  '    var sw = el._kind === "video" ? src.videoWidth : (src.naturalWidth || src.width);',
  '    var sh = el._kind === "video" ? src.videoHeight : (src.naturalHeight || src.height);',
  '    if (!sw || !sh) return;',
  '    var maxDim = el._kind === "video" ? 420 : 800;',
  '    var sc = Math.min(1, maxDim / Math.max(sw, sh));',
  '    var w = Math.max(2, Math.round(sw * sc)), h = Math.max(2, Math.round(sh * sc));',
  '    var cv = document.createElement("canvas"); cv.width = w; cv.height = h;',
  '    var cx = cv.getContext("2d", { willReadFrequently: true });',
  '    cx.drawImage(src, 0, 0, w, h);',
  '    var data;',
  '    try { data = cx.getImageData(0, 0, w, h).data; }',
  '    catch (e) { el._note("Media is blocked by CORS — host it with Access-Control-Allow-Origin."); el._emit("difusion-error", { message: "cors" }); return; }',
  '    if (el._kind === "video") { el._vcv = cv; el._vcx = cx; el._rw = w; el._rh = h; }',
  '    var r = el._cv.getBoundingClientRect();',
  '    var aspect = Math.max(0.2, r.width / Math.max(1, r.height));',
  '    var imgAspect; if (cfg.aspect > 0) imgAspect = cfg.aspect; else imgAspect = sw / sh;',
  '    var fit = Math.min(0.88, aspect * 0.88 / imgAspect);',
  '    var halfH = fit, halfW = fit * imgAspect;',
  '    var cell = Math.max(1.8, Math.sqrt((w * h) / cfg.count));',
  '    var pts = [];',
  '    var seed = 1;',
  '    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }',
  '    var tint = hex(cfg.tint, [0.8, 0.9, 0.4]);',
  '    var pal = cfg.palette.map(function (p) { return hex(p, [1, 1, 1]); });',
  '    for (var gy = 0; gy < h; gy += cell) {',
  '      for (var gx = 0; gx < w; gx += cell) {',
  '        var px = Math.min(w - 1, Math.round(gx + cell * (0.2 + rnd() * 0.6)));',
  '        var py = Math.min(h - 1, Math.round(gy + cell * (0.2 + rnd() * 0.6)));',
  '        var pi = (py * w + px) * 4;',
  '        if (data[pi + 3] < 16) continue;',
  '        var rr = data[pi] / 255, gg = data[pi + 1] / 255, bb = data[pi + 2] / 255;',
  '        var lum = rr * 0.299 + gg * 0.587 + bb * 0.114;',
  '        var mode = cfg.colorMode, R = rr, G = gg, B = bb;',
  '        if (mode === "mono" || mode === "monochrome") {',
  '          var kk = 0.2 + lum; R = tint[0] * kk; G = tint[1] * kk; B = tint[2] * kk;',
  '        } else if (mode === "gradient" && pal.length >= 2) {',
  '          var t = Math.min(1, Math.max(0, lum * 1.15));',
  '          R = pal[0][0] + (pal[1][0] - pal[0][0]) * t;',
  '          G = pal[0][1] + (pal[1][1] - pal[0][1]) * t;',
  '          B = pal[0][2] + (pal[1][2] - pal[0][2]) * t;',
  '        } else if (mode === "custom" && pal.length) {',
  '          var piid = Math.min(pal.length - 1, Math.floor(lum * pal.length * 0.999));',
  '          var pc = pal[piid], kk2 = 0.35 + lum * 0.85;',
  '          R = pc[0] * kk2; G = pc[1] * kk2; B = pc[2] * kk2;',
  '        }',
  '        pts.push({',
  '          hx: (px / (w - 1) * 2 - 1) * halfW,',
  '          hy: (1 - py / (h - 1) * 2) * halfH,',
  '          hz: (lum - 0.5) * 1.1,',
  '          r: R, g: G, b: B,',
  '          pix: pi / 4,',
  '          seed: rnd() * 6.283, sz: 0.6 + rnd()',
  '        });',
  '        if (pts.length >= cfg.count) break;',
  '      }',
  '      if (pts.length >= cfg.count) break;',
  '    }',
  '    var n = el._n = pts.length;',
  '    if (!n) { el._note("No opaque pixels found in source."); return; }',
  '    el._home = new Float32Array(n * 3); el._pos = new Float32Array(n * 3);',
  '    el._vel = new Float32Array(n * 3); el._col = new Float32Array(n * 3);',
  '    el._tgt = new Float32Array(n * 3); el._pix = new Int32Array(n);',
  '    el._seed = new Float32Array(n); el._sz = new Float32Array(n);',
  '    for (var i = 0; i < n; i++) {',
  '      var p = pts[i];',
  '      el._home[i*3] = p.hx; el._home[i*3+1] = p.hy; el._home[i*3+2] = p.hz;',
  '      var a = p.seed * 7.1, rad = 1.5 + (p.seed % 1) * 2.5;',
  '      el._pos[i*3] = Math.cos(a) * rad; el._pos[i*3+1] = Math.sin(a) * rad;',
  '      el._pos[i*3+2] = (p.seed % 1) * 2 - 1;',
  '      el._col[i*3] = p.r; el._col[i*3+1] = p.g; el._col[i*3+2] = p.b;',
  '      el._tgt[i*3] = p.r; el._tgt[i*3+1] = p.g; el._tgt[i*3+2] = p.b;',
  '      el._pix[i] = p.pix; el._seed[i] = p.seed; el._sz[i] = p.sz;',
  '    }',
'    el._alloc(n);',
   '    el._t = 0;',
   '    el._ready = true;',
   '    if (cfg.autoplay) el._start(); else el._frame(performance.now(), true);',
  '  };',
  '',
  '  DifusionParticles.prototype._alloc = function (n) {',
  '    var gl = this._gl;',
  '    if (this._bufCap >= n) return;',
  '    var cap = Math.pow(2, Math.ceil(Math.log2(Math.max(1024, n))));',
  '    this._bufCap = cap;',
  '    this._posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this._posBuf);',
  '    gl.bufferData(gl.ARRAY_BUFFER, cap * 12, gl.DYNAMIC_DRAW);',
  '    this._colBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this._colBuf);',
  '    gl.bufferData(gl.ARRAY_BUFFER, cap * 12, gl.DYNAMIC_DRAW);',
  '    this._szBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this._szBuf);',
  '    gl.bufferData(gl.ARRAY_BUFFER, cap * 4, gl.DYNAMIC_DRAW);',
  '  };',
  '',
  '  DifusionParticles.prototype._start = function () {',
  '    var el = this;',
  '    if (el._running) return; el._running = true;',
  '    el._last = performance.now();',
  '    var loopFn = function (now) {',
  '      if (!el._running) return;',
  '      el._raf = requestAnimationFrame(loopFn);',
  '      el._frame(now, false);',
  '    };',
  '    el._raf = requestAnimationFrame(loopFn);',
  '    el._emit("difusion-play");',
  '  };',
  '  DifusionParticles.prototype._stop = function () {',
  '    if (!this._running) return;',
  '    this._running = false; cancelAnimationFrame(this._raf);',
  '    this._emit("difusion-pause");',
  '  };',
  '',
  '  /* public API */',
  '  DifusionParticles.prototype.play = function () {',
  '    if (this._video) { var pr = this._video.play(); if (pr && pr.catch) pr.catch(function () {}); }',
  '    this._start();',
  '  };',
  '  DifusionParticles.prototype.pause = function () {',
  '    if (this._video) this._video.pause();',
  '    this._stop();',
  '  };',
  '  DifusionParticles.prototype.destroy = function () {',
  '    this._stop();',
  '    if (this._ro) { this._ro.disconnect(); this._ro = null; }',
  '    document.removeEventListener("visibilitychange", this._onVis);',
  '    if (this._cv) {',
  '      this._cv.removeEventListener("pointermove", this._onMove);',
  '      this._cv.removeEventListener("pointerdown", this._onMove);',
  '      this._cv.removeEventListener("touchmove", this._onMove);',
  '      this._cv.removeEventListener("pointerleave", this._onLeave);',
  '    }',
  '    if (this._video) { try { this._video.pause(); this._video.removeAttribute("src"); } catch (e) {} }',
  '    if (this._gl) { this._gl = null; }',
  '    this._boot = false; this._ready = false;',
  '  };',
  '',
  '  DifusionParticles.prototype._frame = function (now, single) {',
  '    var el = this, cfg = el._cfg, gl = el._gl;',
  '    if (!gl || !el._n) return;',
  '    var dt = Math.min(0.05, Math.max(0.001, (now - el._last) / 1000));',
  '    el._last = now;',
  '    if (cfg.motion) el._t += dt * cfg.speed;',
  '    var t = el._t, n = el._n;',
  '',
  '    if (el._kind === "video" && el._video && el._video.readyState >= 2 && !el._video.paused) {',
  '      el._vcx.drawImage(el._video, 0, 0, el._rw, el._rh);',
  '      try {',
  '        var data = el._vcx.getImageData(0, 0, el._rw, el._rh).data;',
  '        var orig = cfg.colorMode === "original";',
  '        var tcnt = hex(cfg.tint, [0.8, 0.9, 0.4]);',
  '        for (var vi = 0; vi < n; vi++) {',
  '          var o = el._pix[vi] * 4;',
  '          if (orig) { el._tgt[vi*3] = data[o]/255; el._tgt[vi*3+1] = data[o+1]/255; el._tgt[vi*3+2] = data[o+2]/255; }',
  '          else {',
  '            var lum = (data[o]*0.299 + data[o+1]*0.587 + data[o+2]*0.114)/255;',
  '            var k = 0.2 + lum;',
  '            el._tgt[vi*3] = tcnt[0]*k; el._tgt[vi*3+1] = tcnt[1]*k; el._tgt[vi*3+2] = tcnt[2]*k;',
  '          }',
  '        }',
  '      } catch (e) {}',
  '    }',
  '',
  '    var spring = 1.2 + cfg.attraction * 7;',
  '    var damp = Math.exp(-dt * 4.2);',
  '    var rep = cfg.repulsion * 26;',
  '    var r = el._cv.getBoundingClientRect();',
  '    var aspect = Math.max(0.2, r.width / Math.max(1, r.height));',
  '    var Rw = cfg.radius * 2 / Math.max(1, r.height);',
  '    var R2 = Rw * Rw;',
  '    var px = el._ptr.x * aspect, py = el._ptr.y;',
  '    var ptrOn = cfg.interactive && el._ptr.on;',
  '    var wob = cfg.motion ? 0.35 : 0;',
  '    var depthK = cfg.depth;',
  '    var pos = el._pos, vel = el._vel, home = el._home, col = el._col, tgt = el._tgt;',
  '    var cl = Math.min(1, dt * 6);',
  '',
  '    for (var i = 0; i < n; i++) {',
  '      var ix = i * 3;',
  '      var x = pos[ix], y = pos[ix+1], z = pos[ix+2];',
  '      var vx = vel[ix], vy = vel[ix+1];',
  '      vx += (home[ix] - x) * spring * dt;',
  '      vy += (home[ix+1] - y) * spring * dt;',
  '      if (wob > 0) {',
  '        var sd = el._seed[i];',
  '        vx += Math.sin(y * 2.3 + t * 1.2 + sd) * wob * dt;',
  '        vy += Math.cos(x * 2.7 - t * 0.9 + sd * 2.0) * wob * dt;',
  '      }',
  '      if (ptrOn && rep > 0) {',
  '        var dx = x - px, dy = y - py;',
  '        var d2 = dx * dx + dy * dy;',
  '        if (d2 < R2 && d2 > 1e-8) {',
  '          var d = Math.sqrt(d2), f = (1 - d / Rw); f *= f;',
  '          vx += dx / d * rep * f * dt;',
  '          vy += dy / d * rep * f * dt;',
  '        }',
  '      }',
  '      vx *= damp; vy *= damp;',
  '      x += vx * dt; y += vy * dt;',
  '      z += ((home[ix+2] * depthK) - z) * Math.min(1, dt * 5);',
  '      pos[ix] = x; pos[ix+1] = y; pos[ix+2] = z;',
  '      vel[ix] = vx; vel[ix+1] = vy;',
  '      col[ix] += (tgt[ix] - col[ix]) * cl;',
  '      col[ix+1] += (tgt[ix+1] - col[ix+1]) * cl;',
  '      col[ix+2] += (tgt[ix+2] - col[ix+2]) * cl;',
  '    }',
  '',
  '    el._resize();',
  '    var cv = el._cv;',
  '    gl.viewport(0, 0, cv.width, cv.height);',
  '    var bg = hex(cfg.background, [0, 0, 0]);',
  '    var transparentBG = cfg.background === "transparent";',
  '    if (transparentBG || !cfg.trails) {',
  '      gl.clearColor(transparentBG ? 0 : bg[0], transparentBG ? 0 : bg[1], transparentBG ? 0 : bg[2], transparentBG ? 0 : 1);',
  '      gl.clear(gl.COLOR_BUFFER_BIT);',
  '    } else {',
  '      gl.useProgram(el._fprog);',
  '      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);',
  '      var fl = gl.getUniformLocation(el._fprog, "uFade");',
  '      gl.uniform4f(fl, bg[0], bg[1], bg[2], 0.14);',
  '      var aXY = gl.getAttribLocation(el._fprog, "aXY");',
  '      gl.bindBuffer(gl.ARRAY_BUFFER, el._tri);',
  '      gl.enableVertexAttribArray(aXY);',
  '      gl.vertexAttribPointer(aXY, 2, gl.FLOAT, false, 0, 0);',
  '      gl.drawArrays(gl.TRIANGLES, 0, 3);',
  '      gl.disableVertexAttribArray(aXY);',
  '    }',
  '    gl.useProgram(el._prog);',
  '    gl.enable(gl.BLEND);',
  '    gl.blendFunc(gl.SRC_ALPHA, cfg.glow > 0.02 ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);',
  '    gl.bindBuffer(gl.ARRAY_BUFFER, el._posBuf);',
  '    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos.subarray(0, n * 3));',
  '    var aPos = gl.getAttribLocation(el._prog, "aPos");',
  '    gl.enableVertexAttribArray(aPos);',
  '    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);',
  '    gl.bindBuffer(gl.ARRAY_BUFFER, el._colBuf);',
  '    gl.bufferSubData(gl.ARRAY_BUFFER, 0, col.subarray(0, n * 3));',
  '    var aCol = gl.getAttribLocation(el._prog, "aCol");',
  '    gl.enableVertexAttribArray(aCol);',
  '    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 0, 0);',
  '    gl.bindBuffer(gl.ARRAY_BUFFER, el._szBuf);',
  '    gl.bufferSubData(gl.ARRAY_BUFFER, 0, el._sz.subarray(0, n));',
  '    var aSize = gl.getAttribLocation(el._prog, "aSize");',
  '    gl.enableVertexAttribArray(aSize);',
  '    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);',
  '    gl.uniform1f(gl.getUniformLocation(el._prog, "uAspect"), aspect);',
  '    gl.uniform1f(gl.getUniformLocation(el._prog, "uZoom"), 1);',
  '    var par = cfg.interactive && el._ptr.on ? 0.18 : 0;',
  '    gl.uniform2f(gl.getUniformLocation(el._prog, "uPar"), el._ptr.x * par, el._ptr.y * par);',
  '    gl.uniform1f(gl.getUniformLocation(el._prog, "uPointScale"), cfg.size * cv.height * 0.0034);',
  '    gl.uniform1f(gl.getUniformLocation(el._prog, "uOpacity"), cfg.opacity);',
  '    gl.uniform1f(gl.getUniformLocation(el._prog, "uGlow"), cfg.glow);',
  '    gl.uniform1f(gl.getUniformLocation(el._prog, "uShape"), cfg.shape === "circle" ? 0 : cfg.shape === "square" ? 2 : 1);',
  '    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, el._tex);',
  '    gl.uniform1i(gl.getUniformLocation(el._prog, "uTex"), 0);',
  '    gl.drawArrays(gl.POINTS, 0, n);',
  '    if (single) { /* one static frame */ }',
  '  };',
  '',
  '  customElements.define(TAG, DifusionParticles);',
  '})();',
  '',
].join('\n');

/* ---------------------------------------------------------------- */
/*  attribute derivation                                             */
/* ---------------------------------------------------------------- */

export function paramsToAttrs(P: EngineParams, V: VideoParams | null, src: string): Record<string, string> {
  const a: Record<string, string> = { src };
  a['particle-count'] = String(Math.round(P.count));
  a['particle-size'] = P.size.toFixed(2);
  a['color-mode'] = P.colorMode === 'palette' ? 'custom' : P.colorMode === 'mono' ? 'monochrome' : P.colorMode;
  if (P.colorMode === 'mono') a['tint'] = P.monoColor;
  if (P.colorMode === 'gradient') a['palette'] = [P.gradientA, P.gradientB].join(',');
  if (P.colorMode === 'palette') a['palette'] = P.palette.filter(Boolean).join(',');
  a['background'] = P.transparent ? 'transparent' : P.background;
  a['depth'] = P.depth.toFixed(2);
  a['interactive'] = 'true';
  a['interaction-radius'] = String(Math.round(P.pointerRadius));
  a['repulsion'] = P.repulsion.toFixed(2);
  a['attraction'] = P.returnForce.toFixed(2);
  a['motion'] = P.playing ? 'true' : 'false';
  a['speed'] = P.speed.toFixed(2);
  a['trails'] = P.trails > 0.02 ? 'true' : 'false';
  a['glow'] = P.glow.toFixed(2);
  a['opacity'] = P.opacity.toFixed(2);
  a['shape'] = P.shape === 'sprite' ? 'soft' : P.shape;
  a['quality'] = P.quality === 'ultra' ? 'high' : P.quality;
  if (V) {
    a['autoplay'] = 'true';
    a['loop'] = V.loop ? 'true' : 'false';
    a['muted'] = V.muted ? 'true' : 'false';
    a['video'] = 'true';
  }
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

export function buildComponentUsage(attrs: Record<string, string>): string {
  return (
    '<!-- Register the runtime once, then reuse the element anywhere. -->\n' +
    '<script src="./difusion-particles.js" defer></scr' + 'ipt>\n\n' +
    '<difusion-particles\n' + attrsToString(attrs, '  ') + '\n></difusion-particles>\n\n' +
    '<!-- Optional: drive it from your own code -->\n' +
    '<script>\n' +
    "  const fx = document.querySelector('difusion-particles');\n" +
    "  fx.addEventListener('difusion-ready',  (e) => console.log('ready', e.detail));\n" +
    "  fx.addEventListener('difusion-error',  (e) => console.warn(e.detail));\n" +
    "  fx.addEventListener('difusion-pause',  ()  => console.log('paused'));\n\n" +
    '  // fx.pause();  fx.play();  fx.destroy();  fx.remove();\n' +
    '  // fx.setAttribute(\'repulsion\', \'1.2\');  // live-updates supported attributes\n' +
    '</scr' + 'ipt>'
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
  V: VideoParams | null,
  assetName: string,
): string {
  return JSON.stringify(
    {
      $schema: 'https://difusion.studio/schema/v1.json',
      generator: 'DIFUSION 1.0',
      asset: assetName,
      component: {
        tag: 'difusion-particles',
        attributes: attrs,
        events: ['difusion-ready', 'difusion-error', 'difusion-play', 'difusion-pause'],
        methods: ['play()', 'pause()', 'destroy()', 'setAttribute(name, value)'],
        notes: [
          'All listed attributes live-update when changed, src/count/color changes re-sample the media.',
          'The component respects prefers-reduced-motion unless motion is explicitly enabled.',
          'pause()/destroy() fully release WebGL resources and listeners.',
        ],
      },
      editor: { particles: P, video: V },
    },
    null,
    2,
  );
}

/* attribute documentation for the Settings tab */
export const ATTR_DOCS: Array<[string, string, string]> = [
  ['src', 'Image or video URL (CORS-accessible). Required.', '—'],
  ['particle-count', 'Maximum number of particles', '12000'],
  ['particle-size', 'Base particle size px', '1.6'],
  ['color-mode', 'original · monochrome · gradient · custom', 'original'],
  ['palette', 'Comma list of colors for gradient/custom', '—'],
  ['tint', 'Color used by monochrome mode', '#c9f158'],
  ['background', 'CSS color or "transparent"', '#000000'],
  ['depth', 'Z-displacement / parallax strength 0..1', '0.5'],
  ['interactive', 'Enable pointer interaction', 'true'],
  ['interaction-radius', 'Pointer influence radius px', '120'],
  ['repulsion', 'Pointer push strength', '0.7'],
  ['attraction', 'Spring return strength (shape restore)', '0.3'],
  ['motion', 'Ambient animation on/off', 'true'],
  ['speed', 'Animation speed multiplier', '0.8'],
  ['trails', 'Motion-trail persistence', 'false'],
  ['glow', 'Additive luminous rendering 0..1', '0.4'],
  ['opacity', 'Particle alpha 0..1', '0.95'],
  ['shape', 'circle · square · soft', 'soft'],
  ['quality', 'low · balanced · high (caps DPR + count)', 'balanced'],
  ['autoplay', 'Start animation/video automatically', 'true'],
  ['loop', 'Loop video sources', 'true'],
  ['muted', 'Start video muted', 'true'],
  ['aspect', 'Force source aspect ratio override', '0 (auto)'],
];
