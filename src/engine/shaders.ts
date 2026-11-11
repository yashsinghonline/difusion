/* ------------------------------------------------------------------ */
/*  DIFUSION editor shaders — WebGL1, one draw call per pass           */
/* ------------------------------------------------------------------ */

const COMMON_VERT = /* glsl */ `
  attribute vec3 aPos;
  attribute vec3 aCol;
  attribute float aSize;
  uniform float uAspect;
  uniform float uZoom;
  uniform vec2  uPan;
  uniform float uRot;
  uniform float uPersp;
  uniform vec2  uParallax;
  uniform float uPointScale;
  uniform float uPulse;
  varying vec3  vCol;
  varying float vFade;

  vec3 project(vec3 p) {
    p.xy += uParallax * p.z;
    float c = cos(uRot), s = sin(uRot);
    p.xy = mat2(c, -s, s, c) * p.xy;
    p.xy = p.xy * uZoom + uPan;
    float persp = 1.0 / max(0.25, 1.0 + p.z * uPersp);
    p.xy *= persp;
    vFade = clamp(persp * persp, 0.35, 1.35);
    return vec3(p.x / uAspect, p.y, persp);
  }
`;

export const POINT_VERT =
  COMMON_VERT +
  /* glsl */ `
  void main() {
    vec3 q = project(aPos);
    gl_Position = vec4(q.xy, 0.0, 1.0);
    gl_PointSize = clamp(aSize * uPointScale * q.z * (1.0 + uPulse), 1.0, 110.0);
    vCol = aCol;
  }
`;

export const POINT_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vCol;
  varying float vFade;
  uniform sampler2D uTex;
  uniform float uUseTex;
  uniform float uShape;   /* 0 circle, 1 soft, 2 square */
  uniform float uOpacity;
  uniform float uGlow;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float a = 1.0;
    vec3 rgb = vCol;
    if (uUseTex > 0.5) {
      vec4 t = texture2D(uTex, gl_PointCoord);
      a = t.a;
      rgb *= t.rgb * 1.6;
    } else if (uShape < 0.5) {
      float d = length(uv);
      a = 1.0 - smoothstep(0.40, 0.5, d);
      if (a <= 0.001) discard;
    } else if (uShape < 1.5) {
      float d = length(uv) * 2.0;
      a = exp(-d * d * 2.6);
      if (a <= 0.004) discard;
    }
    rgb *= mix(1.0, 1.55, uGlow);
    gl_FragColor = vec4(rgb, a * uOpacity * vFade);
  }
`;

export const LINE_VERT =
  COMMON_VERT +
  /* glsl */ `
  attribute float aT;
  varying float vA;
  void main() {
    vec3 q = project(aPos);
    gl_Position = vec4(q.xy, 0.0, 1.0);
    vCol = aCol;
    vA = aT;
  }
`;

export const LINE_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vCol;
  varying float vFade;
  varying float vA;
  uniform float uOpacity;
  uniform float uGlow;
  void main() {
    vec3 rgb = vCol * mix(1.0, 1.5, uGlow);
    gl_FragColor = vec4(rgb, vA * vA * uOpacity * 0.85 * vFade);
  }
`;

export const FADE_VERT = /* glsl */ `
  attribute vec2 aXY;
  void main() { gl_Position = vec4(aXY, 0.0, 1.0); }
`;

export const FADE_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec4 uFade;
  void main() { gl_FragColor = uFade; }
`;
