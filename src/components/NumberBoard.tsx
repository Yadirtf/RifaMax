"use client";

import { useActionState, useState } from "react";
import { reserveNumber, type ReserveState } from "@/app/actions";
import type { TicketState } from "@/lib/raffle";
import { formatCOP, whatsappLink } from "@/lib/raffle";

export interface BoardCell {
  number: number;
  label: string;
  state: TicketState;
  /** Primer nombre de quien lo tiene (solo para mostrar). */
  owner?: string;
}

interface Props {
  slug: string;
  raffleName: string;
  cells: BoardCell[];
  price: number;
  minDeposit: number;
  paymentInfo: string;
  organizerPhone: string;
  open: boolean;
}

const STYLES: Record<TicketState, string> = {
  free: "bg-white/10 hover:bg-[var(--accent)] hover:text-black cursor-pointer",
  reserved: "bg-white/5 text-white/40 border border-dashed border-white/30",
  partial: "bg-[var(--secondary)]/70 text-white",
  paid: "bg-[var(--primary)] text-white",
};

export const STATE_LABEL: Record<TicketState, string> = {
  free: "Libre",
  reserved: "Apartado",
  partial: "Abonando",
  paid: "Pagado",
};

export default function NumberBoard(props: Props) {
  const [selected, setSelected] = useState<BoardCell | null>(null);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-white/80">
        {(Object.keys(STATE_LABEL) as TicketState[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded ${STYLES[s].split(" hover:")[0]}`} />
            {STATE_LABEL[s]}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {props.cells.map((c) => (
          <button
            key={c.number}
            type="button"
            disabled={c.state !== "free" || !props.open}
            onClick={() => setSelected(c)}
            title={c.state === "free" ? `Apartar el ${c.label}` : `${c.label}: ${STATE_LABEL[c.state]}${c.owner ? ` (${c.owner})` : ""}`}
            className={`aspect-square rounded-md text-xs font-bold tabular-nums transition sm:text-sm ${STYLES[c.state]} disabled:cursor-default`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {selected && <ReserveDialog {...props} cell={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ReserveDialog({
  slug,
  raffleName,
  cell,
  price,
  minDeposit,
  paymentInfo,
  organizerPhone,
  onClose,
}: Props & { cell: BoardCell; onClose: () => void }) {
  const [state, action, pending] = useActionState<ReserveState | null, FormData>(reserveNumber, null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        {state?.ok ? (
          <div className="text-center">
            <div className="pop mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)] text-3xl font-black text-black">
              {state.number}
            </div>
            <h3 className="text-xl font-bold">¡Número apartado!</h3>
            <p className="mt-2 text-sm text-white/80">
              Abona desde {formatCOP(minDeposit)} cuando quieras. Para participar debe quedar pagado completo ({formatCOP(price)}).
            </p>
            {paymentInfo && <p className="mt-3 rounded-lg bg-black/20 p-3 text-sm">{paymentInfo}</p>}
            {organizerPhone && (
              <a
                href={whatsappLink(organizerPhone, `Hola, aparté el número ${state.number} de la ${raffleName}. Quiero hacer mi abono.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded-xl bg-[#25D366] px-4 py-3 font-bold text-black"
              >
                Avisar por WhatsApp
              </a>
            )}
            <button onClick={onClose} className="mt-3 text-sm text-white/70 underline">
              Cerrar
            </button>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <h3 className="text-lg font-bold">Apartar el número {cell.label}</h3>
            <p className="text-sm text-white/70">
              Lo apartas ahora y lo pagas por abonos. Primer abono desde {formatCOP(minDeposit)}.
            </p>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="number" value={cell.number} />
            <label className="block text-sm">
              Tu nombre
              <input name="name" required minLength={2} className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-black" />
            </label>
            <label className="block text-sm">
              Tu WhatsApp
              <input name="phone" required inputMode="tel" placeholder="300 123 4567" className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-black" />
            </label>
            {state && !state.ok && <p className="text-sm text-red-300">{state.message}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-white/10 px-4 py-3">
                Cancelar
              </button>
              <button disabled={pending} className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 font-bold text-black disabled:opacity-60">
                {pending ? "Apartando…" : "Apartar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
