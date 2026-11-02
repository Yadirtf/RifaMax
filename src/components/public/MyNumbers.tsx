"use client";

import { motion } from "motion/react";
import { Search } from "lucide-react";
import { useState, useTransition } from "react";
import { myNumbers, type MyTicket } from "@/app/actions";
import { formatCOP } from "@/lib/raffle";

function Ring({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="7" />
      <motion.circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeLinecap="round"
        strokeWidth="7"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - value) }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function MyNumbers({ slug }: { slug: string }) {
  const [phone, setPhone] = useState("");
  const [tickets, setTickets] = useState<MyTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="glass rounded-[26px] p-5 sm:p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await myNumbers({ slug, phone });
            if (r.ok) setTickets(r.tickets ?? []);
            else {
              setTickets(null);
              setError(r.message);
            }
          });
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label className="sr-only" htmlFor="my-phone">
          Tu WhatsApp
        </label>
        <input
          id="my-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="Tu WhatsApp (10 dígitos)"
          className="num min-w-0 flex-1 rounded-xl bg-white/[0.08] px-4 py-3 outline-none ring-1 ring-white/15 placeholder:text-white/40 focus:ring-2 focus:ring-[var(--accent)]"
        />
        <button disabled={pending} className="btn-gold inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold disabled:opacity-60">
          <Search className="size-4" aria-hidden /> {pending ? "Buscando…" : "Ver mis números"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      {tickets && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {tickets.map((t) => {
            const pct = t.paidAmount / t.price;
            return (
              <motion.li key={t.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 rounded-2xl bg-black/25 p-4">
                <div className="relative">
                  <Ring value={pct} />
                  <span className="num absolute inset-0 flex items-center justify-center font-display text-lg font-black">{t.label}</span>
                </div>
                <div className="text-sm">
                  <p className="font-display text-base font-bold">{pct >= 1 ? "¡Pagado! Ya participas" : `Llevas ${formatCOP(t.paidAmount)}`}</p>
                  {pct < 1 && <p className="text-[var(--ink)]/70">Te faltan {formatCOP(t.price - t.paidAmount)}</p>}
                  <p className="text-xs text-[var(--ink)]/50">
                    {t.payments.length} {t.payments.length === 1 ? "abono" : "abonos"}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
