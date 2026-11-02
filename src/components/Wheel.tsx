"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = ["var(--primary)", "var(--secondary)", "var(--surface)"];

interface Props {
  labels: string[];
  /** Índice ganador; al cambiar, la ruleta gira hasta él. */
  targetIndex: number | null;
  /** Cambia este valor para repetir el giro. */
  spinKey?: number;
  durationMs?: number;
  onDone?: () => void;
  size?: number;
}

/** Ruleta SVG. El puntero está arriba; gira en sentido horario. */
export default function Wheel({ labels, targetIndex, spinKey = 0, durationMs = 6000, onDone, size = 340 }: Props) {
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const rotationRef = useRef(0);
  const n = Math.max(labels.length, 1);
  const seg = 360 / n;
  const r = size / 2;

  useEffect(() => {
    if (targetIndex === null || targetIndex < 0) return;
    // Centro del segmento ganador queda bajo el puntero (arriba).
    const target = 360 - (targetIndex + 0.5) * seg;
    const current = rotationRef.current;
    const base = current - (current % 360);
    const next = base + 360 * 6 + target;
    rotationRef.current = next;
    setAnimating(true);
    // Doble requestAnimationFrame para que la transición arranque.
    requestAnimationFrame(() => requestAnimationFrame(() => setRotation(next)));
    const t = setTimeout(() => {
      setAnimating(false);
      onDone?.();
    }, durationMs + 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIndex, spinKey]);

  const fontSize = n > 60 ? 9 : n > 30 ? 12 : n > 12 ? 15 : 20;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
      <div
        className="absolute left-1/2 -top-1 z-10 -translate-x-1/2"
        style={{ width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "26px solid var(--accent)" }}
        aria-hidden
      />
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={`Ruleta con ${labels.length} números`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animating ? `transform ${durationMs}ms cubic-bezier(0.15, 0.85, 0.2, 1)` : "none",
        }}
      >
        <circle cx={r} cy={r} r={r - 2} fill="var(--surface)" stroke="var(--accent)" strokeWidth={4} />
        {labels.length === 0 && (
          <text x={r} y={r} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize={16}>
            Sin números
          </text>
        )}
        {labels.map((label, i) => {
          const a0 = ((i * seg - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
          const rr = r - 6;
          const x0 = r + rr * Math.cos(a0);
          const y0 = r + rr * Math.sin(a0);
          const x1 = r + rr * Math.cos(a1);
          const y1 = r + rr * Math.sin(a1);
          const large = seg > 180 ? 1 : 0;
          const mid = (i + 0.5) * seg;
          const path =
            n === 1
              ? `M ${r} ${r - rr} A ${rr} ${rr} 0 1 1 ${r - 0.01} ${r - rr} Z`
              : `M ${r} ${r} L ${x0} ${y0} A ${rr} ${rr} 0 ${large} 1 ${x1} ${y1} Z`;
          return (
            <g key={i}>
              <path d={path} fill={COLORS[n > 1 && i === n - 1 && i % 3 === 0 ? 1 : i % 3]} stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} />
              <text
                x={r}
                y={r - rr + fontSize + 4}
                fill="#fff"
                fontSize={fontSize}
                fontWeight={700}
                textAnchor="middle"
                transform={`rotate(${mid} ${r} ${r})`}
              >
                {label}
              </text>
            </g>
          );
        })}
        <circle cx={r} cy={r} r={size * 0.08} fill="var(--accent)" />
      </svg>
    </div>
  );
}
