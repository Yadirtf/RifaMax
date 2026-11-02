import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { OgCard, ogFonts } from "@/lib/og";

export const alt = BRAND.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    <OgCard
      title="Juega con confianza"
      subtitle="Abona a tu ritmo y gana con la lotería oficial o la ruleta en vivo."
      chips={["Resultados verificables", "Pago por abonos"]}
      footer="Lotería de Medellín · Ruleta en vivo con drand"
    />,
    { ...size, fonts: await ogFonts() },
  );
}
