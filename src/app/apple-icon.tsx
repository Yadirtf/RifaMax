import { ImageResponse } from "next/og";
import { OgLogoMark, ogFonts } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS redondea las esquinas por su cuenta. */
export default async function AppleIcon() {
  return new ImageResponse(<OgLogoMark size={180} rounded={false} />, { ...size, fonts: await ogFonts() });
}
