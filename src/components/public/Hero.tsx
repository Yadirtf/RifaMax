"use client";

import { motion } from "motion/react";
import { ArrowDown, BookOpen, Sparkles } from "lucide-react";
import { HeroScene } from "@/components/three/lazy";
import { pad2, splitDuration, useNow } from "@/components/useNow";
import { formatCOP } from "@/lib/raffle";
import type { Shape } from "@/lib/themes";
import type { Palette } from "@/components/three/shapes";

interface Props {
  name: string;
  tagline: string;
  emoji: string;
  price: number;
  prizesTotal: number;
  prizeCount: number;
  left: number;
  drawAt: string;
  shapes: Shape[];
  palette: Palette;
}

export default function Hero(p: Props) {
  const now = useNow();
  const t = splitDuration(now ? Date.parse(p.drawAt) - now : 0);
  const over = now > 0 && Date.parse(p.drawAt) <= now;

  return (
    <header className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <HeroScene shapes={p.shapes} palette={p.palette} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-[var(--bg2)]" />

      <div className="mx-auto flex min-h-[86svh] max-w-5xl flex-col items-center justify-center px-5 pb-16 pt-20 text-center sm:min-h-[80vh]">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
        >
          <Sparkles className="size-3.5 text-[var(--accent)]" aria-hidden /> {p.prizeCount} formas de ganar
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 120, damping: 18 }}
          className="mt-5 font-display text-[clamp(2.6rem,9vw,6.2rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-balance"
        >
          {p.name}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4 max-w-xl text-pretty text-base text-[var(--ink)]/80 sm:text-lg">
          {p.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-3"
        >
          <Chip value={formatCOP(p.price)} label="por número" />
          <Chip value={formatCOP(p.prizesTotal)} label="en premios" gold />
          <Chip value={String(p.left)} label={p.left === 1 ? "número libre" : "números libres"} />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6" aria-live="polite">
          {over ? (
            <p className="font-display text-xl font-bold">¡Hoy se juega!</p>
          ) : (
            <div className="flex items-end justify-center gap-2 sm:gap-3" aria-label={`Faltan ${t.d} días, ${t.h} horas y ${t.m} minutos para el sorteo`}>
              {[
                [t.d, "días"],
                [t.h, "horas"],
                [t.m, "min"],
                [t.s, "seg"],
              ].map(([v, l]) => (
                <div key={l as string} className="glass min-w-14 rounded-2xl px-2 py-2 sm:min-w-18">
                  <p className="num font-display text-2xl font-extrabold sm:text-3xl">{now ? pad2(v as number) : "--"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--ink)]/60">{l}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <a href="#numeros" className="btn-gold inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 font-display text-lg font-bold transition active:scale-[0.98]">
            Elegir mi número <ArrowDown className="size-5" aria-hidden />
          </a>
          <a href="#reglas" className="glass inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold transition hover:bg-white/10">
            <BookOpen className="size-5" aria-hidden /> Cómo se juega
          </a>
        </motion.div>
      </div>
    </header>
  );
}

function Chip({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <div className="glass rounded-2xl px-2 py-3 sm:px-4">
      <p className={`num font-display text-lg font-extrabold leading-tight sm:text-2xl ${gold ? "gold-text" : ""}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--ink)]/65 sm:text-xs">{label}</p>
    </div>
  );
}
