"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Canvas3D, { usePrefersReducedMotion } from "./Canvas3D";
import type { Palette } from "./shapes";

function digitTexture(digit: string, bg: string, fg: string, disc = "#ffffff") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.font = '800 150px "Bricolage Grotesque Variable", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // En SphereGeometry, u = 0.25 mira a la cámara (+z).
  for (const x of [128, 384]) {
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, 128, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(digit, x, 136);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Ball({ digit, x, delay, highlight, palette, ready }: { digit: string; x: number; delay: number; highlight: boolean; palette: Palette; ready: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const reduced = usePrefersReducedMotion();
  const start = useRef(performance.now());
  const texture = useMemo(
    () => digitTexture(digit, highlight ? palette.accent : "#f3efe6", highlight ? "#3a2400" : "#1b1b1b", highlight ? "#ffe7a3" : "#ffffff"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [digit, highlight, palette.accent, ready],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = (performance.now() - start.current) / 1000 - delay;
    if (reduced) {
      m.position.y = 0;
      return;
    }
    if (t < 0) {
      m.position.y = 6;
      return;
    }
    // Caída con rebote amortiguado
    const fall = Math.min(t / 0.55, 1);
    const bounce = t > 0.55 ? Math.abs(Math.sin((t - 0.55) * 9)) * Math.exp(-(t - 0.55) * 5) * 0.8 : 0;
    m.position.y = 6 * (1 - fall * fall) + bounce;
    m.rotation.y = Math.sin(clock.elapsedTime * 0.8 + x) * 0.35;
    m.rotation.x = Math.max(0, 1 - t) * -4;
  });
  return (
    <mesh ref={ref} position={[x, 6, 0]}>
      <sphereGeometry args={[0.62, 64, 64]} />
      <meshPhysicalMaterial
        map={texture}
        roughness={0.2}
        metalness={0.02}
        clearcoat={1}
        clearcoatRoughness={0.08}
        emissive={highlight ? palette.accent : "#000000"}
        emissiveIntensity={highlight ? 0.18 : 0}
      />
    </mesh>
  );
}

const GAP = 1.42;

/** Escala la fila para que siempre quepa en el lienzo, sea cual sea su tamaño. */
function Row({ chars, highlightLast, palette, ready }: { chars: string[]; highlightLast: number; palette: Palette; ready: boolean }) {
  const { width, height } = useThree((s) => s.viewport);
  const scale = Math.min((width * 0.92) / (chars.length * GAP), (height * 0.8) / 1.3, 1.6);
  return (
    <group scale={scale}>
      {chars.map((d, i) => (
        <Ball
          key={`${i}-${d}`}
          digit={d}
          x={(i - (chars.length - 1) / 2) * GAP}
          delay={0.25 * i}
          highlight={i >= chars.length - highlightLast}
          palette={palette}
          ready={ready}
        />
      ))}
    </group>
  );
}

/** Balotas 3D con el número de la lotería; las últimas cifras (las que juegan) en dorado. */
export default function Balls3D({ digits, highlightLast, palette, className }: { digits: string; highlightLast: number; palette: Palette; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.fonts?.load('800 64px "Bricolage Grotesque Variable"').finally(() => setReady(true));
  }, []);
  const chars = digits.split("");
  return (
    <Canvas3D
      className={className}
      camera={{ position: [0, 0.2, 6], fov: 38 }}
      label={`Balotas con el número ${digits}`}
      fallback={<p className="num p-4 text-center text-3xl font-black">{digits}</p>}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 6]} intensity={2} />
      <pointLight position={[-3, 1, 4]} intensity={8} color={palette.accent} />
      <Row chars={chars} highlightLast={highlightLast} palette={palette} ready={ready} />
    </Canvas3D>
  );
}
