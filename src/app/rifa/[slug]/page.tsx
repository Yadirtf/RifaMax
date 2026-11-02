import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RaffleView from "@/components/public/RaffleView";
import { BRAND } from "@/lib/brand";
import { getBundle } from "@/lib/data";
import { colombiaDate } from "@/lib/raffle";
import { getTheme, themeStyle } from "@/lib/themes";
import { toPublicView } from "@/lib/view";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const b = await getBundle({ slug: (await params).slug });
  if (!b) return {};
  return {
    title: b.raffle.name,
    description: b.raffle.description,
    openGraph: { title: `${b.raffle.name} · ${BRAND.name}`, description: b.raffle.description },
  };
}

export default async function RafflePage({ params }: Params) {
  const b = await getBundle({ slug: (await params).slug });
  if (!b || b.raffle.status === "draft") notFound();
  const theme = getTheme(b.raffle.theme);
  const open = b.raffle.status === "active" && colombiaDate(new Date().toISOString()) <= b.raffle.paymentDeadline;
  return (
    <div className="stage" style={themeStyle(theme)}>
      <RaffleView view={toPublicView(b)} theme={theme} open={open} />
    </div>
  );
}
