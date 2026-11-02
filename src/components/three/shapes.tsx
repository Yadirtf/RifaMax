"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Shape } from "@/lib/themes";

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
}

const extrude = (shape: THREE.Shape, depth = 0.25, bevel = 0.06) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 24 }).center();

function starShape(points = 5, outer = 0.62, inner = 0.27) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.55);
  s.bezierCurveTo(-0.2, -0.35, -0.65, -0.1, -0.62, 0.22);
  s.bezierCurveTo(-0.6, 0.52, -0.22, 0.62, 0, 0.36);
  s.bezierCurveTo(0.22, 0.62, 0.6, 0.52, 0.62, 0.22);
  s.bezierCurveTo(0.65, -0.1, 0.2, -0.35, 0, -0.55);
  return s;
}

function leafShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.7);
  s.quadraticCurveTo(0.55, -0.1, 0, 0.7);
  s.quadraticCurveTo(-0.55, -0.1, 0, -0.7);
  return s;
}

function ticketShape() {
  const w = 1.1;
  const h = 0.62;
  const r = 0.12;
  const n = 0.12; // muesca
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, -n);
  s.absarc(w / 2, 0, n, -Math.PI / 2, Math.PI / 2, true);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, n);
  s.absarc(-w / 2, 0, n, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function useGeometries() {
  return useMemo(
    () => ({
      star: extrude(starShape(), 0.18, 0.05),
      heart: extrude(heartShape(), 0.25, 0.07),
      leaf: extrude(leafShape(), 0.06, 0.03),
      ticket: extrude(ticketShape(), 0.06, 0.03),
    }),
    [],
  );
}

/** Una figura temática 3D, centrada en el origen y de ~1 unidad de tamaño. */
export function ShapeMesh({ shape, palette, variant = 0 }: { shape: Shape; palette: Palette; variant?: number }) {
  const g = useGeometries();
  const main = variant % 2 === 0 ? palette.primary : palette.secondary;
  const gold = { color: palette.accent, metalness: 0.85, roughness: 0.22 };

  switch (shape) {
    case "gift":
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.95, 0.85, 0.95]} />
            <meshStandardMaterial color={main} roughness={0.45} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.47, 0]}>
            <boxGeometry args={[1.05, 0.16, 1.05]} />
            <meshStandardMaterial color={main} roughness={0.4} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.18, 1.02, 1.07]} />
            <meshStandardMaterial {...gold} />
          </mesh>
          <mesh>
            <boxGeometry args={[1.07, 1.02, 0.18]} />
            <meshStandardMaterial {...gold} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.17, 0.66, 0]} rotation={[0, 0, s * 0.6]}>
              <torusGeometry args={[0.16, 0.05, 12, 24]} />
              <meshStandardMaterial {...gold} />
            </mesh>
          ))}
        </group>
      );
    case "ornament":
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.55, 48, 48]} />
            <meshStandardMaterial color={main} metalness={0.55} roughness={0.12} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.555, 0.035, 12, 64]} />
            <meshStandardMaterial {...gold} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.13, 0.15, 0.16, 24]} />
            <meshStandardMaterial {...gold} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <torusGeometry args={[0.07, 0.02, 8, 24]} />
            <meshStandardMaterial {...gold} />
          </mesh>
        </group>
      );
    case "star":
      return (
        <mesh geometry={g.star}>
          <meshStandardMaterial {...gold} />
        </mesh>
      );
    case "heart":
      return (
        <mesh geometry={g.heart}>
          <meshStandardMaterial color={main} metalness={0.3} roughness={0.25} />
        </mesh>
      );
    case "leaf":
      return (
        <mesh geometry={g.leaf}>
          <meshStandardMaterial color={palette.secondary === main ? palette.primary : main} roughness={0.5} />
        </mesh>
      );
    case "flower":
      return (
        <group>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0]} rotation={[0, 0, a]} scale={[1.4, 0.8, 0.5]}>
                <sphereGeometry args={[0.2, 24, 24]} />
                <meshStandardMaterial color={main} roughness={0.4} />
              </mesh>
            );
          })}
          <mesh>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial {...gold} />
          </mesh>
        </group>
      );
    case "coin":
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, 0.09, 48]} />
            <meshStandardMaterial {...gold} />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.38, 0.025, 8, 48]} />
            <meshStandardMaterial {...gold} roughness={0.35} />
          </mesh>
        </group>
      );
    case "ticket":
      return (
        <mesh geometry={g.ticket}>
          <meshStandardMaterial color={main} roughness={0.35} metalness={0.1} />
        </mesh>
      );
  }
}
