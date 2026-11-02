"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import type { Shape } from "@/lib/themes";
import Canvas3D, { usePrefersReducedMotion } from "./Canvas3D";
import { ShapeMesh, type Palette } from "./shapes";

interface Item {
  shape: Shape;
  pos: [number, number, number];
  scale: number;
  phase: number;
  spin: number;
  variant: number;
}

// Posiciones pensadas para dejar libre el centro (donde va el título).
const SLOTS: [number, number, number][] = [
  [-5.6, 2.3, -1.5],
  [5.5, 2.4, -1.2],
  [-5.0, -2.3, -0.5],
  [5.2, -2.2, -0.8],
  [-7.6, 0.2, -3.5],
  [7.8, 0.1, -3.6],
  [-2.8, 3.6, -4.5],
  [3.0, -3.7, -3.5],
  [0.8, 4.2, -6],
  [-6.8, 3.8, -5.5],
];

function Floater({ item, palette, reduced }: { item: Item; palette: Palette; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  // En pantallas angostas las figuras se acercan al centro y se reparten arriba y abajo.
  const { width, height } = useThree((s) => s.viewport);
  const kx = Math.min(1, Math.max(0.3, width / 15));
  const portrait = height > width;
  const x = item.pos[0] * kx;
  const y = portrait ? Math.sign(item.pos[1] || 1) * (Math.abs(item.pos[1]) * 0.55 + height * 0.2) : item.pos[1];
  const scale = item.scale * (portrait ? 0.8 : 1);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.position.x = x;
    if (reduced) return;
    const t = clock.elapsedTime + item.phase;
    g.position.y = y + Math.sin(t * 0.8) * 0.18;
    g.rotation.y = t * item.spin;
    g.rotation.x = Math.sin(t * 0.5) * 0.25;
  });
  return (
    <group ref={ref} position={[x, y, item.pos[2]]} scale={scale} rotation={[0.3, item.phase, 0.1]}>
      <ShapeMesh shape={item.shape} palette={palette} variant={item.variant} />
    </group>
  );
}

function Rig({ reduced, children }: { reduced: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ pointer }) => {
    const g = ref.current;
    if (!g || reduced) return;
    g.rotation.y += (pointer.x * 0.12 - g.rotation.y) * 0.05;
    g.rotation.x += (-pointer.y * 0.08 - g.rotation.x) * 0.05;
  });
  return <group ref={ref}>{children}</group>;
}

/** Portada: figuras de temporada flotando alrededor del título, con paralaje del puntero. */
export default function HeroScene({ shapes, palette, compact = false }: { shapes: Shape[]; palette: Palette; compact?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const items = useMemo<Item[]>(
    () =>
      SLOTS.slice(0, compact ? 6 : SLOTS.length).map((pos, i) => ({
        shape: shapes[i % shapes.length],
        pos,
        scale: 0.75 + ((i * 37) % 10) / 22 - (pos[2] < -2 ? 0.15 : 0),
        phase: i * 1.37,
        spin: (i % 2 ? 1 : -1) * (0.25 + (i % 3) * 0.1),
        variant: i,
      })),
    [shapes, compact],
  );
  return (
    <Canvas3D className="absolute inset-0" camera={{ position: [0, 0, 9], fov: 45 }} label="Figuras de temporada flotando">
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 6]} intensity={1.6} />
      <pointLight position={[-4, -2, 4]} intensity={18} color={palette.accent} distance={14} />
      <Rig reduced={reduced}>
        {items.map((it, i) => (
          <Floater key={i} item={it} palette={palette} reduced={reduced} />
        ))}
      </Rig>
    </Canvas3D>
  );
}
