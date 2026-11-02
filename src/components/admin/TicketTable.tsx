"use client";

import { useActionState, useMemo, useState } from "react";
import { addPayment, assignNumber, releaseTicket, type ActionState } from "@/app/admin/actions";
import { formatCOP, ticketState, whatsappLink, type TicketState } from "@/lib/raffle";

export interface AdminTicket {
  id: number;
  number: number;
  label: string;
  name: string;
  phone: string;
  paidAmount: number;
  paidInFullAt: string | null;
}

interface Props {
  raffleId: number;
  raffleName: string;
  raffleUrl: string;
  price: number;
  minDeposit: number;
  paymentDeadline: string;
  tickets: AdminTicket[];
  freeNumbers: { number: number; label: string }[];
}

const STATE: Record<TicketState, { label: string; cls: string }> = {
  free: { label: "Libre", cls: "bg-slate-100" },
  reserved: { label: "Apartado", cls: "bg-amber-100 text-amber-800" },
  partial: { label: "Abonando", cls: "bg-sky-100 text-sky-800" },
  paid: { label: "Pagado", cls: "bg-green-100 text-green-800" },
};

export default function TicketTable(props: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "owing" | "paid">("all");
  const rows = useMemo(
    () =>
      props.tickets.filter((t) => {
        const s = ticketState(t, props.price);
        if (filter === "owing" && s === "paid") return false;
        if (filter === "paid" && s !== "paid") return false;
        const text = `${t.label} ${t.name} ${t.phone}`.toLowerCase();
        return text.includes(q.toLowerCase());
      }),
    [props.tickets, props.price, q, filter],
  );

  return (
    <div className="space-y-4">
      <AssignForm raffleId={props.raffleId} freeNumbers={props.freeNumbers} />
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar número, nombre o teléfono" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="all">Todos</option>
          <option value="owing">Deben</option>
          <option value="paid">Pagados</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">N.º</th>
              <th className="px-3 py-2">Jugador</th>
              <th className="px-3 py-2">Abonado</th>
              <th className="px-3 py-2">Debe</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <Row key={t.id} t={t} {...props} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Sin números para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ t, raffleId, raffleName, raffleUrl, price, minDeposit, paymentDeadline }: Props & { t: AdminTicket }) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(addPayment, null);
  const s = ticketState(t, price);
  const owes = price - t.paidAmount;
  const reminder = whatsappLink(
    t.phone,
    owes > 0
      ? `Hola ${t.name.split(" ")[0]}, tu número ${t.label} de la ${raffleName} lleva ${formatCOP(t.paidAmount)} abonados. Te faltan ${formatCOP(owes)} y tienes hasta el ${paymentDeadline}. Puedes abonar desde ${formatCOP(Math.min(minDeposit, owes))}. ${raffleUrl}`
      : `Hola ${t.name.split(" ")[0]}, tu número ${t.label} de la ${raffleName} está pagado. ¡Mucha suerte! ${raffleUrl}`,
  );
  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2 font-mono text-base font-bold">{t.label}</td>
      <td className="px-3 py-2">
        <p className="font-medium">{t.name}</p>
        <p className="text-xs text-slate-500">{t.phone}</p>
      </td>
      <td className="px-3 py-2">{formatCOP(t.paidAmount)}</td>
      <td className="px-3 py-2">{owes > 0 ? formatCOP(owes) : "—"}</td>
      <td className="px-3 py-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE[s].cls}`}>{STATE[s].label}</span>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-start gap-2">
          {owes > 0 && (
            <form action={action} className="flex flex-wrap items-center gap-1">
              <input type="hidden" name="raffleId" value={raffleId} />
              <input type="hidden" name="ticketId" value={t.id} />
              <input name="amount" type="number" min={1} max={owes} defaultValue={owes} className="w-24 rounded border px-2 py-1" aria-label="Valor del abono" />
              <select name="method" className="rounded border px-1 py-1" aria-label="Medio de pago">
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
              <button disabled={pending} className="rounded bg-slate-900 px-2 py-1 text-white disabled:opacity-60">
                Abonar
              </button>
              {state && <span className={`w-full text-xs ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</span>}
            </form>
          )}
          {t.phone && (
            <a href={reminder} target="_blank" rel="noreferrer" className="rounded bg-[#25D366] px-2 py-1 text-black">
              WhatsApp
            </a>
          )}
          <form
            action={releaseTicket}
            onSubmit={(e) => {
              if (!confirm(`¿Liberar el ${t.label}? Se borran sus abonos registrados.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="raffleId" value={raffleId} />
            <input type="hidden" name="ticketId" value={t.id} />
            <button className="rounded border px-2 py-1 text-slate-600">Liberar</button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function AssignForm({ raffleId, freeNumbers }: { raffleId: number; freeNumbers: Props["freeNumbers"] }) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(assignNumber, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 shadow-sm">
      <input type="hidden" name="raffleId" value={raffleId} />
      <label className="text-xs">
        Número
        <select name="number" className="mt-1 block rounded border px-2 py-1.5 text-sm">
          {freeNumbers.map((n) => (
            <option key={n.number} value={n.number}>
              {n.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs">
        Nombre
        <input name="name" required className="mt-1 block rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs">
        WhatsApp
        <input name="phone" inputMode="tel" className="mt-1 block rounded border px-2 py-1.5 text-sm" />
      </label>
      <button disabled={pending || freeNumbers.length === 0} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60">
        Asignar número
      </button>
      {state && <span className={`text-xs ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</span>}
    </form>
  );
}
