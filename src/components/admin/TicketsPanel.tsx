"use client";

import { MessageCircle, Plus, Search, Trash2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addPayment, assignNumber, releaseTicket } from "@/app/admin/actions";
import { Field, inputCls, Segmented, Sheet, useToast } from "@/components/ui";
import { formatCOP, formatDate, formatNumber, ticketState, whatsappLink, type TicketState } from "@/lib/raffle";
import type { Ticket } from "@/lib/types";
import type { AdminProps } from "./AdminRaffle";

type Filter = "all" | "owing" | "paid" | "zero";

const BADGE: Record<TicketState, { label: string; cls: string }> = {
  free: { label: "Libre", cls: "bg-white/10" },
  reserved: { label: "Sin abono", cls: "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/30" },
  partial: { label: "Abonando", cls: "bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/30" },
  paid: { label: "Pagado", cls: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30" },
};

export default function TicketsPanel({ raffle, tickets, publicUrl }: AdminProps) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [paying, setPaying] = useState<Ticket | null>(null);
  const [assigning, setAssigning] = useState(false);
  const label = (n: number) => formatNumber(n, raffle.numberCount);

  const rows = useMemo(
    () =>
      tickets.filter((t) => {
        const s = ticketState(t, raffle.price);
        if (filter === "owing" && s === "paid") return false;
        if (filter === "paid" && s !== "paid") return false;
        if (filter === "zero" && s !== "reserved") return false;
        return `${label(t.number)} ${t.player.name} ${t.player.phone}`.toLowerCase().includes(q.toLowerCase());
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickets, q, filter],
  );

  const reminder = (t: Ticket) => {
    const owes = raffle.price - t.paidAmount;
    const first = t.player.name.split(" ")[0];
    return whatsappLink(
      t.player.phone,
      owes > 0
        ? `Hola ${first} 👋 Tu número ${label(t.number)} de la ${raffle.name} lleva ${formatCOP(t.paidAmount)}. Te faltan ${formatCOP(owes)} y tienes hasta el ${formatDate(raffle.paymentDeadline)}. Puedes abonar desde ${formatCOP(Math.min(raffle.minDeposit, owes))}. ${publicUrl}`
        : `Hola ${first} 🎉 Tu número ${label(t.number)} de la ${raffle.name} está pagado. ¡Mucha suerte! ${publicUrl}`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 opacity-50" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar número, nombre o teléfono" className={`${inputCls} pl-11`} aria-label="Buscar" />
        </div>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `Todos (${tickets.length})` },
            { value: "owing", label: "Deben" },
            { value: "zero", label: "Sin abono" },
            { value: "paid", label: "Pagados" },
          ]}
        />
        <button onClick={() => setAssigning(true)} className="btn-gold inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold">
          <Plus className="size-4" aria-hidden /> Asignar número
        </button>
      </div>

      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((t) => {
          const s = ticketState(t, raffle.price);
          const pct = t.paidAmount / raffle.price;
          return (
            <li key={t.id} className="glass flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className={`num flex size-12 shrink-0 items-center justify-center rounded-xl font-display text-xl font-black ${s === "paid" ? "btn-gold" : "bg-white/10"}`}>
                  {label(t.number)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.player.name}</p>
                  <p className="num truncate text-xs text-[var(--ink)]/55">{t.player.phone || "sin teléfono"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[s].cls}`}>{BADGE[s].label}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-[var(--ink)]/65">
                  <span className="num">{formatCOP(t.paidAmount)} abonado</span>
                  <span className="num">{s === "paid" ? "completo" : `debe ${formatCOP(raffle.price - t.paidAmount)}`}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/30">
                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--secondary)] to-[var(--accent)] transition-[width] duration-700" style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
              <div className="flex gap-2">
                {s !== "paid" && (
                  <button onClick={() => setPaying(t)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--ink)] px-3 py-2 text-sm font-bold text-[var(--bg)]">
                    <Wallet className="size-4" aria-hidden /> Abonar
                  </button>
                )}
                {t.player.phone && (
                  <a href={reminder(t)} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-sm font-bold text-[#04260f]">
                    <MessageCircle className="size-4" aria-hidden /> {s === "paid" ? "Confirmar" : "Recordar"}
                  </a>
                )}
                <ReleaseButton raffleId={raffle.id} ticket={t} label={label(t.number)} />
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="glass rounded-2xl p-8 text-center text-[var(--ink)]/60 md:col-span-2 xl:col-span-3">Sin números para mostrar.</li>}
      </ul>

      <PaymentSheet raffle={raffle} ticket={paying} onClose={() => setPaying(null)} label={label} />
      <AssignSheet raffle={raffle} tickets={tickets} open={assigning} onClose={() => setAssigning(false)} label={label} />
    </div>
  );
}

function ReleaseButton({ raffleId, ticket, label }: { raffleId: string; ticket: Ticket; label: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      aria-label={`Liberar el ${label}`}
      title="Liberar número"
      onClick={() => {
        if (!confirm(`¿Liberar el ${label} de ${ticket.player.name}? Se borran sus abonos registrados.`)) return;
        start(async () => {
          const r = await releaseTicket({ raffleId, ticketId: ticket.id });
          toast(r);
          router.refresh();
        });
      }}
      className="rounded-xl px-3 py-2 text-[var(--ink)]/60 ring-1 ring-white/15 hover:bg-red-500/15 hover:text-red-200"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function PaymentSheet({ raffle, ticket, onClose, label }: { raffle: AdminProps["raffle"]; ticket: Ticket | null; onClose: () => void; label: (n: number) => string }) {
  const owes = ticket ? raffle.price - ticket.paidAmount : 0;
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState("nequi");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const quick = ticket
    ? [...new Set([ticket.paidAmount === 0 ? Math.min(raffle.minDeposit, owes) : Math.min(5000, owes), Math.round(owes / 2 / 1000) * 1000, owes])].filter((v) => v > 0)
    : [];

  return (
    <Sheet open={!!ticket} onClose={onClose} title={ticket ? `Abono al ${label(ticket.number)}` : ""}>
      {ticket && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await addPayment({ raffleId: raffle.id, ticketId: ticket.id, amount: amount || owes, method, note });
              toast(r);
              if (r.ok) {
                setAmount(0);
                setNote("");
                onClose();
                router.refresh();
              }
            });
          }}
          className="space-y-5"
        >
          <div className="rounded-2xl bg-black/25 p-4 text-sm">
            <p className="font-semibold">{ticket.player.name}</p>
            <p className="text-[var(--ink)]/65">
              Lleva {formatCOP(ticket.paidAmount)} · debe <b className="text-[var(--ink)]">{formatCOP(owes)}</b>
            </p>
          </div>
          <Field label="Valor del abono" group>
            <div className="mb-2 flex flex-wrap gap-2">
              {quick.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={`num rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ${amount === v ? "bg-[var(--accent)] text-[#2a1a00] ring-transparent" : "ring-white/15 hover:bg-white/10"}`}
                >
                  {v === owes ? `Todo (${formatCOP(v)})` : formatCOP(v)}
                </button>
              ))}
            </div>
            <input type="number" min={1} max={owes} step={1} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder={String(owes)} aria-label="Valor del abono" className={`num ${inputCls}`} />
          </Field>
          <Field label="Medio de pago" group>
            <Segmented
              value={method}
              onChange={setMethod}
              options={[
                { value: "nequi", label: "Nequi" },
                { value: "daviplata", label: "Daviplata" },
                { value: "efectivo", label: "Efectivo" },
                { value: "transferencia", label: "Banco" },
              ]}
            />
          </Field>
          <Field label="Nota (opcional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. comprobante 12345" className={inputCls} />
          </Field>
          <button disabled={pending} className="btn-gold w-full rounded-xl py-3.5 font-display text-lg font-bold disabled:opacity-60">
            {pending ? "Guardando…" : `Registrar ${formatCOP(amount || owes)}`}
          </button>
          {ticket.payments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--ink)]/50">Historial</p>
              <ul className="space-y-1 text-sm">
                {ticket.payments.map((p, i) => (
                  <li key={i} className="flex justify-between text-[var(--ink)]/75">
                    <span>
                      {new Date(p.at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })} · {p.method}
                    </span>
                    <span className="num">{formatCOP(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}
    </Sheet>
  );
}

function AssignSheet({ raffle, tickets, open, onClose, label }: { raffle: AdminProps["raffle"]; tickets: Ticket[]; open: boolean; onClose: () => void; label: (n: number) => string }) {
  const taken = new Set(tickets.map((t) => t.number));
  const [number, setNumber] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Sheet open={open} onClose={onClose} title="Asignar número">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (number === null) return toast({ ok: false, message: "Elige un número." });
          start(async () => {
            const r = await assignNumber({ raffleId: raffle.id, number, name, phone });
            toast(r);
            if (r.ok) {
              setNumber(null);
              setName("");
              setPhone("");
              onClose();
              router.refresh();
            }
          });
        }}
        className="space-y-5"
      >
        <div>
          <p className="mb-2 text-sm font-semibold">Número {number !== null && <b className="text-[var(--accent)]">{label(number)}</b>}</p>
          <div className="grid max-h-56 grid-cols-10 gap-1 overflow-y-auto rounded-xl bg-black/20 p-2">
            {Array.from({ length: raffle.numberCount }, (_, n) => (
              <button
                key={n}
                type="button"
                disabled={taken.has(n)}
                onClick={() => setNumber(n)}
                className={`num aspect-square rounded-md text-[11px] font-bold ${
                  number === n ? "bg-[var(--accent)] text-[#2a1a00]" : taken.has(n) ? "opacity-20" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {label(n)}
              </button>
            ))}
          </div>
        </div>
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputCls} />
        </Field>
        <Field label="WhatsApp" hint="Para enviarle recordatorios.">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={`num ${inputCls}`} />
        </Field>
        <button disabled={pending} className="btn-gold w-full rounded-xl py-3.5 font-display text-lg font-bold disabled:opacity-60">
          {pending ? "Asignando…" : "Asignar"}
        </button>
      </form>
    </Sheet>
  );
}
