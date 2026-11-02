import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RifaMax",
  description: "Rifas interactivas: abona a tu ritmo, varios premios, lotería oficial y ruleta en vivo verificable.",
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
