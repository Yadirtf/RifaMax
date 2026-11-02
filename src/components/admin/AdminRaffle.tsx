"use client";

import { motion } from "motion/react";
import { CircleDot, LayoutDashboard, MessageCircle, Settings, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { Jar3D } from "@/components/three/lazy";
import type { Palette } from "@/components/three/shapes";
import { ToastProvider } from "@/components/ui";
import { formatCOP, formatNumber, ticketState, whatsappLink } from "@/lib/raffle";
import type { Raffle, Ticket as TicketT } from "@/lib/types";
import DrawsPanel from "./DrawsPanel";
import SettingsPanel from "./SettingsPanel";
import TicketsPanel from "./TicketsPanel";

export interface PrizeMeta {
  howLabel: string;
  candidates: number[];
  canSchedule: boolean;
  automaticLottery: boolean;
}

export interface AdminProps {
  raffle: Raffle;
  tickets: TicketT[];
  publicUrl: string;
  palette: Palette;
  prizeMeta: Record<string, PrizeMeta>;
  simulated: boolean;
}

const TABS = [
  { key: "resumen", label: "Resumen", icon: LayoutDashboard },
  { key: "numeros", label: "Números", icon: Ticket },
  { key: "sorteos", label: "Sorteos", icon: CircleDot },
  { key: "ajustes", label: "Ajustes", icon: Settings },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default function AdminRaffle(props: AdminProps) {
  const [tab, setTab] = useState<Tab>("resumen");
  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab;
    if (TABS.some((t) => t.key === h)) setTab(h);
  }, []);
  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  return (
    <ToastProvider>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-black/25 p-1 [scrollbar-width:none]" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => go(t.key)}
            className="relative flex flex-1 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
          >
            {tab === t.key && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-[var(--ink)]" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <t.icon className={`relative size-4 ${tab === t.key ? "text-[var(--bg)]" : ""}`} aria-hidden />
            <span className={`relative ${tab === t.key ? "text-[var(--bg)]" : "text-[var(--ink)]/75"}`}>{t.label}</span>
          </button>
        ))}
      </div>
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === "resumen" && <Overview {...props} onGo={go} />}
        {tab === "numeros" && <TicketsPanel {...props} />}
        {tab === "sorteos" && <DrawsPanel {...props} />}
        {tab === "ajustes" && <SettingsPanel {...props} />}
      </motion.div>
    </ToastProvider>
  );
}

function Overview({ raffle, tickets, palette, onGo }: AdminProps & { onGo: (t: Tab) => void }) {
  const collected = tickets.reduce((s, t) => s + t.paidAmount, 0);
  const owed = tickets.reduce((s, t) => s + Math.max(0, raffle.price - t.paidAmount), 0);
  const prizes = raffle.prizes.reduce((s, p) => s + p.value, 0);
  const goal = raffle.goal && raffle.goal > 0 ? raffle.goal + prizes : raffle.numberCount * raffle.price;
  const paidCount = tickets.filter((t) => ticketState(t, raffle.price) === "paid").length;
  const progress = Math.min(1, collected / goal);
  const debtors = tickets
    .filter((t) => t.paidAmount < raffle.price)
    .sort((a, b) => b.paidAmount - a.paidAmount)
    .slice(0, 6);
  const recent = tickets
    .flatMap((t) => t.payments.map((p) => ({ ...p, number: t.number, name: t.player.name })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
  const fmtTime = (iso: string) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(iso));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="glass relative overflow-hidden rounded-[28px] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Alcancía</p>
        <p className="num mt-1 font-display text-4xl font-black">{formatCOP(collected)}</p>
        <p className="text-sm text-[var(--ink)]/65">
          de {formatCOP(goal)} {raffle.goal ? "(premios + tu meta)" : "(todos los números)"} · {Math.round(progress * 100)}%
        </p>
        <Jar3D progress={progress} palette={palette} className="mx-auto h-72 w-full max-w-sm sm:h-80" />
      </section>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Por cobrar" value={formatCOP(owed)} />
          <Kpi label="Pagados" value={`${paidCount}/${raffle.numberCount}`} />
          <Kpi label="Apartados" value={String(tickets.length - paidCount)} />
          <Kpi label="Utilidad si se venden todos" value={formatCOP(raffle.numberCount * raffle.price - prizes)} />
        </div>

        <section className="glass rounded-[24px] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold">Quién debe</h2>
            <button onClick={() => onGo("numeros")} className="text-sm font-semibold text-[var(--accent)]">
              Ver todos
            </button>
          </div>
          {debtors.length === 0 ? (
            <p className="text-sm text-[var(--ink)]/60">Nadie debe. 🎉</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {debtors.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="num flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display font-black">{formatNumber(t.number, raffle.numberCount)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.player.name}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(t.paidAmount / raffle.price) * 100}%` }} />
                    </div>
                  </div>
                  <span className="num text-sm text-[var(--ink)]/70">{formatCOP(raffle.price - t.paidAmount)}</span>
                  {t.player.phone && (
                    <a
                      href={whatsappLink(t.player.phone, `Hola ${t.player.name.split(" ")[0]}, te faltan ${formatCOP(raffle.price - t.paidAmount)} para el ${formatNumber(t.number, raffle.numberCount)} de la ${raffle.name}.`)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Escribir a ${t.player.name}`}
                      className="rounded-lg bg-[#25D366] p-2 text-[#04260f]"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass rounded-[24px] p-5">
          <h2 className="mb-3 font-display text-lg font-extrabold">Últimos abonos</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--ink)]/60">Aún no hay abonos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="truncate">
                    <b className="num">{formatNumber(p.number, raffle.numberCount)}</b> · {p.name} <span className="text-[var(--ink)]/50">· {p.method}</span>
                  </span>
                  <span className="num shrink-0 text-[var(--ink)]/70">
                    {formatCOP(p.amount)} · {fmtTime(p.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-[var(--ink)]/60">{label}</p>
      <p className="num mt-1 font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}
