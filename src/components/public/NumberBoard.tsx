"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Dices, Lock, MessageCircle, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { reserveNumber } from "@/app/actions";
import { formatCOP, formatDate, whatsappLink, type TicketState } from "@/lib/raffle";
import type { PublicCell } from "@/lib/view";

interface Props {
  slug: string;
  raffleName: string;
  cells: PublicCell[];
  price: number;
  minDeposit: number;
  paymentDeadline: string;
  paymentInfo: string;
  organizerPhone: string;
  open: boolean;
  onReserved?: () => void;
}

export const STATE_INFO: Record<TicketState, { label: string; tile: string; dot: string }> = {
  free: {
    label: "Libre",
    tile: "bg-white/[0.07] text-[var(--ink)] ring-1 ring-white/10 hover:bg-[var(--accent)] hover:text-[#2a1a00] hover:ring-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-8px_var(--accent)] cursor-pointer",
    dot: "bg-white/25",
  },
  reserved: { label: "Apartado", tile: "bg-transparent text-[var(--ink)]/50 border border-dashed border-white/30", dot: "border border-dashed border-white/60" },
  partial: { label: "Abonando", tile: "bg-[var(--secondary)]/80 text-white ring-1 ring-white/10", dot: "bg-[var(--secondary)]" },
  paid: { label: "Pagado", tile: "bg-[var(--primary)] text-white ring-1 ring-white/10", dot: "bg-[var(--primary)]" },
};

export default function NumberBoard(props: Props) {
  const [onlyFree, setOnlyFree] = useState(false);
  const [selected, setSelected] = useState<PublicCell | null>(null);
  const [rolling, setRolling] = useState<number | null>(null);
  const free = useMemo(() => props.cells.filter((c) => c.state === "free"), [props.cells]);

  async function luckyPick() {
    if (free.length === 0) return;
    // Pequeña animación de "barajar" antes de elegir
    for (let i = 0; i < 12; i++) {
      setRolling(free[Math.floor(Math.random() * free.length)].n);
      await new Promise((r) => setTimeout(r, 55 + i * 12));
    }
    const pick = free[Math.floor(Math.random() * free.length)];
    setRolling(pick.n);
    setTimeout(() => {
      setRolling(null);
      setSelected(pick);
    }, 350);
  }

  const shown = onlyFree ? free : props.cells;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={luckyPick}
          disabled={!props.open || free.length === 0 || rolling !== null}
          className="btn-gold inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          <Dices className="size-4" aria-hidden /> Escoger al azar
        </button>
        <button
          type="button"
          onClick={() => setOnlyFree((v) => !v)}
          aria-pressed={onlyFree}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition ${onlyFree ? "bg-[var(--ink)] text-[var(--bg)] ring-transparent" : "ring-white/15 hover:bg-white/10"}`}
        >
          Solo libres ({free.length})
        </button>
        <ul className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ink)]/70" aria-label="Leyenda">
          {(["free", "reserved", "partial", "paid"] as TicketState[]).map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={`inline-block size-2.5 rounded-full ${STATE_INFO[s].dot}`} aria-hidden />
              {STATE_INFO[s].label}
            </li>
          ))}
        </ul>
      </div>

      <motion.div layout className="grid grid-cols-10 gap-1 sm:gap-1.5" role="grid" aria-label="Números de la rifa">
        <AnimatePresence initial={false}>
          {shown.map((c) => {
            const info = STATE_INFO[c.state];
            const isRolling = rolling === c.n;
            const disabled = c.state !== "free" || !props.open;
            return (
              <motion.button
                layout
                key={c.n}
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: isRolling ? 1.18 : 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                disabled={disabled}
                onClick={() => setSelected(c)}
                aria-label={c.state === "free" ? `Número ${c.label}, libre` : `Número ${c.label}, ${info.label.toLowerCase()}${c.owner ? ` por ${c.owner}` : ""}`}
                title={c.owner ? `${c.label} · ${c.owner}` : c.label}
                className={`num relative aspect-square rounded-lg font-display text-[13px] font-bold transition-[background,transform,box-shadow] duration-150 sm:rounded-xl sm:text-base ${info.tile} ${
                  isRolling ? "!bg-[var(--accent)] !text-[#2a1a00] shadow-[0_0_24px_var(--accent)]" : ""
                } disabled:cursor-default`}
              >
                {c.label}
                {c.state === "paid" && <Check className="absolute right-0.5 top-0.5 size-2.5 opacity-70 sm:size-3" aria-hidden />}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>{selected && <ReserveSheet key={selected.n} {...props} cell={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </div>
  );
}

function ReserveSheet(props: Props & { cell: PublicCell; onClose: () => void }) {
  const { cell, onClose } = props;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await reserveNumber({ slug: props.slug, number: cell.n, name, phone });
      if (r.ok) {
        setDone(r.label ?? cell.label);
        props.onReserved?.();
      } else setError(r.message);
    });
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal
        aria-labelledby="reserve-title"
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative w-full max-w-md overflow-hidden rounded-t-[28px] bg-[var(--bg2)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[var(--ink)] shadow-2xl ring-1 ring-white/10 sm:rounded-[28px]"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" aria-hidden />
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 hover:bg-white/10" aria-label="Cerrar">
          <X className="size-5" />
        </button>

        {done ? (
          <div className="text-center">
            <motion.div
              initial={{ rotateY: 180, scale: 0.6 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 14 }}
              className="btn-gold num mx-auto flex size-28 items-center justify-center rounded-full font-display text-5xl font-black"
            >
              {done}
            </motion.div>
            <h3 id="reserve-title" className="mt-5 font-display text-2xl font-extrabold">¡El {done} es tuyo!</h3>
            <p className="mt-2 text-sm text-[var(--ink)]/75">
              Quedó apartado. Ahora abona desde {formatCOP(props.minDeposit)} cuando quieras y termina antes del {formatDate(props.paymentDeadline)} para participar.
            </p>
            {props.paymentInfo && <p className="glass mt-4 rounded-2xl p-4 text-left text-sm">{props.paymentInfo}</p>}
            {props.organizerPhone ? (
              <a
                href={whatsappLink(props.organizerPhone, `Hola, aparté el número ${done} de la ${props.raffleName}. Quiero hacer mi abono.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3.5 font-bold text-[#04260f]"
              >
                <MessageCircle className="size-5" aria-hidden /> Enviar mi primer abono
              </a>
            ) : null}
            <button type="button" onClick={onClose} className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/10">
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="btn-gold num flex size-16 shrink-0 items-center justify-center rounded-2xl font-display text-3xl font-black">{cell.label}</div>
              <div>
                <h3 id="reserve-title" className="font-display text-xl font-extrabold">Apartar el {cell.label}</h3>
                <p className="text-sm text-[var(--ink)]/70">Sin pagar todo de una: abona desde {formatCOP(props.minDeposit)}.</p>
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Tu nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                autoComplete="name"
                className="mt-1.5 w-full rounded-xl bg-white/[0.08] px-4 py-3 text-base outline-none ring-1 ring-white/15 placeholder:text-white/35 focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="Como te conocen"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Tu WhatsApp</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                inputMode="tel"
                autoComplete="tel-national"
                className="num mt-1.5 w-full rounded-xl bg-white/[0.08] px-4 py-3 text-base outline-none ring-1 ring-white/15 placeholder:text-white/35 focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="300 123 4567"
              />
              <span className="mt-1 flex items-center gap-1 text-xs text-[var(--ink)]/55">
                <Lock className="size-3" aria-hidden /> Solo lo ve quien organiza. En el tablero solo sale tu primer nombre.
              </span>
            </label>
            {error && (
              <p role="alert" className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200 ring-1 ring-red-400/30">
                {error}
              </p>
            )}
            <div className="rounded-2xl bg-black/20 p-3 text-xs text-[var(--ink)]/70">
              Valor del número: <b className="text-[var(--ink)]">{formatCOP(props.price)}</b>. Para participar debe quedar pagado completo antes del{" "}
              {formatDate(props.paymentDeadline)}.
            </div>
            <button disabled={pending} className="btn-gold w-full rounded-2xl px-4 py-4 font-display text-lg font-bold transition active:scale-[0.99] disabled:opacity-60">
              {pending ? "Apartando…" : `Apartar el ${cell.label}`}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
