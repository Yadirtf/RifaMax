"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import Canvas3D, { usePrefersReducedMotion } from "./Canvas3D";
import type { Palette } from "./shapes";

const MAX = 140; // monedas cuando se llega a la meta
const R = 1.05; // radio interno del frasco
const H = 2.6; // altura del frasco

function Coins({ count, palette }: { count: number; palette: Palette }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const reduced = usePrefersReducedMotion();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Posición final de cada moneda: espiral apilada con algo de desorden.
  const slots = useMemo(
    () =>
      Array.from({ length: MAX }, (_, i) => {
        const layer = Math.floor(i / 7);
        const a = i * 2.39996 + layer * 0.7;
        const rad = i % 7 === 0 ? 0 : 0.28 + ((i * 53) % 10) / 22;
        return {
          x: Math.cos(a) * Math.min(rad, R - 0.32),
          z: Math.sin(a) * Math.min(rad, R - 0.32),
          y: -H / 2 + 0.08 + layer * 0.115,
          rx: (((i * 31) % 10) - 5) * 0.06,
          rz: (((i * 17) % 10) - 5) * 0.06,
        };
      }),
    [],
  );
  const ys = useRef<number[]>(Array.from({ length: MAX }, () => H + 1));

  useEffect(() => {
    if (reduced) ys.current = slots.map((s) => s.y);
  }, [reduced, slots]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < MAX; i++) {
      const s = slots[i];
      const visible = i < count;
      const target = visible ? s.y : H + 1;
      // Caen una tras otra
      const ready = i === 0 || ys.current[i - 1] < H * 0.4 || !visible;
      if (ready) ys.current[i] += (target - ys.current[i]) * Math.min(1, dt * (visible ? 7 : 3));
      dummy.position.set(s.x, ys.current[i], s.z);
      dummy.rotation.set(s.rx, i, s.rz);
      dummy.scale.setScalar(visible || ys.current[i] < H ? 1 : 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} frustumCulled={false}>
      <cylinderGeometry args={[0.3, 0.3, 0.09, 32]} />
      <meshStandardMaterial color={palette.accent} metalness={0.9} roughness={0.25} />
    </instancedMesh>
  );
}

function JarModel({ progress, palette }: { progress: number; palette: Palette }) {
  const group = useRef<THREE.Group>(null);
  const reduced = usePrefersReducedMotion();
  useFrame(({ clock, pointer }) => {
    if (!group.current || reduced) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.25 + pointer.x * 0.3;
  });
  const count = Math.round(Math.min(1, Math.max(0, progress)) * MAX);
  return (
    <group ref={group} rotation={[0.12, 0, 0]}>
      <Coins count={count} palette={palette} />
      {/* vidrio */}
      <mesh>
        <cylinderGeometry args={[R + 0.06, R + 0.12, H, 64, 1, true]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.16} roughness={0.05} metalness={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, -H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R + 0.12, 64]} />
        <meshPhysicalMaterial color="#dfefff" transparent opacity={0.25} roughness={0.1} />
      </mesh>
      {/* boca y tapa */}
      <mesh position={[0, H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R + 0.07, 0.06, 16, 64]} />
        <meshStandardMaterial color="#cfe6f5" transparent opacity={0.6} roughness={0.1} />
      </mesh>
      <mesh position={[0, H / 2 + 0.18, 0]}>
        <cylinderGeometry args={[R + 0.12, R + 0.12, 0.22, 64]} />
        <meshStandardMaterial color={palette.primary} roughness={0.4} />
      </mesh>
      <mesh position={[0, H / 2 + 0.3, 0]}>
        <boxGeometry args={[0.7, 0.04, 0.12]} />
        <meshStandardMaterial color="#1b0f06" />
      </mesh>
      {/* línea de meta */}
      <mesh position={[0, -H / 2 + 0.08 + Math.floor(MAX / 7) * 0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R + 0.13, 0.015, 8, 64]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/** Alcancía 3D: se llena de monedas según el progreso (0 a 1). */
export default function Jar3D({ progress, palette, className }: { progress: number; palette: Palette; className?: string }) {
  return (
    <Canvas3D className={className} camera={{ position: [0, 0.6, 6.6], fov: 40 }} label={`Alcancía al ${Math.round(progress * 100)}%`}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={2} />
      <pointLight position={[-2, 0, 3]} intensity={6} color={palette.accent} />
      <JarModel progress={progress} palette={palette} />
    </Canvas3D>
  );
}
