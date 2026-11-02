"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarga los datos del servidor cada cierto tiempo (tablero y resultados en vivo). */
export default function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
