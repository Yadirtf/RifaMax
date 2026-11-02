import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRaffleStatus } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import DrawControls from "@/components/admin/DrawControls";
import RaffleInfoForm from "@/components/admin/RaffleInfoForm";
import TicketTable from "@/components/admin/TicketTable";
import { methodLabel } from "@/components/PrizeList";
import { requireAdmin } from "@/lib/auth";
import { getRaffleById } from "@/lib/data";
import { rouletteCandidates } from "@/lib/draws";
import { formatCOP, formatDate, formatNumber, ticketState } from "@/lib/raffle";
import { getTheme, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

const STATUSES = [
  ["active", "Activa"],
  ["closed", "Cerrada"],
  ["finished", "Terminada"],
  ["draft", "Borrador (oculta)"],
] as const;

export default async function AdminRafflePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const b = await getRaffleById(Number((await params).id));
  if (!b) notFound();
  const { raffle } = b;

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const publicUrl = `${origin}/rifa/${raffle.slug}`;

  const label = (n: number) => formatNumber(n, raffle.numberCount);
  const labelOf = Object.fromEntries(Array.from({ length: raffle.numberCount }, (_, n) => [n, label(n)]));
  const taken = new Set(b.tickets.map((t) => t.number));
  const states = b.tickets.map((t) => ticketState(t, raffle.price));
  const collected = b.tickets.reduce((s, t) => s + t.paidAmount, 0);
  const owed = b.tickets.reduce((s, t) => s + Math.max(0, raffle.price - t.paidAmount), 0);
  const prizesTotal = b.prizes.reduce((s, p) => s + p.value, 0);
  const nameOf = (n: number | null) => (n === null ? null : (b.tickets.find((t) => t.number === n)?.player.name ?? null));

  return (
    <AdminShell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {getTheme(raffle.theme).emoji} {getTheme(raffle.theme).label} · sorteo {formatDate(raffle.drawDate)} · pagos hasta {formatDate(raffle.paymentDeadline)}
          </p>
          <h1 className="text-2xl font-bold">{raffle.name}</h1>
          <Link href={`/rifa/${raffle.slug}`} target="_blank" className="text-sm text-blue-700 underline">
            {publicUrl}
          </Link>
        </div>
        <form action={setRaffleStatus} className="flex items-center gap-2">
          <input type="hidden" name="raffleId" value={raffle.id} />
          <select name="status" defaultValue={raffle.status} className="rounded border px-2 py-1.5 text-sm">
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button className="rounded border px-3 py-1.5 text-sm">Cambiar estado</button>
        </form>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label="Recaudado" value={formatCOP(collected)} />
        <Kpi label="Por cobrar" value={formatCOP(owed)} />
        <Kpi label="Pagados" value={`${states.filter((s) => s === "paid").length} / ${raffle.numberCount}`} />
        <Kpi label="Apartados o abonando" value={String(states.filter((s) => s !== "paid").length)} />
        <Kpi label="Ganancia si se cobra lo apartado" value={formatCOP(collected + owed - prizesTotal)} />
      </div>

      <div className="mt-4">
        <RaffleInfoForm raffleId={raffle.id} description={raffle.description} paymentInfo={raffle.paymentInfo} organizerPhone={raffle.organizerPhone} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-2 text-lg font-bold">Números y abonos</h2>
          <TicketTable
            raffleId={raffle.id}
            raffleName={raffle.name}
            raffleUrl={publicUrl}
            price={raffle.price}
            minDeposit={raffle.minDeposit}
            paymentDeadline={formatDate(raffle.paymentDeadline)}
            tickets={b.tickets.map((t) => ({
              id: t.id,
              number: t.number,
              label: label(t.number),
              name: t.player.name,
              phone: t.player.phone,
              paidAmount: t.paidAmount,
              paidInFullAt: t.paidInFullAt,
            }))}
            freeNumbers={Array.from({ length: raffle.numberCount }, (_, n) => n)
              .filter((n) => !taken.has(n))
              .map((n) => ({ number: n, label: label(n) }))}
          />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Sorteos</h2>
          {b.prizes.map((p) => {
            const d = b.draws.get(p.id);
            return (
              <DrawControls
                key={p.id}
                raffleId={raffle.id}
                prizeId={p.id}
                title={`${p.position}. ${p.title}`}
                method={p.method}
                methodLabel={`${methodLabel(p, raffle)} · ${formatDate(p.drawDate)}${p.paidBefore ? ` · pagados hasta ${formatDate(p.paidBefore)}` : ""}`}
                value={formatCOP(p.value)}
                candidates={rouletteCandidates(b, p)}
                labelOf={labelOf}
                colors={themeStyle(getTheme(raffle.theme))}
                draw={
                  d
                    ? {
                        status: d.status,
                        seedHash: d.seedHash,
                        note: d.note,
                        winningLabel: d.winningNumber === null ? null : label(d.winningNumber),
                        winnerName: nameOf(d.winningNumber),
                        spun: !!d.eligible,
                      }
                    : null
                }
              />
            );
          })}
        </section>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
