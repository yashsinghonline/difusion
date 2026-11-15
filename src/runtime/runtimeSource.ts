/*
 * Source shipped by the code generator. It intentionally has no imports:
 * the downloaded custom element must run without the DIFUSION editor.
 */
export const RUNTIME_JS = String.raw`/*! DIFUSION particles runtime v2.0 - self-contained, no dependencies. */
(function () {
  'use strict';
  var TAG = 'difusion-particles';
  if (customElements.get(TAG)) return;

  var POINT_VERT = [
    'attribute vec3 aPos;attribute vec3 aCol;attribute float aSize;',
    'uniform float uAspect,uZoom,uRot,uPersp,uPointScale,uPulse;',
    'uniform vec2 uPan,uParallax;',
    'varying vec3 vCol;varying float vFade;',
    'vec3 project(vec3 p){p.xy+=uParallax*p.z;float c=cos(uRot),s=sin(uRot);',
    'p.xy=mat2(c,-s,s,c)*p.xy;p.xy=p.xy*uZoom+uPan;',
    'float z=1.0/max(0.25,1.0+p.z*uPersp);p.xy*=z;vFade=clamp(z*z,0.35,1.35);',
    'return vec3(p.x/uAspect,p.y,z);}',
    'void main(){vec3 q=project(aPos);gl_Position=vec4(q.xy,0.0,1.0);',
    'gl_PointSize=clamp(aSize*uPointScale*q.z*(1.0+uPulse),1.0,110.0);vCol=aCol;}'
  ].join('\n');
  var POINT_FRAG = [
    'precision mediump float;varying vec3 vCol;varying float vFade;',
    'uniform float uShape,uOpacity,uGlow,uUseTex;uniform sampler2D uTex;',
    'void main(){vec2 uv=gl_PointCoord-0.5;float a=1.0;vec3 rgb=vCol;',
    'if(uUseTex>0.5){vec4 t=texture2D(uTex,gl_PointCoord);a=t.a;rgb*=t.rgb*1.6;if(a<=0.002)discard;}',
    'else if(uShape<0.5){float d=length(uv);a=1.0-smoothstep(0.40,0.5,d);if(a<=0.001)discard;}',
    'else if(uShape<1.5){float d=length(uv)*2.0;a=exp(-d*d*2.6);if(a<=0.004)discard;}',
    'gl_FragColor=vec4(rgb*mix(1.0,1.55,uGlow),a*uOpacity*vFade);}'
  ].join('\n');
  var LINE_VERT = [
    'attribute vec3 aPos;attribute vec3 aCol;attribute float aT;',
    'uniform float uAspect,uZoom,uRot,uPersp;uniform vec2 uPan,uParallax;',
    'varying vec3 vCol;varying float vFade;varying float vA;',
    'void main(){vec3 p=aPos;p.xy+=uParallax*p.z;float c=cos(uRot),s=sin(uRot);',
    'p.xy=mat2(c,-s,s,c)*p.xy;p.xy=p.xy*uZoom+uPan;',
    'float z=1.0/max(0.25,1.0+p.z*uPersp);p.xy*=z;vFade=clamp(z*z,0.35,1.35);',
    'gl_Position=vec4(p.x/uAspect,p.y,0.0,1.0);vCol=aCol;vA=aT;}'
  ].join('\n');
  var LINE_FRAG = [
    'precision mediump float;varying vec3 vCol;varying float vFade;varying float vA;',
    'uniform float uOpacity,uGlow;',
    'void main(){gl_FragColor=vec4(vCol*mix(1.0,1.5,uGlow),vA*vA*uOpacity*0.85*vFade);}'
  ].join('\n');
  var FADE_VERT = 'attribute vec2 aXY;void main(){gl_Position=vec4(aXY,0.0,1.0);}';
  var FADE_FRAG = 'precision mediump float;uniform vec4 uFade;void main(){gl_FragColor=uFade;}';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function hardwareCap() {
    var mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return 16000;
    if (mem >= 8 && cores >= 8) return 64000;
    if (mem >= 4) return 40000;
    return 22000;
  }
  function hex(c, d) {
    var h = String(c || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join('');
    var n = parseInt(h || '000000', 16);
    return isNaN(n) ? d : [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function tune(r, g, b, p) {
    var ex = Math.pow(2, p.exposure);
    r = (r * ex + p.brightness - 0.5) * p.contrast + 0.5;
    g = (g * ex + p.brightness - 0.5) * p.contrast + 0.5;
    b = (b * ex + p.brightness - 0.5) * p.contrast + 0.5;
    r += p.temperature * 0.12; g += p.temperature * 0.018; b -= p.temperature * 0.12;
    var l = r * 0.299 + g * 0.587 + b * 0.114;
    r = l + (r - l) * p.saturation; g = l + (g - l) * p.saturation; b = l + (b - l) * p.saturation;
    if (Math.abs(p.hue) > 0.0001) {
      var c = Math.cos(p.hue), s = Math.sin(p.hue);
      var nr = (0.213 + 0.787*c - 0.213*s)*r + (0.715 - 0.715*c - 0.715*s)*g + (0.072 - 0.072*c + 0.928*s)*b;
      var ng = (0.213 - 0.213*c + 0.143*s)*r + (0.715 + 0.285*c + 0.140*s)*g + (0.072 - 0.072*c - 0.283*s)*b;
      var nb = (0.213 - 0.213*c - 0.787*s)*r + (0.715 - 0.715*c + 0.715*s)*g + (0.072 + 0.928*c + 0.072*s)*b;
      r = nr; g = ng; b = nb;
    }
    return [clamp(r,0,1), clamp(g,0,1), clamp(b,0,1)];
  }
  function compile(gl, type, source) {
    var sh = gl.createShader(type); gl.shaderSource(sh, source); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
    return sh;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    return p;
  }
  function buffer(gl, bytes, usage) {
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, bytes, usage); return b;
  }

  class DifusionParticles extends HTMLElement {
    static get observedAttributes() {
      return [
        'src','particle-count','density','particle-size','size-variance','shape','sprite-src','color-mode','mono-color',
        'gradient-a','gradient-b','palette','exposure','brightness','contrast','saturation','hue','temperature',
        'background','transparent','opacity','glow','trails','line-mode','quality','depth','parallax','perspective',
        'zoom','pan-x','pan-y','rotation','drift','spread','turbulence','flow','flow-angle','swirl','return-force',
        'interactive','interaction-radius','repulsion','attraction','motion','speed','amplitude','autoplay'
      ];
    }
    constructor() {
      super();
      this._booted = false; this._running = false; this._ready = false; this._n = 0;
      this._ptr = { x:0, y:0, active:false, down:false };
      this._impulses = []; this._intro = 0; this._t = 0; this._last = 0;
    }
    connectedCallback() {
      if (this._booted) { if (this._p.autoplay && !this._running) this.play(); return; }
      this._booted = true; this._read();
      var root = this.shadowRoot || this.attachShadow({mode:'open'}); root.innerHTML = '';
      var style = document.createElement('style');
      style.textContent = ':host{display:block;position:relative;overflow:hidden;contain:content;background:var(--df-bg,#050506)}canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}.msg{position:absolute;inset:0;display:grid;place-items:center;padding:18px;text-align:center;color:#8f949c;font:11px/1.5 ui-monospace,monospace}';
      this._cv = document.createElement('canvas'); root.append(style, this._cv);
      try { this._initGL(); } catch (e) { this._message('WebGL is unavailable.'); this._emit('difusion-error',{message:String(e)}); return; }
      this._bind(); this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this);
      this._io = new IntersectionObserver((es) => { this._visible = !!(es[0] && es[0].isIntersecting); }); this._io.observe(this);
      this._visible = true; this._resize();
      if (this._p.src) this._load(this._p.src); else this._message('Add a src attribute with a CORS-accessible image URL.');
    }
    disconnectedCallback() { this.pause(); }
    attributeChangedCallback(name, oldV, newV) {
      if (!this._booted || oldV === newV) return;
      var old = this._p; this._read();
      if (name === 'src') { if (newV) this._load(newV); return; }
      if (name === 'sprite-src') { this._loadSprite(newV || ''); return; }
      if (!this._ready) return;
      if (['particle-count','density','quality'].indexOf(name) >= 0) this._sample();
      else if (['color-mode','mono-color','gradient-a','gradient-b','palette','exposure','brightness','contrast','saturation','hue','temperature'].indexOf(name) >= 0) this._recolor();
      else if (name === 'size-variance') this._uploadSize();
      if (name === 'autoplay' && old && old.autoplay !== this._p.autoplay) this._p.autoplay ? this.play() : this.pause();
    }
    _read() {
      var g = (n) => this.getAttribute(n);
      var num = (n,d) => { var v = parseFloat(g(n)); return isNaN(v) ? d : v; };
      var bool = (n,d) => { var v=g(n); return v==null?d:!(v==='false'||v==='0'||v==='no'); };
      var q = g('quality') || 'high';
      var reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._p = {
        src:g('src')||'', count:num('particle-count',18000), density:num('density',0.62), size:num('particle-size',2.1),
        sizeVariance:num('size-variance',0.62), shape:g('shape')||'soft', spriteSrc:g('sprite-src')||'', colorMode:g('color-mode')||'original',
        mono:g('mono-color')||g('tint')||'#c9f158', gradientA:g('gradient-a')||'#c9f158', gradientB:g('gradient-b')||'#7a5cff',
        palette:(g('palette')||'#c9f158,#ff5c38,#7a5cff,#f5f5f5').split(',').filter(Boolean),
        exposure:num('exposure',0), brightness:num('brightness',0), contrast:num('contrast',1), saturation:num('saturation',1),
        hue:num('hue',0), temperature:num('temperature',0), background:g('background')||'#050506',
        transparent:bool('transparent',g('background')==='transparent'), opacity:num('opacity',0.95), glow:num('glow',0.45),
        trails:num('trails',0.22), lineMode:g('line-mode')||'points', quality:q, depth:num('depth',0.55),
        parallax:num('parallax',0.7), perspective:num('perspective',0.5), zoom:num('zoom',1), panX:num('pan-x',0), panY:num('pan-y',0),
        rotation:num('rotation',0), drift:num('drift',0.22), spread:num('spread',0.12), turbulence:num('turbulence',0.32),
        flow:num('flow',0.22), flowAngle:num('flow-angle',0.6), swirl:num('swirl',0.18), returnForce:num('return-force',0.48),
        interactive:bool('interactive',true), radius:num('interaction-radius',150), repulsion:num('repulsion',0.9), attraction:num('attraction',0.2),
        motion:bool('motion',true)&&!reduced, speed:num('speed',0.8), amplitude:num('amplitude',0.85), autoplay:bool('autoplay',true),
        dprCap:q==='low'?1:q==='balanced'?1.5:q==='ultra'?2.25:2, countMul:q==='low'?0.4:q==='balanced'?0.7:q==='ultra'?1.25:1
      };
      this.style.setProperty('--df-bg',this._p.transparent?'transparent':this._p.background);
    }
    _initGL() {
      var gl = this._cv.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
      if (!gl) throw new Error('webgl-unavailable'); this._gl=gl;
      this._pointProg=program(gl,POINT_VERT,POINT_FRAG); this._lineProg=program(gl,LINE_VERT,LINE_FRAG); this._fadeProg=program(gl,FADE_VERT,FADE_FRAG);
      this._tri=buffer(gl,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      if (this._p.spriteSrc) this._loadSprite(this._p.spriteSrc);
    }
    _loadSprite(src) {
      if (!this._gl) return;
      if (!src) { if (this._spriteTex) this._gl.deleteTexture(this._spriteTex); this._spriteTex=null; return; }
      var img=new Image();img.crossOrigin='anonymous';img.onload=()=>{var gl=this._gl;if(this._spriteTex)gl.deleteTexture(this._spriteTex);var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this._spriteTex=t;};img.src=src;
    }
    _bind() {
      var cv=this._cv;
      this._move=(e)=>{if(!this._p.interactive)return;var r=cv.getBoundingClientRect();this._ptr.x=((e.clientX-r.left)/Math.max(1,r.width))*2-1;this._ptr.y=-(((e.clientY-r.top)/Math.max(1,r.height))*2-1);this._ptr.active=true;};
      this._down=(e)=>{this._move(e);this._ptr.down=true;};
      this._up=(e)=>{if(this._ptr.down)this.burst(e.clientX,e.clientY);this._ptr.down=false;};
      this._leave=()=>{this._ptr.active=false;this._ptr.down=false;};
      cv.addEventListener('pointermove',this._move,{passive:true});cv.addEventListener('pointerdown',this._down,{passive:true});
      cv.addEventListener('pointerup',this._up,{passive:true});cv.addEventListener('pointerleave',this._leave,{passive:true});
      this._vis=()=>{if(document.hidden)this.pause();else if(this._p.autoplay)this.play();};document.addEventListener('visibilitychange',this._vis);
    }
    _load(src) {
      var img=new Image(); img.crossOrigin='anonymous'; this._ready=false; this._message('Sampling image...');
      img.onload=()=>{this._img=img;this._clearMessage();this._sample();this._emit('difusion-ready',{particles:this._n,width:img.naturalWidth,height:img.naturalHeight});};
      img.onerror=()=>{this._message('Could not load image. Check the URL and CORS headers.');this._emit('difusion-error',{message:'image-load',src:src});};
      img.src=src;
    }
    _sample() {
      var p=this._p,img=this._img;if(!img)return;
      var sw=img.naturalWidth,sh=img.naturalHeight,maxDim=p.quality==='ultra'?1100:p.quality==='low'?640:900;
      var sc=Math.min(1,maxDim/Math.max(sw,sh)),w=Math.max(2,Math.round(sw*sc)),h=Math.max(2,Math.round(sh*sc));
      var cv=document.createElement('canvas');cv.width=w;cv.height=h;var cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,w,h);
      var data;try{data=cx.getImageData(0,0,w,h).data;}catch(e){this._message('Image blocked by CORS.');this._emit('difusion-error',{message:'cors'});return;}
      var lum=new Float32Array(w*h);for(var i=0;i<w*h;i++)lum[i]=(data[i*4]*0.299+data[i*4+1]*0.587+data[i*4+2]*0.114)/255;
      var rect=this._cv.getBoundingClientRect(),aspect=Math.max(0.2,rect.width/Math.max(1,rect.height)),imgAspect=sw/sh;
      var fit=Math.min(0.88,aspect*0.88/imgAspect),halfH=fit,halfW=fit*imgAspect,cell=Math.max(1.6,14-p.density*12),jitter=cell*0.34,cands=[],idx=0;
      for(var gy=0;gy<h;gy+=cell){for(var gx=0;gx<w;gx+=cell){idx++;var px=Math.min(w-1,Math.max(0,Math.round(gx+cell/2+(hash(idx)-0.5)*2*jitter)));var py=Math.min(h-1,Math.max(0,Math.round(gy+cell/2+(hash(idx*1.7+9)-0.5)*2*jitter)));var pi=py*w+px,a=data[pi*4+3]/255;if(a<0.06)continue;var l=lum[pi],ll=px>0?lum[pi-1]:l,lr=px<w-1?lum[pi+1]:l,edge=Math.min(1,Math.abs(lr-ll)*2.4);cands.push({weight:a*(0.26+0.62*Math.min(1,l*1.5)+edge*0.55),px:px,py:py,pi:pi,r:data[pi*4]/255,g:data[pi*4+1]/255,b:data[pi*4+2]/255,l:l});}}
      var cap=Math.min(80000,hardwareCap(),Math.floor(p.count*p.countMul));
      if(cands.length>cap)cands=cands.map(function(c,k){return{c:c,key:c.weight*(0.72+0.5*hash(k*3.3+1))};}).sort(function(a,b){return b.key-a.key;}).slice(0,cap).map(function(x){return x.c;}).sort(function(a,b){return a.pi-b.pi;});
      var n=this._n=cands.length;this._home=new Float32Array(n*3);this._pos=new Float32Array(n*3);this._vel=new Float32Array(n*3);this._raw=new Float32Array(n*3);this._col=new Float32Array(n*3);this._tgt=new Float32Array(n*3);this._spread=new Float32Array(n*3);this._seedA=new Float32Array(n);this._seedB=new Float32Array(n);this._sizeMul=new Float32Array(n);this._luma=new Float32Array(n);
      for(i=0;i<n;i++){var c=cands[i],u=c.px/(w-1),v=c.py/(h-1),th=hash(i*3.7+2)*Math.PI*2,ph=hash(i*4.9+8)*Math.PI-Math.PI/2,mag=0.25+hash(i*5.3+3)*0.75,o=i*3;this._home[o]=(u*2-1)*halfW;this._home[o+1]=(1-v*2)*halfH;this._home[o+2]=(c.l-0.5)*0.9;this._raw[o]=c.r;this._raw[o+1]=c.g;this._raw[o+2]=c.b;this._seedA[i]=hash(i*1.31+0.7)*Math.PI*2;this._seedB[i]=hash(i*2.17+4.2);this._spread[o]=Math.cos(th)*Math.cos(ph)*mag;this._spread[o+1]=Math.sin(th)*Math.cos(ph)*mag;this._spread[o+2]=Math.sin(ph)*mag*0.7;this._sizeMul[i]=0.55+hash(i*6.1+5)*1.15;this._luma[i]=c.l;}
      this._alloc(n);this._recolor();this.reform();for(i=0;i<n*3;i++)this._col[i]=this._tgt[i];this._uploadSize();this._ready=true;this._clearMessage();if(p.autoplay)this.play();else this._render(true);
    }
    _alloc(n) {
      var gl=this._gl,cap=Math.max(1024,Math.pow(2,Math.ceil(Math.log2(n))));if(this._bufCap>=cap)return;this._bufCap=cap;
      this._posBuf=buffer(gl,cap*12,gl.DYNAMIC_DRAW);this._colBuf=buffer(gl,cap*12,gl.DYNAMIC_DRAW);this._sizeBuf=buffer(gl,cap*4,gl.DYNAMIC_DRAW);
      this._linePosBuf=buffer(gl,cap*24,gl.DYNAMIC_DRAW);this._lineColBuf=buffer(gl,cap*24,gl.DYNAMIC_DRAW);this._lineTBuf=buffer(gl,cap*8,gl.STATIC_DRAW);
      var lt=new Float32Array(cap*2);for(var i=0;i<cap;i++){lt[i*2]=0;lt[i*2+1]=1;}gl.bindBuffer(gl.ARRAY_BUFFER,this._lineTBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,lt);
      this._linePos=new Float32Array(cap*6);this._lineCol=new Float32Array(cap*6);
    }
    _recolor() {
      var p=this._p,pal=p.palette.map(function(x){return hex(x,[1,1,1]);}),mono=hex(p.mono,[0.8,0.94,0.35]),ga=hex(p.gradientA,[0.8,0.94,0.35]),gb=hex(p.gradientB,[0.48,0.36,1]);
      for(var i=0;i<this._n;i++){var o=i*3,c=tune(this._raw[o],this._raw[o+1],this._raw[o+2],p),R=c[0],G=c[1],B=c[2],l=clamp(R*0.299+G*0.587+B*0.114,0,1);
        if(p.colorMode==='mono'||p.colorMode==='monochrome'){var k=0.18+l*1.05;R=mono[0]*k;G=mono[1]*k;B=mono[2]*k;}
        else if(p.colorMode==='gradient'){var t=clamp(0.12+l*0.9,0,1);R=lerp(ga[0],gb[0],t);G=lerp(ga[1],gb[1],t);B=lerp(ga[2],gb[2],t);}
        else if((p.colorMode==='palette'||p.colorMode==='custom')&&pal.length){var pc=pal[Math.min(pal.length-1,Math.floor(l*pal.length*0.999))],q=0.35+l*0.85;R=pc[0]*q;G=pc[1]*q;B=pc[2]*q;}
        this._tgt[o]=R;this._tgt[o+1]=G;this._tgt[o+2]=B;
      }
    }
    _uploadSize(){var gl=this._gl,p=this._p,m=0.25+p.sizeVariance*0.75,a=new Float32Array(this._n);for(var i=0;i<this._n;i++)a[i]=1+(this._sizeMul[i]-1)*m;gl.bindBuffer(gl.ARRAY_BUFFER,this._sizeBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,a);}
    reform(){if(!this._n)return;for(var i=0;i<this._n;i++){var o=i*3,a=this._seedA[i]*7.13,r=1.6+this._seedB[i]*2.4;this._pos[o]=Math.cos(a)*r;this._pos[o+1]=Math.sin(a)*r*0.8;this._pos[o+2]=(this._seedB[i]-0.5)*2;this._vel[o]=this._vel[o+1]=this._vel[o+2]=0;}this._intro=0;this._impulses=[];}
    burst(clientX,clientY){var r=this._cv.getBoundingClientRect(),aspect=r.width/Math.max(1,r.height),vx=((clientX-r.left)/r.width*2-1)*aspect,vy=-((clientY-r.top)/r.height*2-1),p=this._p,x=(vx-p.panX)/Math.max(0.05,p.zoom),y=(vy-p.panY)/Math.max(0.05,p.zoom),c=Math.cos(-p.rotation),s=Math.sin(-p.rotation);this._impulses.push({x:x*c-y*s,y:x*s+y*c,t:this._t});if(this._impulses.length>6)this._impulses.shift();}
    _step(dt){var p=this._p,n=this._n;if(!n)return;this._intro+=dt;var eff=p.motion?1:0;this._t+=dt*p.speed*eff;var time=this._t,amp=p.amplitude,flowX=Math.cos(p.flowAngle)*p.flow*0.55*amp*eff,flowY=Math.sin(p.flowAngle)*p.flow*0.55*amp*eff,swirl=p.swirl*0.85*amp*eff,turb=p.turbulence*2.7*amp*eff,drift=p.drift*0.34*amp*eff,spread=p.spread*0.9,intro=this._intro<2.2?1+(2.2-this._intro)*1.4:1,k=(1.4+p.returnForce*9.5)*(p.motion?1:1.6)*intro,damp=Math.exp(-dt*4.4),rect=this._cv.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height),R=p.radius*2/Math.max(1,rect.height)/Math.max(0.05,p.zoom),R2=R*R,pwx=0,pwy=0;
      if(this._ptr.active){var vx0=this._ptr.x*aspect,vy0=this._ptr.y,x0=(vx0-p.panX)/Math.max(0.05,p.zoom),y0=(vy0-p.panY)/Math.max(0.05,p.zoom),cr=Math.cos(-p.rotation),sr=Math.sin(-p.rotation);pwx=x0*cr-y0*sr;pwy=x0*sr+y0*cr;}
      for(var z=this._impulses.length-1;z>=0;z--)if(time-this._impulses[z].t>2.2)this._impulses.splice(z,1);
      for(var i=0;i<n;i++){var o=i*3,x=this._pos[o],y=this._pos[o+1],zz=this._pos[o+2],vx=this._vel[o],vy=this._vel[o+1],sa=this._seedA[i],sb=this._seedB[i],tx=this._home[o]+this._spread[o]*spread,ty=this._home[o+1]+this._spread[o+1]*spread,tz=this._home[o+2]*p.depth*1.15+this._spread[o+2]*spread*0.55;
        vx+=(tx-x)*k*dt;vy+=(ty-y)*k*dt;
        if(turb){vx+=(Math.sin(x*2.1+time*1.15+sa)+Math.sin(y*2.9-time*0.8+sb*6.28))*turb*dt;vy+=(Math.sin(y*1.7+time*1.35+sa*2)+Math.sin(x*3.3+time*0.6+sb*3))*turb*dt;}
        if(drift){vx+=Math.sin(time*0.35+sa*3)*drift*dt;vy+=Math.cos(time*0.29+sb*6)*drift*dt;}
        if(flowX||flowY||swirl){var d0=Math.sqrt(x*x+y*y)+0.15,cl=Math.min(1,d0);vx+=(flowX-y/d0*swirl*cl)*dt;vy+=(flowY+x/d0*swirl*cl)*dt;}
        if(this._ptr.active&&R2>0){var dx=x-pwx,dy=y-pwy,d2=dx*dx+dy*dy;if(d2<R2&&d2>1e-8){var d=Math.sqrt(d2),fall=1-d/R,f=fall*fall,repMul=this._ptr.down?1.9:1,attMul=this._ptr.down?2.2:1;vx+=dx/d*p.repulsion*30*repMul*f*dt;vy+=dy/d*p.repulsion*30*repMul*f*dt;vx-=dx/d*p.attraction*11*attMul*f*dt;vy-=dy/d*p.attraction*11*attMul*f*dt;}}
        for(var j=0;j<this._impulses.length;j++){var im=this._impulses[j],age=time-im.t,ix=x-im.x,iy=y-im.y,id=Math.sqrt(ix*ix+iy*iy)+1e-4,wave=age*2.4,band=Math.exp(-Math.pow(id-wave,2)/0.045)*Math.exp(-age*2.1)*6.5;vx+=ix/id*band*dt*10;vy+=iy/id*band*dt*10;}
        vx*=damp;vy*=damp;x+=vx*dt;y+=vy*dt;zz+=(tz-zz)*Math.min(1,dt*5);this._pos[o]=x;this._pos[o+1]=y;this._pos[o+2]=zz;this._vel[o]=vx;this._vel[o+1]=vy;this._col[o]+=(this._tgt[o]-this._col[o])*Math.min(1,dt*14);this._col[o+1]+=(this._tgt[o+1]-this._col[o+1])*Math.min(1,dt*14);this._col[o+2]+=(this._tgt[o+2]-this._col[o+2])*Math.min(1,dt*14);
      }
    }
    _resize(){if(!this._cv)return;var dpr=Math.min(devicePixelRatio||1,this._p.dprCap),w=Math.max(2,Math.floor(this._cv.clientWidth*dpr)),h=Math.max(2,Math.floor(this._cv.clientHeight*dpr));if(this._cv.width!==w||this._cv.height!==h){this._cv.width=w;this._cv.height=h;}}
    _commonUniforms(prog){var gl=this._gl,p=this._p,r=this._cv.getBoundingClientRect(),aspect=r.width/Math.max(1,r.height),px=this._ptr.active?this._ptr.x*p.parallax*0.16:0,py=this._ptr.active?this._ptr.y*p.parallax*0.16:0;gl.uniform1f(gl.getUniformLocation(prog,'uAspect'),aspect);gl.uniform1f(gl.getUniformLocation(prog,'uZoom'),p.zoom);gl.uniform2f(gl.getUniformLocation(prog,'uPan'),p.panX,p.panY);gl.uniform1f(gl.getUniformLocation(prog,'uRot'),p.rotation);gl.uniform1f(gl.getUniformLocation(prog,'uPersp'),p.perspective*1.6);gl.uniform2f(gl.getUniformLocation(prog,'uParallax'),px,py);}
    _attrib(prog,name,buf,size){var gl=this._gl,a=gl.getAttribLocation(prog,name);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,0,0);return a;}
    _render(clean){var gl=this._gl,p=this._p;if(!gl)return;this._resize();gl.viewport(0,0,this._cv.width,this._cv.height);var transparent=p.transparent||p.background==='transparent',bg=hex(p.background,[0.02,0.02,0.025]),fade=clean?1:clamp(1-p.trails*0.985,0.02,1);
      if(transparent){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}else{gl.useProgram(this._fadeProg);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform4f(gl.getUniformLocation(this._fadeProg,'uFade'),bg[0],bg[1],bg[2],fade);var fa=this._attrib(this._fadeProg,'aXY',this._tri,2);gl.drawArrays(gl.TRIANGLES,0,3);gl.disableVertexAttribArray(fa);}
      if(!this._n)return;gl.bindBuffer(gl.ARRAY_BUFFER,this._posBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,this._pos);gl.bindBuffer(gl.ARRAY_BUFFER,this._colBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,this._col);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,p.glow>0.02?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);
      if(p.lineMode==='streaks'){for(var i=0;i<this._n;i++){var o=i*3,q=i*6,back=0.045*p.speed+0.02;this._linePos[q]=this._pos[o]-this._vel[o]*back;this._linePos[q+1]=this._pos[o+1]-this._vel[o+1]*back;this._linePos[q+2]=this._pos[o+2];this._linePos[q+3]=this._pos[o];this._linePos[q+4]=this._pos[o+1];this._linePos[q+5]=this._pos[o+2];for(var c=0;c<2;c++){this._lineCol[q+c*3]=this._col[o];this._lineCol[q+c*3+1]=this._col[o+1];this._lineCol[q+c*3+2]=this._col[o+2];}}gl.bindBuffer(gl.ARRAY_BUFFER,this._linePosBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,this._linePos.subarray(0,this._n*6));gl.bindBuffer(gl.ARRAY_BUFFER,this._lineColBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,this._lineCol.subarray(0,this._n*6));gl.useProgram(this._lineProg);this._commonUniforms(this._lineProg);gl.uniform1f(gl.getUniformLocation(this._lineProg,'uOpacity'),p.opacity);gl.uniform1f(gl.getUniformLocation(this._lineProg,'uGlow'),p.glow);var la=this._attrib(this._lineProg,'aPos',this._linePosBuf,3),lb=this._attrib(this._lineProg,'aCol',this._lineColBuf,3),lc=this._attrib(this._lineProg,'aT',this._lineTBuf,1);gl.drawArrays(gl.LINES,0,this._n*2);gl.disableVertexAttribArray(la);gl.disableVertexAttribArray(lb);gl.disableVertexAttribArray(lc);return;}
      gl.useProgram(this._pointProg);this._commonUniforms(this._pointProg);gl.uniform1f(gl.getUniformLocation(this._pointProg,'uPointScale'),p.size*this._cv.height*0.0036);gl.uniform1f(gl.getUniformLocation(this._pointProg,'uPulse'),0);gl.uniform1f(gl.getUniformLocation(this._pointProg,'uOpacity'),p.opacity);gl.uniform1f(gl.getUniformLocation(this._pointProg,'uGlow'),p.glow);gl.uniform1f(gl.getUniformLocation(this._pointProg,'uShape'),p.shape==='circle'?0:p.shape==='square'?2:1);var useTex=p.shape==='sprite'&&this._spriteTex?1:0;gl.uniform1f(gl.getUniformLocation(this._pointProg,'uUseTex'),useTex);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,useTex?this._spriteTex:null);gl.uniform1i(gl.getUniformLocation(this._pointProg,'uTex'),0);var pa=this._attrib(this._pointProg,'aPos',this._posBuf,3),pb=this._attrib(this._pointProg,'aCol',this._colBuf,3),pc=this._attrib(this._pointProg,'aSize',this._sizeBuf,1);gl.drawArrays(gl.POINTS,0,this._n);gl.disableVertexAttribArray(pa);gl.disableVertexAttribArray(pb);gl.disableVertexAttribArray(pc);
    }
    play(){if(this._running)return;this._running=true;this._last=performance.now();var frame=(now)=>{if(!this._running)return;this._raf=requestAnimationFrame(frame);if(document.hidden||!this._visible){this._last=now;return;}var dt=Math.min(0.05,(now-this._last)/1000);this._last=now;this._step(dt);this._render(false);};this._raf=requestAnimationFrame(frame);this._emit('difusion-play');}
    pause(){if(!this._running)return;this._running=false;cancelAnimationFrame(this._raf);this._emit('difusion-pause');}
    destroy(){this.pause();if(this._ro)this._ro.disconnect();if(this._io)this._io.disconnect();document.removeEventListener('visibilitychange',this._vis);var cv=this._cv;if(cv){cv.removeEventListener('pointermove',this._move);cv.removeEventListener('pointerdown',this._down);cv.removeEventListener('pointerup',this._up);cv.removeEventListener('pointerleave',this._leave);}var gl=this._gl;if(gl){['_posBuf','_colBuf','_sizeBuf','_linePosBuf','_lineColBuf','_lineTBuf','_tri'].forEach((k)=>{if(this[k])gl.deleteBuffer(this[k]);});if(this._spriteTex)gl.deleteTexture(this._spriteTex);if(this._pointProg)gl.deleteProgram(this._pointProg);if(this._lineProg)gl.deleteProgram(this._lineProg);if(this._fadeProg)gl.deleteProgram(this._fadeProg);}this._gl=null;this._booted=false;this._ready=false;}
    _message(text){this._clearMessage();var d=document.createElement('div');d.className='msg';d.textContent=text;this.shadowRoot.appendChild(d);}
    _clearMessage(){var d=this.shadowRoot&&this.shadowRoot.querySelector('.msg');if(d)d.remove();}
    _emit(name,detail){this.dispatchEvent(new CustomEvent(name,{detail:detail||{},bubbles:true}));}
  }
  customElements.define(TAG,DifusionParticles);
})();
`;