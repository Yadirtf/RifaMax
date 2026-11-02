"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CircleDot, Plus, Repeat2, Ticket, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRaffle, type PrizeInput, type RaffleInput } from "@/app/admin/actions";
import { Field, inputCls, Segmented, ToastProvider, useToast } from "@/components/ui";
import { LOTTERIES } from "@/lib/lotteries";
import { formatCOP, formatDate } from "@/lib/raffle";
import { themes } from "@/lib/themes";

const blank = (drawDate: string): PrizeInput => ({
  title: "",
  description: "",
  kind: "cash",
  value: 0,
  method: "roulette",
  drawDate,
  excludePreviousWinners: true,
  fallback: "roulette",
});

function template(f: RaffleInput): PrizeInput[] {
  const early = f.paymentDeadline || f.drawDate;
  return [
    { ...blank(f.drawDate), title: "Premio mayor", value: 500000, method: "lottery", lotteryKey: "medellin", excludePreviousWinners: false, description: "Últimas cifras del premio mayor de la lotería." },
    { ...blank(f.drawDate), title: "Segundo premio", value: 100000, description: "Ruleta en vivo entre los números pagados." },
    { ...blank(f.drawDate), title: "Premio en especie", kind: "item", value: 150000, description: "Ruleta en vivo entre los números pagados." },
    { ...blank(f.drawDate), title: "Reintegro", kind: "refund", value: f.price, method: "reverse", sourcePosition: 1, description: "El número al revés del premio mayor recupera lo que pagó." },
    { ...blank(early), title: "Bono madrugador", value: f.price * 2, paidBefore: early, description: "El doble de lo que pagaste, para quienes pagan completo temprano." },
  ];
}

const STEPS = ["La rifa", "Premios", "Revisar"];

export default function RaffleWizard() {
  return (
    <ToastProvider>
      <Wizard />
    </ToastProvider>
  );
}

function Wizard() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<RaffleInput>({
    name: "",
    slug: "",
    theme: "navidad",
    description: "",
    numberCount: 100,
    price: 20000,
    minDeposit: 5000,
    paymentDeadline: "",
    drawDate: "",
    paymentInfo: "",
    organizerPhone: "",
    goal: 0,
    prizes: [],
  });
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = <K extends keyof RaffleInput>(k: K, v: RaffleInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const setPrize = (i: number, patch: Partial<PrizeInput>) => setF((x) => ({ ...x, prizes: x.prizes.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const total = f.prizes.reduce((s, p) => s + (p.value || 0), 0);
  const income = f.numberCount * f.price;

  const canNext = step === 0 ? f.name.trim().length >= 3 && f.drawDate && f.paymentDeadline : step === 1 ? f.prizes.length > 0 : true;

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={`num flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${i <= step ? "btn-gold" : "bg-white/10"}`}>{i + 1}</span>
            <span className={`hidden text-sm font-semibold sm:inline ${i === step ? "" : "text-[var(--ink)]/50"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-white/15" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="glass space-y-5 rounded-[26px] p-5 sm:p-7">
          {step === 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nombre">
                  <input
                    value={f.name}
                    onChange={(e) => {
                      set("name", e.target.value);
                      if (!f.slug || f.slug === slugify(f.name)) set("slug", slugify(e.target.value));
                    }}
                    placeholder="Rifa Amor y Amistad 2027"
                    className={inputCls}
                  />
                </Field>
                <Field label="Enlace" hint={`/rifa/${f.slug || "…"}`}>
                  <input value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} className={inputCls} />
                </Field>
              </div>
              <Field label="Tema de temporada" group>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {Object.values(themes).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => set("theme", t.key)}
                      aria-pressed={f.theme === t.key}
                      className={`rounded-xl p-3 text-left text-sm font-semibold ring-1 transition ${f.theme === t.key ? "ring-2 ring-[var(--accent)]" : "ring-white/15"}`}
                      style={{ background: `linear-gradient(135deg, ${t.bg2}, ${t.bg})` }}
                    >
                      <span className="text-xl">{t.emoji}</span>
                      <span className="mt-1 block">{t.label}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Cantidad de números" group>
                  <Segmented
                    value={String(f.numberCount)}
                    onChange={(v) => set("numberCount", Number(v))}
                    options={[
                      { value: "10", label: "10" },
                      { value: "100", label: "100" },
                      { value: "1000", label: "1000" },
                    ]}
                  />
                </Field>
                <Field label="Valor del número">
                  <input type="number" min={1} step={1} value={f.price} onChange={(e) => set("price", Number(e.target.value))} className={`num ${inputCls}`} />
                </Field>
                <Field label="Abono mínimo">
                  <input type="number" min={1} step={1} value={f.minDeposit} onChange={(e) => set("minDeposit", Number(e.target.value))} className={`num ${inputCls}`} />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Último día para pagar completo">
                  <input type="date" value={f.paymentDeadline} onChange={(e) => set("paymentDeadline", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Fecha del sorteo principal">
                  <input type="date" value={f.drawDate} onChange={(e) => set("drawDate", e.target.value)} className={inputCls} />
                </Field>
              </div>
              <Field label="Descripción">
                <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Instrucciones de pago">
                  <textarea value={f.paymentInfo} onChange={(e) => set("paymentInfo", e.target.value)} rows={2} placeholder="Nequi 300 000 0000…" className={inputCls} />
                </Field>
                <Field label="WhatsApp de quien organiza">
                  <input value={f.organizerPhone} onChange={(e) => set("organizerPhone", e.target.value)} inputMode="tel" className={`num ${inputCls}`} />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[var(--ink)]/70">
                  {f.prizes.length} premios · {formatCOP(total)} de {formatCOP(income)} posibles
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => set("prizes", template(f))} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/10">
                    <Wand2 className="size-4" aria-hidden /> Plantilla de 5 premios
                  </button>
                  <button type="button" onClick={() => set("prizes", [...f.prizes, blank(f.drawDate)])} className="btn-gold inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold">
                    <Plus className="size-4" aria-hidden /> Agregar
                  </button>
                </div>
              </div>
              <ul className="space-y-3">
                {f.prizes.map((p, i) => (
                  <li key={i} className="space-y-4 rounded-2xl bg-black/20 p-4">
                    <div className="flex items-center gap-3">
                      <span className="num flex size-8 items-center justify-center rounded-lg bg-white/10 font-black">{i + 1}</span>
                      <input value={p.title} onChange={(e) => setPrize(i, { title: e.target.value })} placeholder="Nombre del premio" className={`${inputCls} flex-1`} aria-label="Nombre del premio" />
                      <button type="button" onClick={() => set("prizes", f.prizes.filter((_, j) => j !== i))} aria-label="Quitar premio" className="rounded-lg p-2 text-red-200 hover:bg-red-500/15">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <Field label="Cómo se gana" group>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            ["lottery", "Lotería", Ticket],
                            ["roulette", "Ruleta", CircleDot],
                            ["reverse", "Al revés", Repeat2],
                          ] as const
                        ).map(([m, l, I]) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPrize(i, { method: m, ...(m === "lottery" ? { lotteryKey: "medellin" } : {}), ...(m === "reverse" ? { sourcePosition: 1 } : {}) })}
                            className={`flex flex-col items-center gap-1 rounded-xl p-3 text-sm font-semibold ring-1 ${p.method === m ? "bg-[var(--ink)] text-[var(--bg)] ring-transparent" : "ring-white/15 hover:bg-white/10"}`}
                          >
                            <I className="size-5" aria-hidden />
                            {l}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Tipo">
                        <select value={p.kind} onChange={(e) => setPrize(i, { kind: e.target.value as PrizeInput["kind"] })} className={inputCls}>
                          <option value="cash">Dinero</option>
                          <option value="item">En especie</option>
                          <option value="refund">Reintegro</option>
                        </select>
                      </Field>
                      <Field label="Valor (COP)">
                        <input type="number" min={0} step={1} value={p.value} onChange={(e) => setPrize(i, { value: Number(e.target.value) })} className={`num ${inputCls}`} />
                      </Field>
                      <Field label="Fecha">
                        <input type="date" value={p.drawDate} onChange={(e) => setPrize(i, { drawDate: e.target.value })} className={inputCls} />
                      </Field>
                      {p.method === "lottery" && (
                        <Field label="Lotería">
                          <select value={p.lotteryKey} onChange={(e) => setPrize(i, { lotteryKey: e.target.value })} className={inputCls}>
                            {Object.values(LOTTERIES).map((l) => (
                              <option key={l.key} value={l.key}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                      {p.method === "reverse" && (
                        <Field label="Al revés del premio n.º">
                          <input type="number" min={1} value={p.sourcePosition} onChange={(e) => setPrize(i, { sourcePosition: Number(e.target.value) })} className={inputCls} />
                        </Field>
                      )}
                      <Field label="Solo pagados hasta" hint="Opcional: premio por pagar temprano.">
                        <input type="date" value={p.paidBefore ?? ""} onChange={(e) => setPrize(i, { paidBefore: e.target.value || undefined })} className={inputCls} />
                      </Field>
                      {p.method !== "roulette" && (
                        <Field label="Si cae en número no pagado">
                          <select value={p.fallback} onChange={(e) => setPrize(i, { fallback: e.target.value as PrizeInput["fallback"] })} className={inputCls}>
                            <option value="roulette">Ruleta entre pagados</option>
                            <option value="none">Queda desierto</option>
                          </select>
                        </Field>
                      )}
                    </div>
                    <Field label="Descripción para los jugadores">
                      <input value={p.description} onChange={(e) => setPrize(i, { description: e.target.value })} className={inputCls} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={p.excludePreviousWinners} onChange={(e) => setPrize(i, { excludePreviousWinners: e.target.checked })} className="size-4 accent-[var(--accent)]" />
                      Un número que ya ganó otra ruleta no participa aquí
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-extrabold">{f.name}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Ingresos posibles" value={formatCOP(income)} />
                <Stat label="Premios" value={formatCOP(total)} />
                <Stat label="Utilidad si se venden todos" value={formatCOP(income - total)} />
                <Stat label="Para cubrir premios" value={`${Math.ceil(total / Math.max(1, f.price))} números`} />
              </div>
              <ul className="space-y-2 text-sm">
                {f.prizes.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3 rounded-xl bg-black/20 px-4 py-3">
                    <span>
                      <b>{i + 1}.</b> {p.title} · {p.method === "lottery" ? "lotería" : p.method === "reverse" ? "al revés" : "ruleta"} · {p.drawDate ? formatDate(p.drawDate) : "sin fecha"}
                    </span>
                    <span className="num font-semibold">{formatCOP(p.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex justify-between gap-3">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold ring-1 ring-white/15 disabled:opacity-30">
          <ArrowLeft className="size-4" aria-hidden /> Atrás
        </button>
        {step < 2 ? (
          <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="btn-gold inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-40">
            Siguiente <ArrowRight className="size-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await createRaffle(f);
                toast(r);
                if (r.ok && r.id) router.push(`/admin/rifas/${r.id}`);
              })
            }
            className="btn-gold rounded-xl px-6 py-3 font-bold disabled:opacity-60"
          >
            {pending ? "Creando…" : "Crear rifa"}
          </button>
        )}
      </div>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <p className="text-xs text-[var(--ink)]/60">{label}</p>
      <p className="num font-display text-lg font-extrabold">{value}</p>
    </div>
  );
}
