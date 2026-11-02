"use client";

import { Logo, LogoMark } from "@/components/Logo";
import { BRAND } from "@/lib/brand";
import { motion } from "motion/react";
import { Radio } from "lucide-react";
import Link from "next/link";
import type { Palette } from "@/components/three/shapes";
import { formatClock, useNow } from "@/components/useNow";
import type { Theme } from "@/lib/themes";
import { formatCOP, formatDate } from "@/lib/raffle";
import type { PublicView } from "@/lib/view";
import AutoRefresh from "./AutoRefresh";
import Hero from "./Hero";
import MyNumbers from "./MyNumbers";
import NumberBoard from "./NumberBoard";
import PrizeCard from "./PrizeCard";
import Rules from "./Rules";

interface Props {
  view: PublicView;
  theme: Theme;
  open: boolean;
}

const NAV = [
  ["#numeros", "Números"],
  ["#premios", "Premios"],
  ["#reglas", "Reglas"],
  ["#mis-numeros", "Mis números"],
] as const;

export default function RaffleView({ view, theme, open }: Props) {
  const { raffle, cells, prizes, stats } = view;
  const palette: Palette = { primary: theme.primary, secondary: theme.secondary, accent: theme.accent, ink: theme.ink };
  const pending = prizes
    .map((p) => p.draw)
    .filter((d) => d?.status === "scheduled" && d.roulette)
    .map((d) => d!.roulette!.roundTime)
    .sort();
  const nextRoundAt = pending[0] ?? null;
  const now = useNow(15_000);
  const live = now ? prizes.find((p) => p.draw?.status === "scheduled" && p.draw.roulette && Date.parse(p.draw.roulette.roundTime) - now < 30 * 60_000) : undefined;
  const pctTaken = stats.taken / raffle.numberCount;

  return (
    <main>
      <AutoRefresh nextRoundAt={nextRoundAt} />
      <Hero
        name={raffle.name}
        tagline={theme.tagline}
        emoji={theme.emoji}
        price={raffle.price}
        prizesTotal={stats.prizesTotal}
        prizeCount={prizes.length}
        left={stats.free}
        drawAt={`${raffle.drawDate}T22:30:00-05:00`}
        shapes={theme.shapes}
        palette={palette}
      />

      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[var(--bg)]/75 backdrop-blur-xl" aria-label="Secciones">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
          <Link href="/" className="mr-2 shrink-0" aria-label={BRAND.name}>
            <LogoMark size={34} />
          </Link>
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold text-[var(--ink)]/80 hover:bg-white/10 hover:text-[var(--ink)]">
              {label}
            </a>
          ))}
        </div>
      </nav>

      {live && (
        <motion.a
          href="#premios"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-[52px] z-30 mx-auto flex max-w-6xl items-center justify-center gap-2 bg-[var(--primary)] px-4 py-2.5 text-center text-sm font-bold text-white shadow-lg sm:rounded-b-2xl"
        >
          <Radio className="size-4 animate-pulse" aria-hidden />
          En vivo: la ruleta del {live.title.toLowerCase()} gira a las {formatClock(live.draw!.roulette!.roundTime)}. ¡Mírala aquí!
        </motion.a>
      )}

      <div className="mx-auto max-w-6xl space-y-20 px-4 pb-24 pt-10 sm:px-6">
        <section id="numeros" aria-labelledby="numeros-t" className="scroll-mt-20">
          <SectionTitle id="numeros-t" kicker="Paso 1" title="Elige tu número" text="Toca un número libre para apartarlo. Lo pagas por abonos." />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="glass rounded-[26px] p-3 sm:p-5">
          {!open && <p className="glass mb-4 rounded-2xl p-4 text-sm">La venta de números está cerrada.</p>}
              <NumberBoard
                slug={raffle.slug}
                raffleName={raffle.name}
                cells={cells}
                price={raffle.price}
                minDeposit={raffle.minDeposit}
                paymentDeadline={raffle.paymentDeadline}
                paymentInfo={raffle.paymentInfo}
                organizerPhone={raffle.organizerPhone}
                open={open}
              />
            </div>
            <aside className="space-y-4 lg:sticky lg:top-20">
        <section aria-labelledby="progreso" className="glass rounded-[26px] p-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h2 id="progreso" className="font-display text-lg font-bold">
                    <span className="num gold-text text-3xl font-black">{stats.taken}</span> de {raffle.numberCount} ya tienen dueño
                  </h2>
                  <p className="text-sm text-[var(--ink)]/65">
                    {stats.paid} pagados · {stats.partial} abonando · {stats.reserved} apartados
                  </p>
                </div>
                <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-valuenow={Math.round(pctTaken * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pctTaken * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="relative h-full rounded-full bg-gradient-to-r from-[var(--secondary)] via-[var(--accent)] to-[var(--primary)]"
                  >
                    <div className="shimmer absolute inset-0" />
                  </motion.div>
                </div>
                {stats.free > 0 && stats.free <= raffle.numberCount * 0.25 && (
                  <p className="mt-3 text-sm font-semibold text-[var(--accent)]">¡Solo quedan {stats.free}! Cuando se acaben, se acaban.</p>
                )}
              </section>

              <div className="glass rounded-[26px] p-5 text-sm">
                <h3 className="font-display text-lg font-extrabold">Así pagas</h3>
                <ol className="mt-3 space-y-3">
                  <li className="flex gap-3"><span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-black text-[#2a1a00]">1</span>Aparta con tu nombre y WhatsApp.</li>
                  <li className="flex gap-3"><span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-black text-[#2a1a00]">2</span>Abona desde {formatCOP(raffle.minDeposit)} cuando puedas.</li>
                  <li className="flex gap-3"><span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-black text-[#2a1a00]">3</span>Completa {formatCOP(raffle.price)} antes del {formatDate(raffle.paymentDeadline)}.</li>
                </ol>
                {raffle.paymentInfo && <p className="mt-4 rounded-2xl bg-black/25 p-3 text-[var(--ink)]/85">{raffle.paymentInfo}</p>}
              </div>
            </aside>
          </div>
        </section>

        <section id="premios" aria-labelledby="premios-t" className="scroll-mt-20">
          <SectionTitle id="premios-t" kicker={`${prizes.length} formas de ganar`} title="Premios" text="Lotería oficial, ruleta en vivo y segundas oportunidades." />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {prizes.map((p) => (
              <PrizeCard key={p.id} prize={p} numberCount={raffle.numberCount} palette={palette} />
            ))}
          </div>
        </section>

        <section id="reglas" aria-labelledby="reglas-t" className="scroll-mt-20">
          <SectionTitle id="reglas-t" kicker="Sin letra pequeña" title="Cómo se juega" text="Reglas claras antes de poner un peso." />
          <Rules price={raffle.price} minDeposit={raffle.minDeposit} paymentDeadline={raffle.paymentDeadline} numberCount={raffle.numberCount} prizes={prizes} />
        </section>

        <section id="mis-numeros" aria-labelledby="mis-t" className="scroll-mt-20">
          <SectionTitle id="mis-t" kicker="Tu cuenta" title="Mis números" text="Consulta cuánto llevas abonado con el WhatsApp con que apartaste." />
          <MyNumbers slug={raffle.slug} />
        </section>
      </div>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-[var(--ink)]/45">
        <Logo size={28} className="justify-center text-sm text-[var(--ink)]/80" />
        <p className="mt-3">Resultados verificables con la lotería oficial y drand.</p>
      </footer>
    </main>
  );
}

function SectionTitle({ id, kicker, title, text }: { id: string; kicker: string; title: string; text: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">{kicker}</p>
      <h2 id={id} className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {title}
      </h2>
      <p className="mt-2 max-w-xl text-[var(--ink)]/70">{text}</p>
    </div>
  );
}
