"use client";

import { useActionState } from "react";
import { updateRaffleInfo, type ActionState } from "@/app/admin/actions";

interface Props {
  raffleId: number;
  description: string;
  paymentInfo: string;
  organizerPhone: string;
}

export default function RaffleInfoForm(p: Props) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(updateRaffleInfo, null);
  return (
    <details className="rounded-xl bg-white p-4 shadow-sm">
      <summary className="cursor-pointer font-semibold">Datos de pago y descripción</summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="raffleId" value={p.raffleId} />
        <label className="text-sm">
          Instrucciones de pago
          <textarea name="paymentInfo" rows={3} defaultValue={p.paymentInfo} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="text-sm">
          Descripción
          <textarea name="description" rows={3} defaultValue={p.description} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="text-sm">
          WhatsApp de quien organiza
          <input name="organizerPhone" inputMode="tel" defaultValue={p.organizerPhone} placeholder="3001234567" className="mt-1 w-full rounded-lg border px-3 py-2" />
          <span className="mt-1 block text-xs text-slate-500">Los jugadores te avisan por aquí al apartar.</span>
        </label>
        <div className="flex items-center gap-3 sm:col-span-3">
          <button disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
            Guardar
          </button>
          {state && <span className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</span>}
        </div>
      </form>
    </details>
  );
}
