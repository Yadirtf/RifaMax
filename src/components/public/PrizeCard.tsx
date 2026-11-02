"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, CircleDot, ExternalLink, Gift, Repeat2, ShieldCheck, Ticket, Trophy, Undo2, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Balls3D, Wheel3D } from "@/components/three/lazy";
import type { Palette } from "@/components/three/shapes";
import { formatClock, pad2, splitDuration, useNow } from "@/components/useNow";
import { verifyRoulette, type VerifyOutcome } from "@/components/verify";
import { roundUrl } from "@/lib/drand";
import { digitsFor, formatCOP, formatDate, formatNumber } from "@/lib/raffle";
import type { PublicPrize } from "@/lib/view";

const KIND_ICON = { cash: Wallet, item: Gift, refund: Undo2 } as const;
const METHOD_ICON = { lottery: Ticket, roulette: CircleDot, reverse: Repeat2 } as const;

interface Props {
  prize: PublicPrize;
  numberCount: number;
  palette: Palette;
}

export default function PrizeCard({ prize, numberCount, palette }: Props) {
  const d = prize.draw;
  const Kind = KIND_ICON[prize.kind];
  const Method = METHOD_ICON[prize.method];
  const done = d?.status === "done";

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
      className={`glass relative overflow-hidden rounded-[26px] p-5 sm:p-6 ${done ? "ring-1 ring-[var(--accent)]/60" : ""}`}
    >
      {prize.position === 1 && <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--accent)]/15 blur-3xl" aria-hidden />}
      <div className="flex items-start gap-4">
        <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] shadow-lg">
          <Kind className="size-7 text-white" aria-hidden />
          <span className="num absolute -left-2 -top-2 flex size-7 items-center justify-center rounded-full bg-[var(--accent)] font-display text-sm font-black text-[#2a1a00] shadow">
            {prize.position}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-display text-xl font-extrabold leading-tight">{prize.title}</h3>
            <p className="num gold-text font-display text-2xl font-black">
              {prize.kind === "item" ? "≈ " : ""}
              {formatCOP(prize.value)}
            </p>
          </div>
          {prize.description && <p className="mt-1.5 text-pretty text-sm text-[var(--ink)]/75">{prize.description}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <Tag icon={<Method className="size-3.5" aria-hidden />}>{prize.howLabel}</Tag>
            <Tag>{formatDate(prize.drawDate)}</Tag>
            {prize.paidBefore && <Tag>Pagados hasta el {formatDate(prize.paidBefore)}</Tag>}
          </div>
        </div>
      </div>

      {d && (
        <div className="mt-5 space-y-4">
          {d.lottery && (
            <LotteryResultView lottery={d.lottery} numberCount={numberCount} palette={palette} lotteryName={prize.lotteryName} />
          )}
          {d.note && <p className="rounded-2xl bg-black/25 px-4 py-3 text-sm text-[var(--ink)]/85">{d.note}</p>}
          {d.roulette && <RouletteView prize={prize} palette={palette} numberCount={numberCount} />}
          {done && d.winnerLabel && !d.roulette && <Winner label={d.winnerLabel} name={d.winnerName} />}
        </div>
      )}
    </motion.article>
  );
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 text-[var(--ink)]/80 ring-1 ring-white/10">{icon}{children}</span>;
}

function Winner({ label, name }: { label: string; name?: string }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[var(--accent)]/25 to-transparent p-4 ring-1 ring-[var(--accent)]/40"
    >
      <div className="btn-gold num flex size-16 shrink-0 items-center justify-center rounded-full font-display text-3xl font-black">{label}</div>
      <div>
        <p className="flex items-center gap-1.5 font-display text-lg font-extrabold">
          <Trophy className="size-5 text-[var(--accent)]" aria-hidden /> ¡Ganó el {label}!
        </p>
        {name && <p className="text-sm text-[var(--ink)]/75">Felicitaciones, {name}.</p>}
      </div>
    </motion.div>
  );
}

function LotteryResultView({
  lottery,
  numberCount,
  palette,
  lotteryName,
}: {
  lottery: NonNullable<NonNullable<PublicPrize["draw"]>["lottery"]>;
  numberCount: number;
  palette: Palette;
  lotteryName?: string;
}) {
  return (
    <div className="rounded-2xl bg-black/25 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ink)]/60">
        Resultado {lotteryName ?? "de la lotería"}
        {lottery.drawNumber ? ` · sorteo ${lottery.drawNumber}` : ""}
      </p>
      <Balls3D digits={lottery.number} highlightLast={digitsFor(numberCount)} palette={palette} className="h-36 w-full sm:h-44" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-[var(--ink)]/80">
          Juegan las últimas {digitsFor(numberCount)} cifras:{" "}
          <b className="num gold-text font-display text-lg">{lottery.number.slice(-digitsFor(numberCount))}</b>
          {lottery.serie ? <span className="text-[var(--ink)]/60"> · serie {lottery.serie}</span> : null}
        </p>
        <a href={lottery.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold ring-1 ring-white/15 hover:bg-white/10">
          {lottery.source === "official" ? <BadgeCheck className="size-4 text-[var(--secondary)]" aria-hidden /> : null}
          Ver en la página oficial <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

/** Ruleta en vivo: cuenta regresiva hasta la ronda de drand, giro hasta el ganador y verificación. */
function RouletteView({ prize, palette, numberCount }: { prize: PublicPrize; palette: Palette; numberCount: number }) {
  const d = prize.draw!;
  const r = d.roulette!;
  const now = useNow(250);
  const msLeft = now ? Date.parse(r.roundTime) - now : Infinity;
  const sorted = [...r.eligible].sort((a, b) => a - b);
  const sortedLabels = sorted.map((n) => formatNumber(n, numberCount));
  const winnerIdx = d.winningNumber !== undefined ? sorted.indexOf(d.winningNumber) : null;
  const [spinKey, setSpinKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Si el resultado llega mientras miran la página, la ruleta gira en vivo.
  const sawPending = useRef(d.status === "scheduled");
  const [showWheel, setShowWheel] = useState(d.status === "scheduled");
  useEffect(() => {
    if (d.status === "done" && sawPending.current) {
      setShowWheel(true);
      setSpinKey((k) => k + 1);
    }
  }, [d.status]);

  const t = splitDuration(msLeft);

  return (
    <div className="space-y-3">
      {d.status === "scheduled" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--primary)]/15 p-4 ring-1 ring-[var(--primary)]/40">
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-extrabold">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--primary)] opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-[var(--primary)]" />
              </span>
              {msLeft > 0 ? "Ruleta programada" : "Esperando a drand…"}
            </p>
            <p className="text-sm text-[var(--ink)]/75">
              Gira con la ronda <b className="num">{r.round}</b> de drand, a las <b>{formatClock(r.roundTime)}</b>. {r.eligible.length} números participan.
            </p>
          </div>
          {msLeft > 0 && (
            <p className="num font-display text-3xl font-black" aria-live="polite">
              {t.d > 0 ? `${t.d}d ` : ""}
              {pad2(t.h)}:{pad2(t.m)}:{pad2(t.s)}
            </p>
          )}
        </div>
      )}

      {(showWheel || d.status === "scheduled") && (
        <Wheel3D
          labels={sortedLabels}
          palette={palette}
          targetIndex={d.status === "done" ? winnerIdx : null}
          spinKey={spinKey}
          onDone={() => setRevealed(true)}
          className="mx-auto aspect-square w-full max-w-[420px]"
        />
      )}

      {d.status === "done" && d.winnerLabel && (revealed || !showWheel) && <Winner label={d.winnerLabel} name={d.winnerName} />}

      {d.status === "done" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowWheel(true);
              setRevealed(false);
              setSpinKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/10"
          >
            <CircleDot className="size-4" aria-hidden /> Ver el giro
          </button>
          <VerifyButton prize={prize} />
        </div>
      )}
    </div>
  );
}

function VerifyButton({ prize }: { prize: PublicPrize }) {
  const d = prize.draw!;
  const r = d.roulette!;
  const [out, setOut] = useState<VerifyOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setOut(await verifyRoulette(r, d.winningNumber!));
          setBusy(false);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--secondary)]/20 px-3 py-2 text-sm font-semibold ring-1 ring-[var(--secondary)]/50 hover:bg-[var(--secondary)]/30"
      >
        <ShieldCheck className="size-4" aria-hidden /> {busy ? "Verificando…" : "Verificar yo mismo"}
      </button>
      <a
        href={roundUrl(r.round)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/10"
      >
        Ronda {r.round} en drand <ExternalLink className="size-3.5" aria-hidden />
      </a>
      <AnimatePresence>
        {out && (
          <motion.ol
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="w-full space-y-1.5 rounded-2xl bg-black/25 p-4 text-sm"
          >
            {out.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={s.ok ? "text-emerald-300" : "text-red-300"}>{s.ok ? "✓" : "✗"}</span>
                <span>
                  {s.label}
                  {s.detail && <span className="num ml-1 text-[var(--ink)]/55">({s.detail})</span>}
                </span>
              </li>
            ))}
            <li className={`pt-1 font-semibold ${out.ok ? "text-emerald-300" : "text-red-300"}`}>
              {out.ok ? "Resultado verificado de forma independiente." : "No se pudo verificar todo. Revisa el enlace oficial."}
            </li>
          </motion.ol>
        )}
      </AnimatePresence>
    </>
  );
}
