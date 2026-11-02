import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: "Abona a tu ritmo y gana con la lotería oficial o la ruleta en vivo verificable.",
  applicationName: BRAND.name,
  openGraph: { siteName: BRAND.name, locale: "es_CO", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07150f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body className="antialiased">{children}</body>
    </html>
  );
}
