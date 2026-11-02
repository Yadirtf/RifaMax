"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useState, type ReactNode } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Entorno de reflejos generado localmente (sin descargar HDRs). */
function StudioEnvironment({ intensity = 0.9 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

interface Props {
  children: ReactNode;
  className?: string;
  camera?: { position: [number, number, number]; fov?: number };
  /** Lo que se muestra si el dispositivo no tiene WebGL. */
  fallback?: ReactNode;
  envIntensity?: number;
  label: string;
}

/** Lienzo 3D con valores sensatos para móvil: dpr limitado, antialias y fondo transparente. */
export default function Canvas3D({ children, className, camera, fallback = null, envIntensity, label }: Props) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(hasWebGL()), []);
  if (ok === false) return <>{fallback}</>;
  if (ok === null) return <div className={className} aria-hidden />;
  return (
    <div className={className} role="img" aria-label={label}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: camera?.position ?? [0, 0, 8], fov: camera?.fov ?? 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <StudioEnvironment intensity={envIntensity} />
        {children}
      </Canvas>
    </div>
  );
}
