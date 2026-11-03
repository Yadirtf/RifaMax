"use client";

import { Ban, Copy, ExternalLink, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { unblockPhone, updateRaffleInfo } from "@/app/admin/actions";
import { holdHoursOf } from "@/lib/hold";
import { Field, inputCls, Segmented, useToast } from "@/components/ui";
import { whatsappLink } from "@/lib/raffle";
import { themes } from "@/lib/themes";
import type { RaffleStatus } from "@/lib/types";
import type { AdminProps } from "./AdminRaffle";
import TelegramCard from "./TelegramCard";

export default function SettingsPanel({ raffle, publicUrl, telegram }: AdminProps) {
  const [form, setForm] = useState({
    name: raffle.name,
    description: raffle.description,
    paymentInfo: raffle.paymentInfo,
    organizerPhone: raffle.organizerPhone,
    goal: raffle.goal ?? 0,
    holdHours: holdHoursOf(raffle),
    theme: raffle.theme,
    status: raffle.status,
  });
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const share = whatsappLink("", `🎟️ ${raffle.name}: aparta tu número y abona a tu ritmo. ${publicUrl}`);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <form
        className="glass space-y-5 rounded-[26px] p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            toast(await updateRaffleInfo({ raffleId: raffle.id, patch: form }));
            router.refresh();
          });
        }}
      >
        <Field label="Nombre">
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Descripción">
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={inputCls} />
        </Field>
        <Field label="Instrucciones de pago" hint="Se muestran al apartar un número.">
          <textarea value={form.paymentInfo} onChange={(e) => set("paymentInfo", e.target.value)} rows={3} placeholder="Nequi 300 000 0000 a nombre de…" className={inputCls} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="WhatsApp de quien organiza" hint="Los jugadores te escriben aquí al apartar.">
            <input value={form.organizerPhone} onChange={(e) => set("organizerPhone", e.target.value)} inputMode="tel" placeholder="3001234567" className={`num ${inputCls}`} />
          </Field>
          <Field label="Tu meta de ganancia (COP)" hint="Llena la alcancía: premios + esta meta.">
            <input type="number" min={0} step={1} value={form.goal} onChange={(e) => set("goal", Number(e.target.value))} className={`num ${inputCls}`} />
          </Field>
        </div>
        <Field label="Apartados sin abono vencen en (horas)" hint="Si el jugador no abona y no lo fijas, el número vuelve a quedar libre. 0 = nunca vencen.">
          <input type="number" min={0} max={720} step={1} value={form.holdHours} onChange={(e) => set("holdHours", Number(e.target.value))} className={`num ${inputCls}`} />
        </Field>
        <Field label="Tema" group>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.values(themes).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => set("theme", t.key)}
                aria-pressed={form.theme === t.key}
                className={`rounded-xl p-3 text-left text-sm font-semibold ring-1 transition ${form.theme === t.key ? "ring-2 ring-[var(--accent)]" : "ring-white/15 hover:bg-white/5"}`}
                style={{ background: `linear-gradient(135deg, ${t.bg2}, ${t.bg})` }}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="mt-1 block">{t.label}</span>
                <span className="mt-2 flex gap-1">
                  {[t.primary, t.secondary, t.accent].map((c) => (
                    <span key={c} className="size-3 rounded-full" style={{ background: c }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Estado" group>
          <Segmented<RaffleStatus>
            value={form.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "active", label: "Activa" },
              { value: "closed", label: "Cerrada" },
              { value: "finished", label: "Terminada" },
              { value: "draft", label: "Oculta" },
            ]}
          />
        </Field>
        <button disabled={pending} className="btn-gold w-full rounded-xl py-3.5 font-display text-lg font-bold disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <div className="space-y-4">
        <TelegramCard telegram={telegram} />
        <BlockedPhones raffleId={raffle.id} phones={raffle.blockedPhones ?? []} />
        <aside className="glass h-fit space-y-4 rounded-[26px] p-5 sm:p-6">
          <h2 className="font-display text-xl font-extrabold">Compartir</h2>
          <p className="num break-all rounded-xl bg-black/25 p-3 text-sm">{publicUrl}</p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(publicUrl);
                toast({ ok: true, message: "Enlace copiado." });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl py-3 font-semibold ring-1 ring-white/15 hover:bg-white/10"
            >
              <Copy className="size-4" aria-hidden /> Copiar enlace
            </button>
            <a href={share} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-bold text-[#04260f]">
              <Share2 className="size-4" aria-hidden /> Compartir por WhatsApp
            </a>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl py-3 font-semibold ring-1 ring-white/15 hover:bg-white/10">
              <ExternalLink className="size-4" aria-hidden /> Ver página pública
            </a>
          </div>
          <p className="text-xs text-[var(--ink)]/55">
            Recuerda: en Colombia las rifas suelen requerir autorización de Coljuegos o de la alcaldía (Ley 643 de 2001).
          </p>
        </aside>
      </div>
    </div>
  );
}

function BlockedPhones({ raffleId, phones }: { raffleId: string; phones: string[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (phones.length === 0) return null;
  return (
    <section className="glass space-y-3 rounded-[26px] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <Ban className="size-5 text-red-300" aria-hidden /> WhatsApp bloqueados
      </h2>
      <p className="text-sm text-[var(--ink)]/65">No pueden apartar desde la página.</p>
      <ul className="divide-y divide-white/10">
        {phones.map((p) => (
          <li key={p} className="flex items-center justify-between gap-3 py-2">
            <span className="num">{p}</span>
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  toast(await unblockPhone({ raffleId, phone: p }));
                  router.refresh();
                })
              }
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-white/10 disabled:opacity-60"
            >
              Desbloquear
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
