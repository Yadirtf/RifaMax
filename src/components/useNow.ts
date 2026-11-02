"use client";

import { useEffect, useState } from "react";

/**
 * Hora actual que se actualiza cada `ms` (para cuentas regresivas).
 * Devuelve 0 hasta montar en el navegador, para que el HTML del servidor coincida.
 */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function splitDuration(msLeft: number) {
  const s = Number.isFinite(msLeft) ? Math.max(0, Math.floor(msLeft / 1000)) : 0;
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/Bogota" }).format(new Date(iso));
}
