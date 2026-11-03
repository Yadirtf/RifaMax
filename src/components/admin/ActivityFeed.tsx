"use client";

import { Ban, BadgeCheck, Clock, Hand, PinOff, ShieldCheck, Ticket, Unlock, UserPlus, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCOP, formatNumber } from "@/lib/raffle";
import type { Raffle, RaffleEvent, RaffleEventType } from "@/lib/types";

const META: Record<RaffleEventType, { icon: typeof Ticket; cls: string }> = {
  reserved: { icon: Hand, cls: "bg-amber-400/20 text-amber-200" },
  assigned: { icon: UserPlus, cls: "bg-sky-400/20 text-sky-200" },
  payment: { icon: Wallet, cls: "bg-emerald-400/20 text-emerald-200" },
  confirmed: { icon: BadgeCheck, cls: "bg-emerald-400/20 text-emerald-200" },
  unconfirmed: { icon: PinOff, cls: "bg-white/10 text-[var(--ink)]/70" },
  released: { icon: Ticket, cls: "bg-white/10 text-[var(--ink)]/70" },
  expired: { icon: Clock, cls: "bg-orange-400/20 text-orange-200" },
  blocked: { icon: Ban, cls: "bg-red-500/20 text-red-200" },
  unblocked: { icon: Unlock, cls: "bg-white/10 text-[var(--ink)]/70" },
};

function describe(e: RaffleEvent, raffle: Raffle): string {
  const n = e.number !== undefined ? formatNumber(e.number, raffle.numberCount) : "";
  const who = e.name ?? e.phone ?? "";
  switch (e.type) {
    case "reserved":
      return `${who} apartó el ${n} desde la página`;
    case "assigned":
      return `Asignaste el ${n} a ${who}`;
    case "payment":
      return `Abono de ${formatCOP(e.amount ?? 0)} al ${n} (${who})`;
    case "confirmed":
      return `Fijaste a ${who} en el ${n}`;
    case "unconfirmed":
      return `Quitaste el fijado del ${n} (${who})`;
    case "released":
      return `Liberaste el ${n} de ${who}`;
    case "expired":
      return `Venció el apartado del ${n} de ${who}: quedó libre`;
    case "blocked":
      return `Bloqueaste el WhatsApp ${e.phone ?? ""}${e.name ? ` (${e.name})` : ""}`;
    case "unblocked":
      return `Desbloqueaste el WhatsApp ${e.phone ?? ""}`;
  }
}

const rel = (iso: string, now: number) => {
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(iso));
};

const seenKey = (id: string) => `rifamax-visto-${id}`;

/** Historial de lo que pasa en la rifa, con lo nuevo desde la última visita resaltado. */
export default function ActivityFeed({ raffle, events }: { raffle: Raffle; events: RaffleEvent[] }) {
  const [seen, setSeen] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [all, setAll] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    let prev: string | null = null;
    try {
      prev = localStorage.getItem(seenKey(raffle.id));
    } catch {}
    setSeen(prev ?? "");
    const t = setTimeout(() => {
      try {
        if (events[0]) localStorage.setItem(seenKey(raffle.id), events[0].at);
      } catch {}
    }, 4000);
    return () => clearTimeout(t);
  }, [raffle.id, events]);

  const fresh = useMemo(() => (seen === null || seen === "" ? 0 : events.filter((e) => e.at > seen).length), [events, seen]);
  const shown = all ? events : events.slice(0, 8);

  return (
    <section className="glass rounded-[24px] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          Actividad
          {fresh > 0 && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-black text-[#2a1a00]">{fresh} nuevo{fresh > 1 ? "s" : ""}</span>}
        </h2>
        <ShieldCheck className="size-5 text-[var(--ink)]/40" aria-hidden />
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-[var(--ink)]/60">Aquí verás cada apartado, abono y liberación con su hora.</p>
      ) : (
        <ol className="space-y-2.5">
          {shown.map((e) => {
            const m = META[e.type];
            const isNew = !!seen && e.at > seen;
            return (
              <li key={e.id} className={`flex items-start gap-3 rounded-xl p-1.5 ${isNew ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30" : ""}`}>
                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${m.cls}`}>
                  <m.icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="leading-snug">{describe(e, raffle)}</p>
                  <p className="text-xs text-[var(--ink)]/50">
                    {now ? rel(e.at, now) : ""}
                    {e.type === "reserved" && e.phone ? ` · ${e.phone}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {events.length > 8 && (
        <button onClick={() => setAll((v) => !v)} className="mt-3 text-sm font-semibold text-[var(--accent)]">
          {all ? "Ver menos" : `Ver todo (${events.length})`}
        </button>
      )}
    </section>
  );
}
