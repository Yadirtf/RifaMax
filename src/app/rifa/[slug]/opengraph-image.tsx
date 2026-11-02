import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { OgCard, ogFonts } from "@/lib/og";
import { formatCOP } from "@/lib/raffle";
import { getRepo } from "@/lib/repo";

export const alt = BRAND.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const shortDate = (d: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)).replace(".", "");

export default async function RaffleImage({ params }: { params: Promise<{ slug: string }> }) {
  const raffle = await getRepo().getRaffle({ slug: (await params).slug });
  const fonts = await ogFonts();
  if (!raffle) {
    return new ImageResponse(<OgCard title="Rifa no encontrada" subtitle={BRAND.tagline} chips={[]} footer={BRAND.name} />, { ...size, fonts });
  }
  const total = raffle.prizes.reduce((s, p) => s + p.value, 0);
  const lottery = raffle.prizes.some((p) => p.method === "lottery");
  const roulette = raffle.prizes.some((p) => p.method === "roulette");
  return new ImageResponse(
    <OgCard
      title={raffle.name}
      subtitle={`${raffle.prizes.length} formas de ganar · ${formatCOP(total)} en premios`}
      chips={[`${formatCOP(raffle.price)} por número`, `Abonos desde ${formatCOP(raffle.minDeposit)}`, `Sorteo ${shortDate(raffle.drawDate)}`]}
      footer={[lottery && "Lotería oficial", roulette && "Ruleta en vivo verificable"].filter(Boolean).join(" · ") || BRAND.tagline}
    />,
    { ...size, fonts },
  );
}
