import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import Decorations from "@/components/Decorations";
import NumberBoard, { type BoardCell } from "@/components/NumberBoard";
import PrizeList from "@/components/PrizeList";
import { getRaffleBySlug } from "@/lib/data";
import { colombiaDate, formatCOP, formatDate, formatNumber, ticketState } from "@/lib/raffle";
import { getTheme, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const b = await getRaffleBySlug((await params).slug);
  return { title: b ? `${b.raffle.name} · RifaMax` : "RifaMax", description: b?.raffle.description };
}

function daysUntil(date: string): number {
  const today = colombiaDate(new Date().toISOString());
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export default async function RafflePage({ params }: Params) {
  const b = await getRaffleBySlug((await params).slug);
  if (!b || b.raffle.status === "draft") notFound();
  const { raffle } = b;
  const theme = getTheme(raffle.theme);

  const byNumber = new Map(b.tickets.map((t) => [t.number, t]));
  const firstName = (n: number) => byNumber.get(n)?.player.name.split(" ")[0];
  const cells: BoardCell[] = Array.from({ length: raffle.numberCount }, (_, n) => {
    const t = byNumber.get(n);
    return { number: n, label: formatNumber(n, raffle.numberCount), state: ticketState(t, raffle.price), owner: t ? firstName(n) : undefined };
  });
  const count = (s: BoardCell["state"]) => cells.filter((c) => c.state === s).length;
  const paid = count("paid");
  const taken = raffle.numberCount - count("free");
  const totalPrizes = b.prizes.reduce((s, p) => s + p.value, 0);
  const days = daysUntil(raffle.drawDate);
  const open = raffle.status === "active" && colombiaDate(new Date().toISOString()) <= raffle.paymentDeadline;

  return (
    <main className="themed relative" style={themeStyle(theme)}>
      <Decorations items={theme.decorations} />
      <AutoRefresh />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
        <header className="text-center">
          <p className="text-4xl">{theme.emoji}</p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">{raffle.name}</h1>
          <p className="mt-2 text-white/80">{theme.tagline}</p>
          <div className="mx-auto mt-5 grid max-w-2xl grid-cols-3 gap-2 text-center">
            <Stat label="por número" value={formatCOP(raffle.price)} />
            <Stat label="en premios" value={formatCOP(totalPrizes)} />
            <Stat label={days > 0 ? "días para el sorteo" : "sorteo"} value={days > 0 ? String(days) : days === 0 ? "¡Hoy!" : "Jugado"} />
          </div>
        </header>

        <section className="mt-8 rounded-2xl bg-[var(--surface)] p-4">
          <div className="flex justify-between text-sm">
            <span>
              <b>{taken}</b> de {raffle.numberCount} apartados · <b>{paid}</b> pagados
            </span>
            <span className="text-white/70">quedan {raffle.numberCount - taken}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/30">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${(taken / raffle.numberCount) * 100}%` }} />
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section>
            <h2 className="mb-3 text-xl font-bold">Elige tu número</h2>
            {!open && <p className="mb-3 rounded-lg bg-black/30 p-3 text-sm">La venta de números está cerrada.</p>}
            <NumberBoard
              slug={raffle.slug}
              raffleName={raffle.name}
              cells={cells}
              price={raffle.price}
              minDeposit={raffle.minDeposit}
              paymentInfo={raffle.paymentInfo}
              organizerPhone={raffle.organizerPhone}
              open={open}
            />

            <div className="mt-6 rounded-2xl bg-[var(--surface)] p-4 text-sm">
              <h2 className="mb-2 text-lg font-bold">Cómo se juega</h2>
              <ol className="list-decimal space-y-1.5 pl-5 text-white/85">
                <li>Aparta tu número con tu nombre y WhatsApp.</li>
                <li>Abona desde {formatCOP(raffle.minDeposit)} cuando quieras. No tienes que pagar todo de una.</li>
                <li>Termina de pagar antes del {formatDate(raffle.paymentDeadline)} para participar.</li>
                <li>Paga temprano: algunos premios son solo para quienes ya pagaron completo.</li>
                <li>Si la lotería cae en un número no pagado, ese premio se sortea en ruleta entre los pagados. Siempre hay ganador.</li>
              </ol>
              {raffle.paymentInfo && <p className="mt-3 rounded-lg bg-black/20 p-3">{raffle.paymentInfo}</p>}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold">Premios: {b.prizes.length} formas de ganar</h2>
            <PrizeList raffle={raffle} prizes={b.prizes} draws={b.draws} ownerOf={firstName} />
            <p className="mt-4 text-xs text-white/50">
              Las ruletas son verificables: antes de girar se publica un hash de la semilla, y después cualquiera puede comprobar el resultado.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] px-2 py-3">
      <p className="text-lg font-black text-[var(--accent)] sm:text-2xl">{value}</p>
      <p className="text-xs text-white/70">{label}</p>
    </div>
  );
}
