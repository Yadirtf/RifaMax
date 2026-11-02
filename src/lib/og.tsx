import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND, HEART_PATH, SPARKLE_PATH, TICKET_PATH } from "./brand";

const C = BRAND.colors;

/** Bricolage Grotesque para las imágenes generadas (satori no lee woff2). */
export async function ogFonts() {
  const dir = join(process.cwd(), "assets/fonts");
  const [w700, w800] = await Promise.all([
    readFile(join(dir, "bricolage-grotesque-latin-700-normal.woff")),
    readFile(join(dir, "bricolage-grotesque-latin-800-normal.woff")),
  ]);
  return [
    { name: "Bricolage", data: w700, weight: 700 as const, style: "normal" as const },
    { name: "Bricolage", data: w800, weight: 800 as const, style: "normal" as const },
  ];
}

/** El mismo logo de <LogoMark/>, armado con las piezas que entiende satori. */
export function OgLogoMark({ size, rounded = true }: { size: number; rounded?: boolean }) {
  const u = size / 120;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        position: "relative",
        borderRadius: rounded ? 30 * u : 0,
        overflow: "hidden",
        backgroundImage: `linear-gradient(135deg, ${C.a}, ${C.b} 55%, ${C.c})`,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ position: "absolute", left: 0, top: 0 }}>
        <ellipse cx="60" cy="-6" rx="78" ry="34" fill="#fff" opacity="0.14" />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: size, height: size, display: "flex", transform: "rotate(-8deg)" }}>
        <svg width={size} height={size} viewBox="0 0 120 120" style={{ position: "absolute", left: 0, top: 0 }}>
          <path d={TICKET_PATH} fill="#000" opacity="0.18" transform="translate(2 4)" />
          <path d={TICKET_PATH} fill={C.cream} />
          <line x1="82" y1="39" x2="82" y2="81" stroke={C.b} strokeWidth="2" strokeDasharray="3 3.5" strokeLinecap="round" opacity="0.7" />
          <path d={HEART_PATH} fill={C.a} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 16 * u,
            width: 66 * u,
            top: 34 * u,
            height: 52 * u,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Bricolage",
            fontWeight: 800,
            fontSize: 27 * u,
            letterSpacing: -1 * u,
            lineHeight: 1,
          }}
        >
          <span style={{ color: C.a }}>A</span>
          <span style={{ color: C.b }}>&</span>
          <span style={{ color: C.violet }}>T</span>
        </div>
      </div>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={SPARKLE_PATH} fill="#fff" opacity="0.95" />
      </svg>
    </div>
  );
}

export interface OgCardProps {
  title: string;
  subtitle: string;
  chips: string[];
  footer: string;
}

/** Tarjeta 1200×630 para la vista previa de enlaces (WhatsApp, Facebook, X). */
export function OgCard({ title, subtitle, chips, footer }: OgCardProps) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Bricolage",
        color: C.cream,
        backgroundColor: "#160822",
        backgroundImage: `radial-gradient(circle at 88% 18%, ${C.a}66, transparent 42%), radial-gradient(circle at 70% 110%, ${C.c}55, transparent 45%), radial-gradient(circle at 0% 0%, ${C.violet}55, transparent 45%)`,
      }}
    >
      {/* confeti */}
      {[
        [620, 70, 14, C.c],
        [700, 540, 10, C.a],
        [560, 470, 8, C.cream],
        [1130, 560, 16, C.b],
        [1150, 300, 8, C.cream],
        [520, 120, 6, C.a],
      ].map(([x, y, s, col], i) => (
        <div
          key={i}
          style={{ position: "absolute", left: x as number, top: y as number, width: s as number, height: s as number, borderRadius: 99, backgroundColor: col as string, opacity: 0.8 }}
        />
      ))}

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 0 52px 64px", width: 760 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <OgLogoMark size={84} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 22, fontWeight: 700, opacity: 0.75, letterSpacing: 4, textTransform: "uppercase" }}>Rifa de</span>
            <span
              style={{
                fontSize: 40,
                fontWeight: 800,
                lineHeight: 1.05,
                backgroundImage: `linear-gradient(100deg, #ff4f9a, #ff8a4d 55%, #ffd45c)`,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Adrian y Tatiana
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: title.length > 22 ? 64 : 80, fontWeight: 800, lineHeight: 0.98, letterSpacing: -2 }}>{title}</div>
          <div style={{ marginTop: 18, fontSize: 28, fontWeight: 700, opacity: 0.8, lineHeight: 1.25 }}>{subtitle}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
            {chips.map((c, i) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  padding: "12px 22px",
                  borderRadius: 999,
                  fontSize: 26,
                  fontWeight: 800,
                  color: i === 0 ? "#2b0b3d" : C.cream,
                  ...(i === 0 ? { backgroundImage: `linear-gradient(100deg, ${C.c}, ${C.b})` } : { backgroundColor: "rgba(255,255,255,0.10)" }),
                  border: i === 0 ? "none" : "2px solid rgba(255,255,255,0.18)",
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, opacity: 0.6 }}>{footer}</div>
      </div>

      <div style={{ position: "absolute", right: 70, top: 150, display: "flex", transform: "rotate(6deg)", boxShadow: `0 30px 80px ${C.a}88`, borderRadius: 80 }}>
        <OgLogoMark size={330} />
      </div>
    </div>
  );
}
