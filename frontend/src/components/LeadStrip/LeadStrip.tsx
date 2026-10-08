import { useEffect, useRef } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import type { Waveform } from '../../types/ecg';

export function LeadStrip({ waveform }: { waveform: Waveform }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {waveform.leads.map((lead, i) => (
        <LeadRow
          key={lead}
          name={lead}
          data={waveform.signal[i]}
          rPeaks={lead === 'II' ? waveform.r_peaks_sample : null}
        />
      ))}
    </div>
  );
}

// Static strip — draws exactly the recorded waveform once, no animation.
function LeadRow({
  name,
  data,
  rPeaks,
}: {
  name: string;
  data: number[];
  rPeaks: number[] | null;
}) {
  // Resize is observed on this plain wrapper div, NOT the canvas — resizing
  // a <canvas> (setting .width/.height to change its resolution) can itself
  // nudge a flex-sized box by sub-pixel amounts, which would re-trigger a
  // ResizeObserver watching the canvas directly and loop indefinitely on
  // some browsers/zoom levels. A wrapper div's size can't be affected by
  // its canvas child's attributes, so observing it instead breaks that
  // feedback loop structurally rather than relying on it happening to settle.
  const { C } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const n = data.length;
    let lastW = -1;
    let lastH = -1;

    const paint = (W: number, H: number) => {
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.strokeStyle = C.line;
      ctx.stroke();

      if (rPeaks && n) {
        for (const pk of rPeaks) {
          const x = (pk / (n - 1)) * W;
          ctx.beginPath();
          ctx.moveTo(x, 2);
          ctx.lineTo(x, H - 2);
          ctx.strokeStyle = C.amber + '55';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      if (n > 1) {
        ctx.beginPath();
        ctx.strokeStyle = C.signal;
        ctx.lineWidth = 1.3;
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * W;
          const y = H / 2 - data[i] * (H * 0.42);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      // Skip no-op resizes — belt-and-suspenders against any observer loop.
      if (r.width === lastW && r.height === lastH) return;
      lastW = r.width;
      lastH = r.height;
      cv.width = r.width * DPR;
      cv.height = r.height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      paint(r.width, r.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => ro.disconnect();
  }, [data, rPeaks, C]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34 }}>
      <div
        style={{
          width: 30,
          fontSize: 10,
          fontWeight: 700,
          color: C.dim,
          fontFamily: 'ui-monospace, monospace',
          textAlign: 'right',
        }}
      >
        {name}
      </div>
      <div ref={wrapRef} style={{ flex: 1, height: '100%', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
}
