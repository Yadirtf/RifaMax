"use client";

import { useActionState, useState } from "react";
import { createRaffle, type ActionState } from "@/app/admin/actions";
import { themes } from "@/lib/themes";

interface PrizeRow {
  title: string;
  description: string;
  kind: "cash" | "item" | "refund";
  value: number;
  method: "lottery" | "roulette" | "reverse";
  lotteryName: string;
  sourcePosition: number;
  drawDate: string;
  paidBefore: string;
  excludePreviousWinners: boolean;
  fallback: "roulette" | "none";
}

const blank = (drawDate: string): PrizeRow => ({
  title: "",
  description: "",
  kind: "cash",
  value: 0,
  method: "roulette",
  lotteryName: "",
  sourcePosition: 1,
  drawDate,
  paidBefore: "",
  excludePreviousWinners: true,
  fallback: "roulette",
});

/** Plantilla con la estructura de la Rifa Navideña: se ajusta a las fechas del formulario. */
function template(drawDate: string, earlyDate: string, price: number): PrizeRow[] {
  return [
    { ...blank(drawDate), title: "Premio mayor", kind: "cash", value: 500000, method: "lottery", lotteryName: "Lotería de Medellín", excludePreviousWinners: false },
    { ...blank(drawDate), title: "Segundo premio", value: 100000 },
    { ...blank(drawDate), title: "Premio en especie", kind: "item", value: 150000 },
    { ...blank(drawDate), title: "Reintegro", kind: "refund", value: price, method: "reverse", sourcePosition: 1, description: "El número invertido del premio mayor recupera lo invertido." },
    { ...blank(earlyDate), title: "Bono madrugador", value: price * 2, paidBefore: earlyDate, description: "El doble de lo que pagaste, para quienes pagan completo temprano." },
  ];
}

const input = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";

export default function RaffleForm() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(createRaffle, null);
  const [drawDate, setDrawDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [price, setPrice] = useState(20000);
  const [rows, setRows] = useState<PrizeRow[]>([]);

  const update = (i: number, patch: Partial<PrizeRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <form action={action} className="space-y-6">
      <section className="grid gap-4 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2">
        <label className="text-sm">
          Nombre
          <input name="name" required className={input} placeholder="Rifa Amor y Amistad 2027" />
        </label>
        <label className="text-sm">
          Enlace (slug)
          <input name="slug" required className={input} placeholder="amor-amistad-2027" />
        </label>
        <label className="text-sm">
          Tema
          <select name="theme" className={input} defaultValue="navidad">
            {Object.values(themes).map((t) => (
              <option key={t.key} value={t.key}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Cantidad de números
          <select name="numberCount" className={input} defaultValue="100">
            <option value="10">10 (0-9)</option>
            <option value="100">100 (00-99)</option>
            <option value="1000">1000 (000-999)</option>
          </select>
        </label>
        <label className="text-sm">
          Valor del número (COP)
          <input name="price" type="number" min={1} required value={price} onChange={(e) => setPrice(Number(e.target.value))} className={input} />
        </label>
        <label className="text-sm">
          Abono mínimo para apartar (COP)
          <input name="minDeposit" type="number" min={1} required defaultValue={5000} className={input} />
        </label>
        <label className="text-sm">
          Último día para pagar completo
          <input name="paymentDeadline" type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          Fecha del sorteo principal
          <input name="drawDate" type="date" required value={drawDate} onChange={(e) => setDrawDate(e.target.value)} className={input} />
        </label>
        <label className="text-sm sm:col-span-2">
          Descripción
          <textarea name="description" rows={2} className={input} />
        </label>
        <label className="text-sm">
          Instrucciones de pago
          <textarea name="paymentInfo" rows={2} className={input} placeholder="Nequi 300 000 0000 a nombre de…" />
        </label>
        <label className="text-sm">
          WhatsApp de quien organiza
          <input name="organizerPhone" inputMode="tel" className={input} placeholder="3001234567" />
        </label>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Premios ({rows.length})</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRows(template(drawDate, deadline || drawDate, price))}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              Usar plantilla de 5 premios
            </button>
            <button type="button" onClick={() => setRows((r) => [...r, blank(drawDate)])} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">
              Agregar premio
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {rows.map((p, i) => (
            <div key={i} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-4">
              <div className="flex items-center justify-between sm:col-span-4">
                <span className="text-sm font-semibold">Premio {i + 1}</span>
                <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="text-sm text-red-600">
                  Quitar
                </button>
              </div>
              <label className="text-sm sm:col-span-2">
                Nombre
                <input value={p.title} onChange={(e) => update(i, { title: e.target.value })} className={input} />
              </label>
              <label className="text-sm">
                Tipo
                <select value={p.kind} onChange={(e) => update(i, { kind: e.target.value as PrizeRow["kind"] })} className={input}>
                  <option value="cash">Dinero</option>
                  <option value="item">En especie</option>
                  <option value="refund">Reintegro</option>
                </select>
              </label>
              <label className="text-sm">
                Valor (COP)
                <input type="number" min={0} value={p.value} onChange={(e) => update(i, { value: Number(e.target.value) })} className={input} />
              </label>
              <label className="text-sm">
                Cómo se gana
                <select value={p.method} onChange={(e) => update(i, { method: e.target.value as PrizeRow["method"] })} className={input}>
                  <option value="lottery">Lotería (últimas cifras)</option>
                  <option value="roulette">Ruleta verificable</option>
                  <option value="reverse">Número invertido de otro premio</option>
                </select>
              </label>
              {p.method === "lottery" && (
                <label className="text-sm">
                  Lotería
                  <input value={p.lotteryName} onChange={(e) => update(i, { lotteryName: e.target.value })} className={input} placeholder="Lotería de Medellín" />
                </label>
              )}
              {p.method === "reverse" && (
                <label className="text-sm">
                  Premio de origen (n.º)
                  <input type="number" min={1} value={p.sourcePosition} onChange={(e) => update(i, { sourcePosition: Number(e.target.value) })} className={input} />
                </label>
              )}
              <label className="text-sm">
                Fecha del sorteo
                <input type="date" value={p.drawDate} onChange={(e) => update(i, { drawDate: e.target.value })} className={input} />
              </label>
              <label className="text-sm">
                Solo pagados hasta (opcional)
                <input type="date" value={p.paidBefore} onChange={(e) => update(i, { paidBefore: e.target.value })} className={input} />
              </label>
              {p.method !== "roulette" && (
                <label className="text-sm">
                  Si el número no está pagado
                  <select value={p.fallback} onChange={(e) => update(i, { fallback: e.target.value as PrizeRow["fallback"] })} className={input}>
                    <option value="roulette">Ruleta entre pagados</option>
                    <option value="none">Queda desierto</option>
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={p.excludePreviousWinners} onChange={(e) => update(i, { excludePreviousWinners: e.target.checked })} />
                Excluir ganadores de otras ruletas
              </label>
              <label className="text-sm sm:col-span-4">
                Descripción
                <input value={p.description} onChange={(e) => update(i, { description: e.target.value })} className={input} />
              </label>
            </div>
          ))}
        </div>
      </section>

      <input type="hidden" name="prizes" value={JSON.stringify(rows)} />
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <button disabled={pending} className="rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "Creando…" : "Crear rifa"}
      </button>
    </form>
  );
}
