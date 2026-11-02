import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RifaMax",
  description: "Rifas interactivas: abona a tu ritmo, varios premios y ruleta en vivo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
