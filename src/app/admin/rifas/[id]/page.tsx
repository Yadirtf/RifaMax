import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminRaffle from "@/components/admin/AdminRaffle";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { getBundle } from "@/lib/data";
import { getRepo } from "@/lib/repo";
import { readChats, TELEGRAM_SETTING, telegramToken } from "@/lib/telegram";
import { canSchedule, DRAND_SIMULATED, rouletteCandidates } from "@/lib/draws";
import { LOTTERIES } from "@/lib/lotteries";
import { getTheme } from "@/lib/themes";
import { howLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function AdminRafflePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const b = await getBundle({ id: (await params).id });
  if (!b) notFound();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const theme = getTheme(b.raffle.theme);
  const repo = getRepo();
  const [events, chat] = await Promise.all([
    repo.listEvents(b.raffle.id, 60).catch(() => []),
    repo.getSetting<unknown>(TELEGRAM_SETTING).catch(() => null),
  ]);

  return (
    <AdminShell theme={b.raffle.theme} title={b.raffle.name}>
      <AdminRaffle
        raffle={b.raffle}
        tickets={b.tickets}
        publicUrl={`${origin}/rifa/${b.raffle.slug}`}
        palette={{ primary: theme.primary, secondary: theme.secondary, accent: theme.accent, ink: theme.ink }}
        prizeMeta={Object.fromEntries(
          b.raffle.prizes.map((p) => [
            p.id,
            {
              howLabel: howLabel(p, b.raffle),
              candidates: rouletteCandidates(b.raffle, b.tickets, p),
              canSchedule: canSchedule(p),
              automaticLottery: p.method === "lottery" && !!LOTTERIES[p.lotteryKey ?? ""]?.automatic,
            },
          ]),
        )}
        simulated={DRAND_SIMULATED}
        events={events}
        telegram={{ configured: !!telegramToken(), chats: readChats(chat) }}
      />
    </AdminShell>
  );
}
