"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Canvas3D, { usePrefersReducedMotion } from "./Canvas3D";
import type { Palette } from "./shapes";

const TAU = Math.PI * 2;
const DISPLAY_FONT = '"Bricolage Grotesque Variable", system-ui, sans-serif';

/** Cara de la ruleta dibujada en un canvas: segmentos desde las 12 en punto, en sentido horario. */
function drawFace(labels: string[], palette: Palette, size = 2048): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  const n = Math.max(labels.length, 1);
  const seg = TAU / n;
  const colors = [palette.primary, palette.secondary, "#14231b"];
  ctx.translate(r, r);
  for (let i = 0; i < n; i++) {
    // ángulo canvas: 0 = derecha, sentido horario. Las 12 en punto = -90°.
    const a0 = -Math.PI / 2 + i * seg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.985, a0, a0 + seg);
    ctx.closePath();
    const idx = n > 1 && i === n - 1 && i % 3 === 0 ? 1 : i % 3;
    ctx.fillStyle = labels.length ? colors[idx] : "#14231b";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,240,200,0.35)";
    ctx.lineWidth = n > 60 ? 2 : 4;
    ctx.stroke();
  }
  // Etiquetas radiales
  const fontPx = n > 70 ? 46 : n > 40 ? 64 : n > 20 ? 92 : n > 10 ? 130 : 170;
  ctx.fillStyle = "#fff8ea";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${fontPx}px ${DISPLAY_FONT}`;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  labels.forEach((label, i) => {
    ctx.save();
    ctx.rotate(-Math.PI / 2 + (i + 0.5) * seg);
    ctx.fillText(label, r * 0.93, 0);
    ctx.restore();
  });
  // Centro
  ctx.shadowBlur = 0;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.2);
  g.addColorStop(0, "#00000000");
  g.addColorStop(1, "#00000055");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, TAU);
  ctx.fill();
  return c;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

interface WheelProps {
  labels: string[];
  palette: Palette;
  /** Índice ganador en `labels`. Al cambiar (o al cambiar spinKey) la ruleta gira hasta él. */
  targetIndex: number | null;
  spinKey?: number;
  durationMs?: number;
  onDone?: () => void;
  /** Giro lento mientras espera. */
  idle?: boolean;
}

function WheelModel({ labels, palette, targetIndex, spinKey = 0, durationMs = 7000, onDone, idle = true }: WheelProps) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef<THREE.Group>(null);
  const reduced = usePrefersReducedMotion();
  const [fontsReady, setFontsReady] = useState(false);
  const anim = useRef<{ from: number; to: number; start: number; dur: number; done: boolean } | null>(null);
  const angle = useRef(0);
  const n = Math.max(labels.length, 1);
  const seg = TAU / n;

  useEffect(() => {
    let alive = true;
    document.fonts?.load(`800 64px "Bricolage Grotesque Variable"`).finally(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const t = new THREE.CanvasTexture(drawFace(labels, palette));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
    // fontsReady fuerza redibujar con la fuente cargada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels.join(","), palette.primary, palette.secondary, fontsReady]);

  useEffect(() => () => texture?.dispose(), [texture]);

  useEffect(() => {
    if (targetIndex === null || targetIndex < 0) return;
    // Girar en sentido horario (ángulo decreciente) hasta que el centro del segmento quede arriba.
    const targetMod = (targetIndex + 0.5) * seg;
    const cur = angle.current;
    let delta = (((cur - targetMod) % TAU) + TAU) % TAU;
    delta += TAU * (reduced ? 1 : 7);
    anim.current = { from: cur, to: cur - delta, start: performance.now(), dur: reduced ? 1200 : durationMs, done: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIndex, spinKey]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const a = anim.current;
    if (a && !a.done) {
      const t = Math.min(1, (performance.now() - a.start) / a.dur);
      angle.current = a.from + (a.to - a.from) * easeOut(t);
      if (t >= 1) {
        a.done = true;
        onDone?.();
      }
    } else if (idle && !a && !reduced) {
      angle.current -= dt * 0.25;
    }
    g.rotation.z = angle.current;
    // El puntero "tiembla" al pasar por cada separación
    if (pointer.current) {
      const frac = (((-angle.current / seg) % 1) + 1) % 1;
      const kick = a && !a.done ? Math.max(0, 1 - frac * 5) * 0.35 : 0;
      pointer.current.rotation.z = kick;
    }
  });

  const pegs = useMemo(() => Array.from({ length: Math.min(n, 60) }, (_, i) => (i / Math.min(n, 60)) * TAU), [n]);

  return (
    <group rotation={[-0.18, 0, 0]}>
      <group ref={group}>
        {/* cuerpo */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.12]}>
          <cylinderGeometry args={[2.18, 2.22, 0.3, 96]} />
          <meshStandardMaterial color="#2a1a0c" metalness={0.2} roughness={0.55} />
        </mesh>
        {/* cara */}
        <mesh position={[0, 0, 0.035]}>
          <circleGeometry args={[2, 128]} />
          {texture && <meshBasicMaterial map={texture} toneMapped={false} />}
        </mesh>
        {/* aro dorado */}
        <mesh position={[0, 0, 0.05]}>
          <torusGeometry args={[2.06, 0.085, 24, 160]} />
          <meshStandardMaterial color={palette.accent} metalness={0.9} roughness={0.2} />
        </mesh>
        {pegs.map((a, i) => (
          <mesh key={i} position={[Math.sin(a) * 2.06, Math.cos(a) * 2.06, 0.16]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#fff3cf" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}
        {/* centro */}
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.36, 0.42, 0.18, 48]} />
          <meshStandardMaterial color={palette.accent} metalness={0.9} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0, 0.24]}>
          <sphereGeometry args={[0.16, 32, 32]} />
          <meshStandardMaterial color={palette.primary} metalness={0.4} roughness={0.2} />
        </mesh>
      </group>
      {/* puntero */}
      <group ref={pointer} position={[0, 2.18, 0.3]}>
        <mesh rotation={[0, 0, Math.PI]} position={[0, -0.12, 0]}>
          <coneGeometry args={[0.2, 0.46, 4]} />
          <meshStandardMaterial color={palette.accent} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.14, 24, 24]} />
          <meshStandardMaterial color={palette.primary} metalness={0.4} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

export default function Wheel3D(props: WheelProps & { className?: string }) {
  return (
    <Canvas3D
      className={props.className}
      camera={{ position: [0, -0.4, 6.4], fov: 42 }}
      label={`Ruleta con ${props.labels.length} números`}
      fallback={<p className="p-6 text-center text-sm opacity-70">Tu dispositivo no muestra gráficos 3D.</p>}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 4, 6]} intensity={1.8} />
      <pointLight position={[-3, 2, 3]} intensity={10} color={props.palette.accent} />
      <WheelModel {...props} />
    </Canvas3D>
  );
}
