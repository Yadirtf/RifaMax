"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, CircleDot, ExternalLink, Maximize2, Minimize2, Repeat2, RotateCcw, Search, Ticket, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  applyLotteryAction,
  applyReverseAction,
  lookupOfficialLottery,
  refreshDraws,
  resetDrawAction,
  scheduleRouletteAction,
  type Result,
} from "@/app/admin/actions";
import { Balls3D, Wheel3D } from "@/components/three/lazy";
import { Field, inputCls, Segmented, useToast } from "@/components/ui";
import { formatClock, pad2, splitDuration, useNow } from "@/components/useNow";
import { roundUrl } from "@/lib/drand";
import { lotteryInfo, type OfficialResult } from "@/lib/lotteries";
import { digitsFor, formatCOP, formatDate, formatNumber } from "@/lib/raffle";
import type { Prize } from "@/lib/types";
import type { AdminProps, PrizeMeta } from "./AdminRaffle";

const METHOD_ICON = { lottery: Ticket, roulette: CircleDot, reverse: Repeat2 } as const;

export default function DrawsPanel(props: AdminProps) {
  const { raffle } = props;
  return (
    <div className="space-y-4">
      {props.simulated && (
        <p className="rounded-2xl bg-amber-400/15 p-4 text-sm text-amber-100 ring-1 ring-amber-300/30">
          Modo desarrollo: drand está simulado porque este equipo no tiene acceso a internet. En producción siempre se usa drand real.
        </p>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {raffle.prizes.map((p) => (
          <DrawStage key={p.id} prize={p} meta={props.prizeMeta[p.id]} {...props} />
        ))}
      </div>
    </div>
  );
}

function useAction() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<Result>, after?: (r: Result) => void) =>
    start(async () => {
      const r = await fn();
      toast(r);
      router.refresh();
      after?.(r);
    });
  return { pending, run };
}

function DrawStage({ prize, meta, raffle, tickets, palette }: AdminProps & { prize: Prize; meta: PrizeMeta }) {
  const d = prize.draw;
  const Icon = METHOD_ICON[prize.method];
  const label = (n: number) => formatNumber(n, raffle.numberCount);
  const winner = d?.winningNumber !== undefined ? tickets.find((t) => t.number === d.winningNumber) : undefined;
  const { pending, run } = useAction();
  const canReset = d && !(d.roulette && Date.parse(d.roulette.roundTime) <= Date.now() + 2000);

  return (
    <section className={`glass rounded-[26px] p-5 ${d?.status === "done" ? "ring-1 ring-[var(--accent)]/50" : ""}`}>
      <header className="flex items-start gap-3">
        <span className="num flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] font-display text-lg font-black">
          {prize.position}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="font-display text-xl font-extrabold">{prize.title}</h3>
            <span className="num gold-text font-display text-xl font-black">{formatCOP(prize.value)}</span>
          </div>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink)]/60">
            <Icon className="size-3.5" aria-hidden /> {meta.howLabel} · {formatDate(prize.drawDate)}
            {prize.paidBefore && ` · pagados hasta el ${formatDate(prize.paidBefore)}`}
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-4">
        {d?.lottery && <Balls3D digits={d.lottery.number} highlightLast={digitsFor(raffle.numberCount)} palette={palette} className="h-36 w-full" />}
        {d?.note && <p className="rounded-2xl bg-black/25 px-4 py-3 text-sm">{d.note}</p>}

        {d?.status === "done" && d.winningNumber !== undefined && !d.roulette && (
          <WinnerBanner label={label(d.winningNumber)} name={winner?.player.name} />
        )}

        {prize.method === "lottery" && !d && <LotteryForm raffleId={raffle.id} prize={prize} automatic={meta.automaticLottery} numberCount={raffle.numberCount} palette={palette} />}

        {prize.method === "reverse" && !d && (
          <button
            disabled={pending}
            onClick={() => run(() => applyReverseAction({ raffleId: raffle.id, prizeId: prize.id }))}
            className="btn-gold w-full rounded-xl py-3 font-bold disabled:opacity-60"
          >
            Calcular número al revés del premio {prize.sourcePosition}
          </button>
        )}

        {meta.canSchedule && <ScheduleForm raffleId={raffle.id} prize={prize} candidates={meta.candidates} label={label} />}

        {d?.roulette && <LiveRoulette raffleId={raffle.id} prize={prize} label={label} palette={palette} winnerName={winner?.player.name} />}

        {canReset && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("¿Deshacer este sorteo? Úsalo solo para corregir un error antes de anunciarlo.")) run(() => resetDrawAction({ raffleId: raffle.id, prizeId: prize.id }));
            }}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--ink)]/55 underline-offset-4 hover:underline"
          >
            <RotateCcw className="size-3.5" aria-hidden /> {d?.roulette ? "Cancelar ruleta (solo antes de la ronda)" : "Deshacer / corregir"}
          </button>
        )}
      </div>
    </section>
  );
}

function WinnerBanner({ label, name }: { label: string; name?: string }) {
  return (
    <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[var(--accent)]/25 to-transparent p-4 ring-1 ring-[var(--accent)]/40">
      <span className="btn-gold num flex size-16 items-center justify-center rounded-full font-display text-3xl font-black">{label}</span>
      <div>
        <p className="flex items-center gap-1.5 font-display text-xl font-extrabold">
          <Trophy className="size-5 text-[var(--accent)]" aria-hidden /> Gana el {label}
        </p>
        {name && <p className="text-sm text-[var(--ink)]/75">{name}</p>}
      </div>
    </motion.div>
  );
}

function LotteryForm({ raffleId, prize, automatic, numberCount, palette }: { raffleId: string; prize: Prize; automatic: boolean; numberCount: number; palette: AdminProps["palette"] }) {
  const info = lotteryInfo(prize.lotteryKey);
  const [mode, setMode] = useState<"official" | "manual">(automatic ? "official" : "manual");
  const [found, setFound] = useState<OfficialResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [serie, setSerie] = useState("");
  const [drawNumber, setDrawNumber] = useState("");
  const { pending, run } = useAction();
  const [looking, startLook] = useTransition();

  return (
    <div className="space-y-3">
      {automatic && (
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "official", label: "Consultar oficial" },
            { value: "manual", label: "Digitar" },
          ]}
        />
      )}
      {mode === "official" ? (
        <div className="space-y-3">
          <button
            disabled={looking}
            onClick={() =>
              startLook(async () => {
                setMsg(null);
                const r = await lookupOfficialLottery({ raffleId, prizeId: prize.id });
                setFound(r.ok && r.result ? r.result : null);
                if (!r.ok) setMsg(r.message);
              })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] py-3 font-bold text-[var(--bg)] disabled:opacity-60"
          >
            <Search className="size-4" aria-hidden /> {looking ? "Consultando…" : `Buscar resultado del ${formatDate(prize.drawDate)}`}
          </button>
          {msg && <p className="rounded-xl bg-black/25 p-3 text-sm text-[var(--ink)]/80">{msg}</p>}
          {found && (
            <div className="rounded-2xl bg-black/25 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-200">
                <BadgeCheck className="size-4" aria-hidden /> {info.name} · sorteo {found.drawNumber} · {formatDate(found.date)}
              </p>
              <Balls3D digits={found.number} highlightLast={digitsFor(numberCount)} palette={palette} className="h-32 w-full" />
              <p className="text-center text-sm">
                Número <b className="num">{found.number}</b>
                {found.serie && (
                  <>
                    {" "}
                    · serie <b className="num">{found.serie}</b>
                  </>
                )}
              </p>
              <button
                disabled={pending}
                onClick={() => run(() => applyLotteryAction({ raffleId, prizeId: prize.id, number: found.number, official: true }))}
                className="btn-gold mt-3 w-full rounded-xl py-3 font-bold disabled:opacity-60"
              >
                Aplicar resultado oficial
              </button>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirm(`¿Aplicar ${number}${serie ? ` serie ${serie}` : ""} como resultado de la ${info.name}?`)) return;
            run(() => applyLotteryAction({ raffleId, prizeId: prize.id, number, serie, drawNumber, official: false }));
          }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          <div className="col-span-2 sm:col-span-1">
            <Field label="Número ganador">
              <input value={number} onChange={(e) => setNumber(e.target.value)} required inputMode="numeric" placeholder="4837" className={`num ${inputCls}`} />
            </Field>
          </div>
          <Field label="Serie">
            <input value={serie} onChange={(e) => setSerie(e.target.value)} inputMode="numeric" placeholder="123" className={`num ${inputCls}`} />
          </Field>
          <Field label="Sorteo n.º">
            <input value={drawNumber} onChange={(e) => setDrawNumber(e.target.value)} inputMode="numeric" placeholder="4866" className={`num ${inputCls}`} />
          </Field>
          <button disabled={pending} className="btn-gold col-span-2 rounded-xl py-3 font-bold disabled:opacity-60 sm:col-span-3">
            Aplicar resultado
          </button>
        </form>
      )}
      <a href={info.resultsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--ink)]/60 hover:underline">
        Página oficial de resultados <ExternalLink className="size-3" aria-hidden />
      </a>
    </div>
  );
}

function ScheduleForm({ raffleId, prize, candidates, label }: { raffleId: string; prize: Prize; candidates: number[]; label: (n: number) => string }) {
  const [when, setWhen] = useState<"30" | "120" | "600" | "exact">("30");
  const [exact, setExact] = useState("");
  const { pending, run } = useAction();
  return (
    <div className="space-y-3 rounded-2xl bg-black/20 p-4">
      <p className="text-sm">
        <b>{candidates.length}</b> números entrarían a la ruleta:
      </p>
      <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
        {candidates.map((n) => (
          <span key={n} className="num rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-bold">
            {label(n)}
          </span>
        ))}
        {candidates.length === 0 && <span className="text-sm text-[var(--ink)]/60">Ninguno todavía (deben estar pagados completos a tiempo).</span>}
      </div>
      <Field label="¿Cuándo gira?" group hint="Al programar se fijan los elegibles y una ronda futura de drand. Nadie puede cambiar el resultado después.">
        <Segmented
          value={when}
          onChange={setWhen}
          options={[
            { value: "30", label: "En 30 s" },
            { value: "120", label: "En 2 min" },
            { value: "600", label: "En 10 min" },
            { value: "exact", label: "Hora exacta" },
          ]}
        />
      </Field>
      {when === "exact" && <input type="datetime-local" value={exact} onChange={(e) => setExact(e.target.value)} className={inputCls} aria-label="Fecha y hora del giro" />}
      <button
        disabled={pending || candidates.length === 0 || (when === "exact" && !exact)}
        onClick={() => {
          const at = when === "exact" ? new Date(exact).toISOString() : new Date(Date.now() + Number(when) * 1000).toISOString();
          if (!confirm(`¿Programar la ruleta del ${prize.title.toLowerCase()} con ${candidates.length} números? Después no se puede cambiar la lista.`)) return;
          run(() => scheduleRouletteAction({ raffleId, prizeId: prize.id, at }));
        }}
        className="btn-gold w-full rounded-xl py-3 font-bold disabled:opacity-50"
      >
        Programar ruleta
      </button>
    </div>
  );
}

/** Escenario de transmisión: cuenta regresiva, giro 3D en vivo y ganador. */
function LiveRoulette({ raffleId, prize, label, palette, winnerName }: { raffleId: string; prize: Prize; label: (n: number) => string; palette: AdminProps["palette"]; winnerName?: string }) {
  const d = prize.draw!;
  const r = d.roulette!;
  const now = useNow(250);
  const left = now ? Date.parse(r.roundTime) - now : Infinity;
  const router = useRouter();
  const sorted = [...r.eligible].sort((a, b) => a - b);
  const labels = sorted.map(label);
  const [spinKey, setSpinKey] = useState(0);
  const [revealed, setRevealed] = useState(d.status === "done");
  const wasPending = useRef(d.status === "scheduled");
  const box = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  // Al llegar la hora, preguntar al servidor hasta que drand publique la ronda.
  useEffect(() => {
    if (d.status !== "scheduled" || left > 0) return;
    const t = setInterval(async () => {
      await refreshDraws({ raffleId });
      router.refresh();
    }, 2500);
    return () => clearInterval(t);
  }, [d.status, left > 0, raffleId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (d.status === "done" && wasPending.current) {
      wasPending.current = false;
      setRevealed(false);
      setSpinKey((k) => k + 1);
    }
  }, [d.status]);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const t = splitDuration(left);
  const target = d.status === "done" && d.winningNumber !== undefined ? sorted.indexOf(d.winningNumber) : null;

  return (
    <div ref={box} className={`relative space-y-3 ${full ? "flex flex-col items-center justify-center bg-[var(--bg)] p-6" : ""}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${full ? "w-full max-w-3xl" : ""}`}>
        <div className="text-sm">
          <p className="font-display text-lg font-extrabold">{full ? prize.title : d.status === "done" ? "Ruleta girada" : "Ruleta programada"}</p>
          <p className="text-[var(--ink)]/65">
            Ronda{" "}
            <a href={roundUrl(r.round)} target="_blank" rel="noreferrer" className="num font-semibold underline-offset-2 hover:underline">
              {r.round}
            </a>{" "}
            de drand · {formatClock(r.roundTime)} · {r.eligible.length} números
          </p>
        </div>
        {d.status === "scheduled" && (
          <p className={`num font-display font-black ${full ? "text-6xl" : "text-3xl"}`} aria-live="polite">
            {left > 0 ? `${t.d > 0 ? `${t.d}d ` : ""}${pad2(t.h)}:${pad2(t.m)}:${pad2(t.s)}` : "Girando…"}
          </p>
        )}
        <button
          type="button"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen())}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/10"
        >
          {full ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />} {full ? "Salir" : "Pantalla completa"}
        </button>
      </div>
      <Wheel3D
        labels={labels}
        palette={palette}
        targetIndex={target}
        spinKey={spinKey}
        onDone={() => setRevealed(true)}
        className={`mx-auto aspect-square w-full ${full ? "max-w-[min(80vh,900px)]" : "max-w-[460px]"}`}
      />
      <AnimatePresence>
        {d.status === "done" && revealed && d.winningNumber !== undefined && (
          <div className={full ? "w-full max-w-3xl" : ""}>
            <WinnerBanner label={label(d.winningNumber)} name={winnerName} />
          </div>
        )}
      </AnimatePresence>
      {d.status === "done" && (
        <button type="button" onClick={() => { setRevealed(false); setSpinKey((k) => k + 1); }} className="text-sm font-semibold text-[var(--accent)]">
          Repetir animación
        </button>
      )}
    </div>
  );
}
