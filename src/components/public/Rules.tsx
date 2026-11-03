"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, ChevronDown, CircleDot, Coins, HandCoins, ShieldCheck, Ticket } from "lucide-react";
import { useState } from "react";
import { digitsFor, formatCOP, formatDate } from "@/lib/raffle";
import type { PublicPrize } from "@/lib/view";

interface Props {
  price: number;
  minDeposit: number;
  paymentDeadline: string;
  numberCount: number;
  prizes: PublicPrize[];
  holdHours: number;
}

export default function Rules({ price, minDeposit, paymentDeadline, numberCount, prizes, holdHours }: Props) {
  const lottery = prizes.find((p) => p.method === "lottery");
  const early = prizes.find((p) => p.paidBefore);
  const reverse = prizes.find((p) => p.method === "reverse");
  const digits = digitsFor(numberCount);

  const steps = [
    { icon: Ticket, title: "Aparta tu número", text: `Elige uno libre en el tablero con tu nombre y WhatsApp. Cada número vale ${formatCOP(price)}.${holdHours > 0 ? ` Haz tu primer abono en las siguientes ${holdHours} horas o el número vuelve a quedar libre.` : ""}` },
    { icon: HandCoins, title: "Abona a tu ritmo", text: `Paga por partes desde ${formatCOP(minDeposit)}. Cada abono queda registrado y lo puedes consultar en "Mis números".` },
    {
      icon: CalendarCheck,
      title: "Completa a tiempo",
      text: `Tu número participa si queda pagado completo antes de terminar el ${formatDate(paymentDeadline)}.${early ? ` Si pagas antes del ${formatDate(early.paidBefore!)}, también entras al ${early.title.toLowerCase()}.` : ""}`,
    },
    { icon: CircleDot, title: "Gana de varias formas", text: `Hay ${prizes.length} premios: por lotería oficial, ruleta en vivo${reverse ? " y número al revés" : ""}. Un número solo gana una ruleta.` },
  ];

  const faq: { q: string; a: string }[] = [
    ...(lottery
      ? [
          {
            q: `¿Cómo se usa la ${lottery.lotteryName}?`,
            a: `Gana el número que coincida con las últimas ${digits} cifras del premio mayor del sorteo del ${formatDate(lottery.drawDate)}. Publicamos el resultado con el enlace a la página oficial para que lo compruebes tú mismo.`,
          },
          {
            q: "¿Y si la lotería cae en un número que no está pagado?",
            a:
              lottery.fallback === "roulette"
                ? "El premio no se pierde: se sortea esa misma noche en la ruleta en vivo entre todos los números pagados. Siempre hay ganador."
                : "Ese premio queda desierto.",
          },
        ]
      : []),
    ...(reverse
      ? [
          {
            q: "¿Qué es el número al revés?",
            a: `Si la lotería da, por ejemplo, 37, el 73 gana el ${reverse.title.toLowerCase()} (${formatCOP(reverse.value)}). Así hay una segunda oportunidad con el mismo resultado oficial.`,
          },
        ]
      : []),
    {
      q: "¿Cómo sé que la ruleta no es trampa?",
      a: "La ruleta no la decide nadie de aquí. Antes de girar se publica la lista de números que participan y una ronda futura de drand, un servicio público de números aleatorios que mantienen Cloudflare, universidades y otras organizaciones. Cuando sale esa ronda, el ganador queda determinado y con el botón “Verificar yo mismo” tu celular lo comprueba directamente con drand.",
    },
    { q: "¿Qué pasa si no termino de pagar?", a: `Si a la fecha límite tu número no está pagado completo, no participa. Habla con quien organiza sobre lo que ya abonaste.` },
    { q: "¿Puedo ganar más de un premio?", a: "Sí con la lotería, pero un mismo número solo puede ganar una ruleta. Si sale de nuevo, ya no participa en las siguientes." },
    { q: "¿Quién ve mis datos?", a: "Tu WhatsApp solo lo ve quien organiza. En el tablero público solo aparece tu primer nombre." },
  ];

  return (
    <div className="space-y-10">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="glass relative rounded-[24px] p-5"
          >
            <span className="num absolute right-5 top-4 font-display text-5xl font-black text-white/[0.06]">{i + 1}</span>
            <s.icon className="size-7 text-[var(--accent)]" aria-hidden />
            <h3 className="mt-3 font-display text-lg font-extrabold">{s.title}</h3>
            <p className="mt-1 text-sm text-[var(--ink)]/75">{s.text}</p>
          </motion.li>
        ))}
      </ol>

      <div>
        <h3 className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold">
          <ShieldCheck className="size-6 text-[var(--secondary)]" aria-hidden /> Preguntas frecuentes
        </h3>
        <ul className="space-y-2">
          {faq.map((f) => (
            <Faq key={f.q} {...f} />
          ))}
        </ul>
      </div>

      <p className="flex items-start gap-2 text-xs text-[var(--ink)]/50">
        <Coins className="mt-0.5 size-4 shrink-0" aria-hidden />
        Los resultados de lotería vienen de la fuente oficial. Las ruletas usan aleatoriedad pública de drand (League of Entropy).
      </p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="glass overflow-hidden rounded-2xl">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold">
        {q}
        <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <p className="px-5 pb-5 text-sm text-[var(--ink)]/75">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
