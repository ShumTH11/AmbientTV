import { useEffect, useRef, type RefObject } from 'react';

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

export type VisualizerMode = 'bars' | 'radial' | 'particles';

/**
 * Canvas spectrum visualizer.
 * Uses a real Web Audio AnalyserNode when the audio is same-origin (CORS-ok);
 * falls back to a synthetic, beat-pulsed spectrum for cross-origin / mock audio.
 * Publishes `--beat` (0..1) on its parent element so the edge-glow can pulse.
 */
export function Visualizer({
  audioRef,
  playing,
  mode = 'bars',
  className,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  playing: boolean;
  mode?: VisualizerMode;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const syntheticRef = useRef(false);
  const lastRealRef = useRef(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; s: number }[]>([]);

  // Attach analyser (best-effort; cross-origin audio will throw → synthetic fallback)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let ctx: AudioContext | null = null;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      const an = ctx.createAnalyser();
      an.fftSize = 128;
      an.smoothingTimeConstant = 0.82;
      src.connect(an);
      an.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = an;
      srcRef.current = src;
      dataRef.current = new Uint8Array(an.frequencyBinCount);
    } catch {
      ctxRef.current = null;
      analyserRef.current = null;
    }
    return () => {
      try {
        srcRef.current?.disconnect();
        analyserRef.current?.disconnect();
        ctx?.close();
      } catch {
        /* ignore */
      }
    };
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bars = 56;

    if (playing) ctxRef.current?.resume().catch(() => {});

    let raf = 0;
    const draw = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      g.clearRect(0, 0, canvas.width, canvas.height);

      const acc =
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
        '125 211 252';
      const glow =
        getComputedStyle(document.documentElement).getPropertyValue('--accent-glow').trim() ||
        '14 165 233';

      let beat = 0;
      const levels = new Array(bars).fill(0);
      const analyser = analyserRef.current;
      const data = dataRef.current;
      const useReal = analyser && data && playing && !syntheticRef.current;
      if (useReal) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < bars; i++) {
          const v = data[Math.floor((i / bars) * data.length)] / 255;
          sum += v;
          levels[i] = v;
        }
        beat = sum / bars;
        if (sum < 0.01) {
          if (performance.now() - lastRealRef.current > 1500) syntheticRef.current = true;
        } else {
          lastRealRef.current = performance.now();
        }
      } else {
        const time = t / 1000;
        const pulse = playing ? 0.5 + 0.5 * Math.sin(time * Math.PI * 1.9) : 0.2;
        beat = playing ? pulse : 0.12;
        for (let i = 0; i < bars; i++) {
          const env = Math.sin((i / bars) * Math.PI);
          levels[i] =
            (0.35 + 0.4 * env) * (0.6 + 0.4 * Math.sin(time * 3 + i * 0.4)) * (0.7 + 0.3 * pulse);
        }
      }

      if (mode === 'bars') {
        for (let i = 0; i < bars; i++) {
          const bh = Math.max(2, levels[i] * h * dpr);
          paintBar(g, i, bars, w * dpr, h * dpr, bh, acc, glow);
        }
      } else if (mode === 'radial') {
        const cx = (w * dpr) / 2;
        const cy = (h * dpr) / 2;
        const R = Math.min(cx, cy) * 0.55;
        for (let i = 0; i < bars; i++) {
          const ang = (i / bars) * Math.PI * 2 - Math.PI / 2;
          const len = Math.max(3, levels[i] * R * 0.9);
          const x1 = cx + Math.cos(ang) * R;
          const y1 = cy + Math.sin(ang) * R;
          const x2 = cx + Math.cos(ang) * (R + len);
          const y2 = cy + Math.sin(ang) * (R + len);
          g.strokeStyle = `rgb(${acc})`;
          g.lineWidth = Math.max(2, (w * dpr) / bars / 2.4);
          g.lineCap = 'round';
          g.globalAlpha = 0.9;
          g.beginPath();
          g.moveTo(x1, y1);
          g.lineTo(x2, y2);
          g.stroke();
        }
        g.globalAlpha = 1;
      } else {
        // particles
        const arr = particlesRef.current;
        if (arr.length === 0) {
          for (let i = 0; i < 46; i++) {
            arr.push({
              x: Math.random() * w * dpr,
              y: Math.random() * h * dpr,
              vx: (Math.random() - 0.5) * 0.4,
              vy: -(0.4 + Math.random() * 0.8),
              s: 1 + Math.random() * 2.5,
            });
          }
        }
        const energy = beat;
        for (const p of arr) {
          p.x += p.vx * dpr + Math.sin(t / 600 + p.y) * 0.3;
          p.y += p.vy * dpr * (1 + energy * 2);
          if (p.y < -10) {
            p.y = h * dpr + 10;
            p.x = Math.random() * w * dpr;
          }
          if (p.x < 0) p.x = w * dpr;
          if (p.x > w * dpr) p.x = 0;
          g.fillStyle = `rgb(${glow})`;
          g.globalAlpha = 0.35 + energy * 0.6;
          g.beginPath();
          g.arc(p.x, p.y, p.s * dpr * (1 + energy), 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }

      document.documentElement.style.setProperty('--beat', beat.toFixed(3));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.setProperty('--beat', '0');
    };
  }, [audioRef, playing, mode]);

  return <canvas ref={canvasRef} className={className} />;
}

function paintBar(
  g: CanvasRenderingContext2D,
  i: number,
  bars: number,
  w: number,
  h: number,
  bh: number,
  acc: string,
  glow: string
) {
  const gap = 2 * (w / 800);
  const bw = (w - gap * (bars - 1)) / bars;
  const x = i * (bw + gap);
  const grad = g.createLinearGradient(0, h, 0, h - bh);
  grad.addColorStop(0, `rgb(${glow})`);
  grad.addColorStop(1, `rgb(${acc})`);
  g.fillStyle = grad;
  g.globalAlpha = 0.92;
  roundRect(g, x, h - bh, bw, bh, bw / 2);
  g.fill();
  g.globalAlpha = 1;
}
