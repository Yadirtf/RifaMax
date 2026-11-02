import Link from "next/link";
import { listRaffles } from "@/lib/data";
import { formatCOP, formatDate } from "@/lib/raffle";
import { getTheme, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const raffles = (await listRaffles()).filter((r) => r.status === "active" || r.status === "closed" || r.status === "finished");
  return (
    <main className="themed" style={themeStyle(getTheme("generico"))}>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black">🎟️ RifaMax</h1>
        <p className="mt-2 text-white/80">Rifas con varias formas de ganar, abonos a tu ritmo y ruleta en vivo.</p>
        <div className="mt-8 space-y-3">
          {raffles.length === 0 && <p className="text-white/70">No hay rifas activas en este momento.</p>}
          {raffles.map((r) => {
            const t = getTheme(r.theme);
            return (
              <Link
                key={r.id}
                href={`/rifa/${r.slug}`}
                className="block rounded-2xl p-5 shadow transition hover:scale-[1.01]"
                style={{ background: t.surface, borderLeft: `6px solid ${t.primary}` }}
              >
                <p className="text-sm text-white/70">
                  {t.emoji} {t.label}
                </p>
                <h2 className="text-xl font-bold">{r.name}</h2>
                <p className="text-sm text-white/80">
                  {formatCOP(r.price)} por número · sorteo {formatDate(r.drawDate)}
                </p>
              </Link>
            );
          })}
        </div>
        <Link href="/admin" className="mt-10 inline-block text-sm text-white/50 underline">
          Administrar
        </Link>
      </div>
    </main>
  );
}
