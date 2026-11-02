import { ImageResponse } from "next/og";
import { OgLogoMark, ogFonts } from "@/lib/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(<OgLogoMark size={64} />, { ...size, fonts: await ogFonts() });
}
