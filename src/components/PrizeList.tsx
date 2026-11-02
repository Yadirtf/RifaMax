import type { Draw, Prize, Raffle } from "@/db/schema";
import { digitsFor, formatCOP, formatDate, formatNumber } from "@/lib/raffle";
import DrawReplay from "./DrawReplay";

const KIND_ICON: Record<Prize["kind"], string> = { cash: "💵", item: "🎁", refund: "↩️" };

export function methodLabel(prize: Prize, raffle: Raffle): string {
  if (prize.method === "lottery")
    return `Últimas ${digitsFor(raffle.numberCount)} cifras de la ${prize.lotteryName ?? "lotería"}`;
  if (prize.method === "reverse") return `Número invertido del premio ${prize.sourcePosition}`;
  return "Ruleta en vivo";
}

interface Props {
  raffle: Raffle;
  prizes: Prize[];
  draws: Map<number, Draw>;
  ownerOf: (n: number) => string | undefined;
}

export default function PrizeList({ raffle, prizes, draws, ownerOf }: Props) {
  return (
    <ol className="space-y-3">
      {prizes.map((p) => {
        const d = draws.get(p.id);
        return (
          <li key={p.id} className="relative overflow-hidden rounded-2xl bg-[var(--surface)] p-4 shadow">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/20 text-2xl">{KIND_ICON[p.kind]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="font-bold">{p.title}</h3>
                  <span className="font-black text-[var(--accent)]">
                    {p.kind === "item" ? `~${formatCOP(p.value)}` : formatCOP(p.value)}
                  </span>
                </div>
                {p.description && <p className="text-sm text-white/75">{p.description}</p>}
                <p className="mt-1 text-xs text-white/55">
                  {methodLabel(p, raffle)} · {formatDate(p.drawDate)}
                  {p.paidBefore && ` · pagados hasta el ${formatDate(p.paidBefore)}`}
                </p>

                {d?.status === "committed" && (
                  <div className="mt-3 rounded-lg bg-black/25 p-3 text-xs">
                    {d.note && <p className="mb-1 text-white/85">{d.note}</p>}
                    <p className="font-semibold text-[var(--accent)]">Ruleta lista para girar</p>
                    <p className="break-all font-mono text-white/60">hash: {d.seedHash}</p>
                  </div>
                )}

                {d?.status === "void" && <p className="mt-3 rounded-lg bg-black/25 p-3 text-sm">{d.note}</p>}

                {d?.status === "done" && d.winningNumber !== null && (
                  <div className="mt-3 rounded-lg bg-black/25 p-3">
                    <div className="flex items-center gap-3">
                      <span className="pop flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-2xl font-black text-black">
                        {formatNumber(d.winningNumber, raffle.numberCount)}
                      </span>
                      <div className="text-sm">
                        <p className="font-bold">¡Ganador{ownerOf(d.winningNumber) ? `: ${ownerOf(d.winningNumber)}` : ""}!</p>
                        <p className="text-white/70">{d.note}</p>
                      </div>
                    </div>
                    {d.eligible && d.seed && d.seedHash && (
                      <DrawReplay
                        eligible={JSON.parse(d.eligible)}
                        labels={(JSON.parse(d.eligible) as number[]).map((n) => formatNumber(n, raffle.numberCount))}
                        winningNumber={d.winningNumber}
                        seed={d.seed}
                        seedHash={d.seedHash}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
