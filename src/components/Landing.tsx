import { ArrowDown, ArrowRight, Code2, Play, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { RUNTIME_JS } from '../runtime/runtimeSource';

let runtimePromise: Promise<void> | null = null;

function registerRuntime(): Promise<void> {
  if (customElements.get('difusion-particles')) return Promise.resolve();
  if (runtimePromise) return runtimePromise;
  runtimePromise = new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([RUNTIME_JS], { type: 'text/javascript' }));
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => { URL.revokeObjectURL(url); resolve(); };
    script.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Runtime registration failed')); };
    document.head.appendChild(script);
  });
  return runtimePromise;
}

function ParticleHero() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let element: (HTMLElement & { destroy?: () => void }) | null = null;
    void registerRuntime().then(() => {
      if (!alive || !host.current) return;
      element = document.createElement('difusion-particles');
      const attrs: Record<string, string> = {
        src: '/samples/portrait.jpg',
        'particle-count': '28000', density: '0.76', 'particle-size': '2.15', 'size-variance': '0.72',
        shape: 'soft', 'color-mode': 'original', background: '#050506', depth: '0.72', parallax: '0.95',
        perspective: '0.62', spread: '0.16', turbulence: '0.24', drift: '0.18', flow: '0.16',
        'flow-angle': '0.48', swirl: '0.14', 'return-force': '0.52', interactive: 'true',
        'interaction-radius': '190', repulsion: '1.05', attraction: '0.14', glow: '0.52', opacity: '0.96',
        trails: '0.16', motion: 'true', speed: '0.72', amplitude: '0.8', quality: 'high', autoplay: 'true',
      };
      Object.entries(attrs).forEach(([key, value]) => element!.setAttribute(key, value));
      element.style.cssText = 'display:block;width:100%;height:100%';
      host.current.appendChild(element);
    }).catch(() => undefined);
    return () => {
      alive = false;
      element?.destroy?.();
      element?.remove();
    };
  }, []);

  return <div ref={host} className="absolute inset-0" aria-hidden />;
}

function BrandMark() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="25" height="25" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#101114" stroke="#34383f" />
        <g fill="#c9f158">
          <circle cx="20" cy="22" r="4.5" /><circle cx="33" cy="18" r="3" /><circle cx="45" cy="23" r="2.1" />
          <circle cx="23" cy="34" r="3.4" /><circle cx="36" cy="33" r="2.6" /><circle cx="48" cy="36" r="1.7" />
          <circle cx="21" cy="46" r="2.2" /><circle cx="32" cy="47" r="1.6" />
        </g>
      </svg>
      <span className="font-bold text-[13px] tracking-[0.22em] text-white">DIFUSION</span>
    </span>
  );
}

function enterStudio() {
  window.location.hash = 'studio';
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { threshold: 0.16 });
    scope.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className="h-full overflow-y-auto overflow-x-hidden bg-void text-white scroll-smooth scroll-thin">
      <section className="relative min-h-[100svh] overflow-hidden bg-[#050506]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('/samples/portrait.jpg')" }}
          aria-hidden
        />
        <ParticleHero />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,rgba(5,5,6,.96)_0%,rgba(5,5,6,.70)_34%,rgba(5,5,6,.08)_72%),linear-gradient(0deg,rgba(5,5,6,.76)_0%,transparent_45%)]" />

        <nav className="absolute inset-x-0 top-0 z-20 flex items-center h-16 px-5 sm:px-9 border-b border-white/10">
          <BrandMark />
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-7 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-400">
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#embed" className="hover:text-white transition-colors">Embed</a>
          </div>
          <button
            onClick={enterStudio}
            className="ml-7 h-8 px-3.5 rounded-md border border-lime/70 text-lime font-mono text-[9px] uppercase tracking-[0.15em] hover:bg-lime hover:text-black transition-colors"
          >
            Open studio
          </button>
        </nav>

        <div className="relative z-10 min-h-[100svh] flex flex-col justify-end px-5 sm:px-9 lg:px-14 pb-16 sm:pb-20 pt-24">
          <div className="max-w-[980px]">
            <div className="landing-hero-line font-display font-semibold leading-[0.8] tracking-[-0.075em] text-[clamp(4.5rem,15vw,13rem)] text-white">
              DIFUSION
            </div>
            <h1 className="landing-hero-line landing-delay-1 mt-7 text-[clamp(1.45rem,3vw,2.8rem)] leading-[1.06] tracking-[-0.04em] max-w-[720px]">
              Turn any image into a live particle system.
            </h1>
            <p className="landing-hero-line landing-delay-2 mt-4 text-[12px] sm:text-sm leading-relaxed text-zinc-400 max-w-[540px]">
              Shape color, depth and motion in real time, then export the exact same interactive field to any website.
            </p>
            <div className="landing-hero-line landing-delay-3 mt-7 flex flex-wrap gap-2.5">
              <button
                onClick={enterStudio}
                className="h-11 px-5 rounded-md bg-lime text-black font-mono text-[10px] uppercase tracking-[0.16em] font-semibold flex items-center gap-2 hover:bg-white transition-colors"
              >
                <Play size={12} fill="currentColor" /> Launch studio
              </button>
              <a
                href="#workflow"
                className="h-11 px-5 rounded-md border border-white/20 bg-black/20 backdrop-blur text-zinc-200 font-mono text-[10px] uppercase tracking-[0.16em] flex items-center gap-2 hover:border-lime hover:text-lime transition-colors"
              >
                See how it works <ArrowDown size={12} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="min-h-[80svh] px-5 sm:px-9 lg:px-14 py-24 sm:py-32 border-t border-edge bg-[#09090b] flex items-center">
        <div className="w-full grid lg:grid-cols-[1.1fr_.9fr] gap-16 lg:gap-24 items-start">
          <div className="landing-reveal">
            <div className="df-label !text-lime mb-6">Image to particle field</div>
            <h2 className="text-[clamp(2.8rem,7vw,7rem)] leading-[0.92] tracking-[-0.065em] max-w-[760px]">
              Pixels become behavior.
            </h2>
            <p className="mt-7 max-w-[540px] text-sm sm:text-base text-zinc-500 leading-relaxed">
              DIFUSION samples real image color and detail, then gives every point depth, velocity and a path home. It is reconstruction, not an overlay.
            </p>
          </div>
          <div className="landing-reveal landing-reveal-delay border-t border-edge2">
            {[
              ['01', 'Import', 'Drop in a photograph, logo or artwork.'],
              ['02', 'Shape', 'Tune density, movement, color and perspective.'],
              ['03', 'Interact', 'Push, attract and direct every particle live.'],
              ['04', 'Ship', 'Export media or a standalone web component.'],
            ].map(([n, title, body]) => (
              <div key={n} className="grid grid-cols-[42px_110px_1fr] sm:grid-cols-[52px_150px_1fr] gap-2 py-5 border-b border-edge items-baseline">
                <span className="font-mono text-[9px] text-lime">{n}</span>
                <span className="text-sm text-zinc-100">{title}</span>
                <span className="text-[11px] leading-relaxed text-zinc-500">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative min-h-[76svh] overflow-hidden flex items-end border-t border-edge">
        <img src="/samples/macaw.jpg" alt="Scarlet macaw demonstrating vivid particle color" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,4,.96)_0%,rgba(3,3,4,.62)_52%,rgba(3,3,4,.1)_100%),linear-gradient(0deg,rgba(3,3,4,.85),transparent_70%)]" />
        <div className="landing-reveal relative z-10 px-5 sm:px-9 lg:px-14 pb-20 sm:pb-28 max-w-[760px]">
          <SlidersHorizontal size={17} className="text-lime mb-6" />
          <h2 className="text-[clamp(2.8rem,6.6vw,6.8rem)] leading-[0.9] tracking-[-0.06em]">
            Color stays yours.
          </h2>
          <p className="mt-6 max-w-[520px] text-sm text-zinc-300 leading-relaxed">
            Correct exposure, contrast, saturation, hue and temperature before the pixels become particles. Every adjustment is preserved in the exported component.
          </p>
        </div>
      </section>

      <section id="embed" className="min-h-[86svh] bg-lime text-black px-5 sm:px-9 lg:px-14 py-24 sm:py-32 flex items-center">
        <div className="w-full grid lg:grid-cols-[.85fr_1.15fr] gap-14 lg:gap-24 items-center">
          <div className="landing-reveal">
            <Code2 size={18} className="mb-6" />
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] mb-5">Editor parity runtime</div>
            <h2 className="text-[clamp(2.8rem,6vw,6.5rem)] leading-[0.88] tracking-[-0.065em]">
              The output is the output.
            </h2>
            <p className="mt-7 max-w-[500px] text-sm leading-relaxed text-black/65">
              The generated component uses the same sampling, color correction, physics, camera and rendering modes as the studio. No simplified preview. No editor dependency.
            </p>
          </div>
          <div className="landing-reveal landing-reveal-delay rounded-lg overflow-hidden border border-black/25 bg-[#08080a] text-zinc-300 shadow-[0_24px_80px_rgba(0,0,0,.22)]">
            <div className="h-9 px-3 flex items-center border-b border-white/10 font-mono text-[9px] text-zinc-500">hero-particles.html</div>
            <pre className="p-4 sm:p-6 overflow-x-auto font-mono text-[9px] sm:text-[10.5px] leading-[1.8]">{`<script src="./difusion-particles.js"></script>

<difusion-particles
  src="/media/portrait.webp"
  particle-count="28000"
  density="0.76"
  turbulence="0.24"
  flow="0.16"
  depth="0.72"
  saturation="1.18"
  temperature="0.08"
  interactive="true"
></difusion-particles>`}</pre>
          </div>
        </div>
      </section>

      <footer className="bg-[#08080a] px-5 sm:px-9 lg:px-14 py-20 sm:py-28 border-t border-edge">
        <div className="landing-reveal flex flex-col sm:flex-row sm:items-end gap-8">
          <div>
            <div className="font-bold text-[clamp(3rem,9vw,8rem)] tracking-[-0.07em] leading-none">DIFUSION</div>
            <p className="mt-4 text-xs text-zinc-500">One image. Thousands of points. Your code.</p>
          </div>
          <div className="flex-1" />
          <button
            onClick={enterStudio}
            className="h-12 px-6 rounded-md bg-lime text-black font-mono text-[10px] uppercase tracking-[0.16em] font-semibold flex items-center justify-center gap-2 hover:bg-white transition-colors"
          >
            Start creating <ArrowRight size={13} />
          </button>
        </div>
      </footer>
    </div>
  );
}