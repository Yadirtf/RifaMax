"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  computeReverseAction,
  prepareRouletteAction,
  recordLotteryAction,
  resetDrawAction,
  spinRouletteAction,
  type ActionState,
} from "@/app/admin/actions";
import Wheel from "@/components/Wheel";

export interface DrawView {
  status: "committed" | "done" | "void";
  seedHash: string | null;
  note: string;
  winningLabel: string | null;
  winnerName: string | null;
  spun: boolean;
}

interface Props {
  raffleId: number;
  prizeId: number;
  title: string;
  method: "lottery" | "roulette" | "reverse";
  methodLabel: string;
  value: string;
  draw: DrawView | null;
  /** Números que entrarían a la ruleta ahora mismo. */
  candidates: number[];
  labelOf: Record<number, string>;
  /** Variables CSS del tema de la rifa, para pintar la ruleta. */
  colors: React.CSSProperties;
}

export default function DrawControls(p: Props) {
  const router = useRouter();
  const [lotteryState, lotteryAction, lotteryPending] = useActionState<ActionState | null, FormData>(recordLotteryAction, null);
  const [spin, setSpin] = useState<{ labels: string[]; index: number; winner: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showWheel, setShowWheel] = useState(false);

  const hidden = (
    <>
      <input type="hidden" name="raffleId" value={p.raffleId} />
      <input type="hidden" name="prizeId" value={p.prizeId} />
    </>
  );

  async function doSpin() {
    const fd = new FormData();
    fd.set("raffleId", String(p.raffleId));
    fd.set("prizeId", String(p.prizeId));
    setSpinning(true);
    setMessage(null);
    const r = await spinRouletteAction(fd);
    if (!r.ok || r.index === undefined || !r.eligible) {
      setSpinning(false);
      setMessage(r.message);
      router.refresh();
      return;
    }
    setShowWheel(true);
    setSpin({ labels: r.eligible.map((n) => p.labelOf[n]), index: r.index, winner: p.labelOf[r.number!] });
  }

  const canRoulette = p.draw?.status === "committed";
  const wheelLabels = spin?.labels ?? p.candidates.map((n) => p.labelOf[n]);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">{p.title}</h3>
        <span className="text-sm font-semibold text-slate-600">{p.value}</span>
      </div>
      <p className="text-xs text-slate-500">{p.methodLabel}</p>

      {p.draw?.note && <p className="mt-2 rounded bg-slate-50 p-2 text-sm">{p.draw.note}</p>}
      {p.draw?.status === "done" && p.draw.winningLabel && (
        <p className="mt-2 text-lg">
          Ganador: <b className="font-mono">{p.draw.winningLabel}</b> {p.draw.winnerName && `· ${p.draw.winnerName}`}
        </p>
      )}

      <div className="mt-3 space-y-3">
        {p.method === "lottery" && p.draw?.status !== "done" && !canRoulette && (
          <form action={lotteryAction} className="flex flex-wrap items-center gap-2">
            {hidden}
            <input name="result" required placeholder="Resultado, ej. 4837" inputMode="numeric" className="w-44 rounded border px-2 py-1.5 text-sm" />
            <button disabled={lotteryPending} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
              Registrar resultado
            </button>
            {lotteryState && <span className={`text-xs ${lotteryState.ok ? "text-green-700" : "text-red-600"}`}>{lotteryState.message}</span>}
          </form>
        )}

        {p.method === "reverse" && !p.draw && (
          <form action={computeReverseAction}>
            {hidden}
            <button className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">Calcular número invertido</button>
          </form>
        )}

        {p.method === "roulette" && !p.draw && (
          <form action={prepareRouletteAction} className="flex flex-wrap items-center gap-2">
            {hidden}
            <button className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">Preparar ruleta (publicar hash)</button>
            <span className="text-xs text-slate-500">{p.candidates.length} números elegibles ahora</span>
          </form>
        )}

        {canRoulette && (
          <div className="space-y-2">
            <p className="break-all text-xs text-slate-500">
              Hash publicado: <span className="font-mono">{p.draw?.seedHash}</span>
            </p>
            <p className="text-xs text-slate-500">{p.candidates.length} números elegibles. Comparte pantalla y gira en vivo.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowWheel((s) => !s)} className="rounded border px-3 py-1.5 text-sm">
                {showWheel ? "Ocultar ruleta" : "Mostrar ruleta"}
              </button>
              <button
                type="button"
                disabled={spinning || p.candidates.length === 0}
                onClick={doSpin}
                className="rounded bg-red-600 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {spinning ? "Girando…" : "¡Girar!"}
              </button>
            </div>
          </div>
        )}

        {(showWheel || spin) && (
          <div className="rounded-xl bg-[var(--bg)] p-4" style={p.colors}>
            <Wheel
              labels={wheelLabels}
              targetIndex={spin?.index ?? null}
              size={360}
              onDone={() => {
                setSpinning(false);
                setMessage(spin ? `¡Gana el ${spin.winner}!` : null);
                router.refresh();
              }}
            />
            {message && <p className="pop mt-3 text-center text-2xl font-black text-[var(--accent)]">{message}</p>}
          </div>
        )}
        {message && !spin && <p className="text-sm text-red-600">{message}</p>}

        {p.draw && !(p.draw.status === "done" && p.draw.spun) && !spinning && (
          <form
            action={resetDrawAction}
            onSubmit={(e) => {
              if (!confirm("¿Deshacer este sorteo? Si la ruleta ya tenía hash publicado, se generará uno nuevo.")) e.preventDefault();
            }}
          >
            {hidden}
            <button className="text-xs text-slate-500 underline">Deshacer / corregir</button>
          </form>
        )}
      </div>
    </div>
  );
}
