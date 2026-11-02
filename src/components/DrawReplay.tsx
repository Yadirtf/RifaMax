"use client";

import { useState } from "react";
import Wheel from "./Wheel";
import { verifyDraw } from "@/lib/raffle";

interface Props {
  eligible: number[];
  labels: string[];
  winningNumber: number;
  seed: string;
  seedHash: string;
}

/** Para el público: repetir el giro y verificar la ruleta en el navegador. */
export default function DrawReplay({ eligible, labels, winningNumber, seed, seedHash }: Props) {
  const [show, setShow] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [verified, setVerified] = useState<boolean | null>(null);
  const index = eligible.indexOf(winningNumber);

  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-white/10 px-3 py-1.5"
          onClick={() => {
            setShow(true);
            setSpinKey((k) => k + 1);
          }}
        >
          Ver el giro
        </button>
        <button
          className="rounded-lg bg-white/10 px-3 py-1.5"
          onClick={async () => setVerified(await verifyDraw(seed, seedHash, eligible, winningNumber))}
        >
          Verificar resultado
        </button>
        {verified !== null && (
          <span className={verified ? "text-green-300" : "text-red-300"}>
            {verified ? "Verificado: la semilla coincide y el ganador es correcto." : "No coincide."}
          </span>
        )}
      </div>
      {show && (
        <div className="pt-2">
          <Wheel labels={labels} targetIndex={index} spinKey={spinKey} size={300} durationMs={4500} />
        </div>
      )}
      <details className="text-xs text-white/60">
        <summary className="cursor-pointer">¿Cómo se verifica?</summary>
        <p className="mt-1">
          Antes de girar se publicó el hash SHA-256 de una semilla secreta. Al girar se revela la semilla. El ganador es SHA-256(semilla + &quot;|&quot; +
          números elegibles separados por coma) módulo la cantidad de elegibles. Nadie pudo cambiar la semilla después de publicar el hash.
        </p>
        <p className="mt-1 break-all font-mono">semilla: {seed}</p>
        <p className="break-all font-mono">hash: {seedHash}</p>
        <p className="break-all font-mono">elegibles ({eligible.length}): {labels.join(", ")}</p>
      </details>
    </div>
  );
}
