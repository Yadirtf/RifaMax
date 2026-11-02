"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Recarga los datos del servidor. Si hay una ruleta a punto de girar,
 * consulta cada 3 segundos para mostrar el resultado en vivo.
 */
export default function AutoRefresh({ nextRoundAt }: { nextRoundAt: string | null }) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const left = nextRoundAt ? Date.parse(nextRoundAt) - Date.now() : Infinity;
      const every = left < 120_000 ? 3000 : left < 15 * 60_000 ? 10_000 : 30_000;
      timer = setTimeout(() => {
        if (document.visibilityState === "visible") router.refresh();
        tick();
      }, every);
    };
    tick();
    return () => clearTimeout(timer);
  }, [router, nextRoundAt]);
  return null;
}
