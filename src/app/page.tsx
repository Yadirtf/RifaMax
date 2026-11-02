import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { listRaffles } from "@/lib/data";
import { formatCOP, formatDate } from "@/lib/raffle";
import { getTheme, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const raffles = (await listRaffles()).filter((r) => r.status !== "draft");
  return (
    <main className="stage" style={themeStyle(getTheme("generico"))}>
      <div className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">RifaMax</p>
        <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">Rifas que dan ganas de jugar.</h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--ink)]/75">
          Abona a tu ritmo, varias formas de ganar, lotería oficial y ruleta en vivo que tú mismo puedes verificar.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {raffles.length === 0 && <p className="text-[var(--ink)]/60">No hay rifas activas en este momento.</p>}
          {raffles.map((r) => {
            const t = getTheme(r.theme);
            return (
              <Link
                key={r.id}
                href={`/rifa/${r.slug}`}
                style={themeStyle(t)}
                className="group relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[var(--bg2)] to-[var(--bg)] p-6 ring-1 ring-white/10 transition hover:-translate-y-1 hover:ring-[var(--accent)]/60"
              >
                <span className="absolute -right-6 -top-6 text-8xl opacity-20 transition group-hover:rotate-12 group-hover:opacity-40" aria-hidden>
                  {t.emoji}
                </span>
                <p className="text-sm font-semibold text-[var(--accent)]">{t.label}</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold">{r.name}</h2>
                <p className="mt-2 text-sm text-[var(--ink)]/70">
                  {formatCOP(r.price)} por número · sorteo {formatDate(r.drawDate)}
                </p>
                <p className="mt-5 inline-flex items-center gap-1 text-sm font-bold">
                  Jugar <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
                </p>
              </Link>
            );
          })}
        </div>
        <Link href="/admin" className="mt-16 inline-block text-sm text-[var(--ink)]/45 underline-offset-4 hover:underline">
          Administrar rifas
        </Link>
      </div>
    </main>
  );
}
