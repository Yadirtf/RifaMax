import "server-only";
import { BRAND } from "./brand";
import { OgLogoMark } from "./og";
import { formatCOP, formatNumber, ticketState } from "./raffle";
import type { Raffle, Ticket } from "./types";

const C = BRAND.colors;
export const STORY_SIZE = { width: 1080, height: 1920 };

type Cell = "free" | "held" | "paid";

export interface StoryData {
  raffle: Raffle;
  tickets: Ticket[];
  /** Enlace público, sin https:// */
  link: string;
  now: Date;
}

export function storyCounts(raffle: Raffle, tickets: Ticket[]) {
  const cells: Cell[] = Array.from({ length: raffle.numberCount }, () => "free");
  for (const t of tickets) {
    if (t.number < 0 || t.number >= raffle.numberCount) continue;
    cells[t.number] = ticketState(t, raffle.price) === "paid" ? "paid" : "held";
  }
  const free = cells.filter((c) => c === "free").length;
  const paid = cells.filter((c) => c === "paid").length;
  return { cells, free, paid, held: raffle.numberCount - free - paid };
}

/** Números pseudoaleatorios estables para que la nieve no "salte" entre versiones. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const BULBS = ["#ff2d87", "#ffc93c", "#3ee08f", "#ff6a3d", "#5bc8ff"];

function Garland() {
  // Dos guirnaldas que cuelgan de punta a punta.
  const sag = (x: number, x0: number, x1: number, y0: number, depth: number) => {
    const t = (x - x0) / (x1 - x0);
    return y0 + Math.sin(Math.PI * t) * depth;
  };
  const bulbs: { x: number; y: number; c: string }[] = [];
  for (let i = 0; i < 22; i++) {
    const x = 20 + i * 49;
    const half = x < 540;
    const y = half ? sag(x, -20, 560, 18, 60) : sag(x, 520, 1100, 18, 60);
    bulbs.push({ x, y: y + 14, c: BULBS[i % BULBS.length] });
  }
  return (
    <svg width="1080" height="140" viewBox="0 0 1080 140" style={{ position: "absolute", left: 0, top: 0 }}>
      <path d="M-20,18 Q270,138 560,18" stroke="#2c5a3a" strokeWidth="5" fill="none" />
      <path d="M520,18 Q810,138 1100,18" stroke="#2c5a3a" strokeWidth="5" fill="none" />
      {bulbs.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y + 6} r="26" fill={b.c} fillOpacity="0.22" />
          <rect x={b.x - 7} y={b.y - 12} width="14" height="10" rx="3" fill="#c9b27a" />
          <ellipse cx={b.x} cy={b.y + 8} rx="12" ry="16" fill={b.c} />
          <ellipse cx={b.x - 4} cy={b.y + 2} rx="3.5" ry="6" fill="#fff" fillOpacity="0.55" />
        </g>
      ))}
    </svg>
  );
}

function Snow() {
  const r = rand(42);
  const flakes = Array.from({ length: 70 }, () => ({ x: r() * 1080, y: 120 + r() * 1780, s: 3 + r() * 7, o: 0.25 + r() * 0.6 }));
  return (
    <>
      {flakes.map((f, i) => (
        <div
          key={i}
          style={{ position: "absolute", left: f.x, top: f.y, width: f.s, height: f.s, borderRadius: 99, backgroundColor: `rgba(255,255,255,${f.o.toFixed(2)})` }}
        />
      ))}
    </>
  );
}

/** Chulito dibujado con bordes (más rápido que un SVG en satori). */
function Check({ size, color }: { size: number; color: string }) {
  const w = Math.max(3, Math.round(size * 0.16));
  return (
    <div
      style={{
        width: size * 0.38,
        height: size * 0.7,
        marginTop: -size * 0.12,
        borderRight: `${w}px solid ${color}`,
        borderBottom: `${w}px solid ${color}`,
        borderRadius: 2,
        transform: "rotate(45deg)",
      }}
    />
  );
}

function ChatIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      <path d="M8.6 7.8c.3-.6.6-.6 1-.6h.6c.2 0 .4.1.5.4l.8 1.9c.1.3 0 .5-.1.7l-.6.7c.6 1.2 1.6 2.2 2.8 2.8l.7-.6c.2-.2.4-.2.7-.1l1.9.8c.3.1.4.3.4.5v.6c0 .4 0 .7-.6 1-1 .6-2.4.5-4.3-.6a10 10 0 0 1-3.7-3.7c-1.1-1.9-1.2-3.3-.6-4.3z" fill="#fff" />
    </svg>
  );
}

function Legend({ swatch, label, n }: { swatch: React.ReactNode; label: string; n: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 700 }}>
      {swatch}
      <span style={{ display: "flex" }}>
        <span>{label}</span>
        <span style={{ color: "rgba(255,248,236,0.6)", marginLeft: 10 }}>{n}</span>
      </span>
    </div>
  );
}

const fmtStamp = (d: Date) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" })
    .format(d)
    .replace(/ /g, " ");

/** Imagen vertical 1080×1920 para estados de WhatsApp con el tablero actualizado. */
export function StoryImage({ raffle, tickets, link, now }: StoryData) {
  const { cells, free, paid, held } = storyCounts(raffle, tickets);
  const n = raffle.numberCount;
  const prizes = raffle.prizes.reduce((s, p) => s + p.value, 0);
  const christmas = raffle.theme === "navidad";

  // Tablero: 10 columnas hasta 100 números; si hay más, se ajusta para que quepa.
  const GRID_W = 940;
  const GRID_H_MAX = 900;
  const cols = n <= 100 ? 10 : Math.ceil(Math.sqrt(n * (GRID_W / GRID_H_MAX)));
  const rows = Math.ceil(n / cols);
  const gap = cols > 12 ? 5 : 9;
  const cell = Math.floor(Math.min((GRID_W - gap * (cols - 1)) / cols, (GRID_H_MAX - gap * (rows - 1)) / rows));
  const gridW = cols * cell + (cols - 1) * gap;
  const font = Math.round(cell * 0.42);

  const headline =
    free === 0 ? (
      <span>¡Todos los números tienen dueño!</span>
    ) : free <= Math.max(5, Math.round(n * 0.15)) ? (
      <>
        <span>¡Últimos</span>
        <span style={{ margin: "0 18px", color: C.c }}>{free}</span>
        <span>{free === 1 ? "número!" : "números!"}</span>
      </>
    ) : (
      <>
        <span>Quedan</span>
        <span style={{ margin: "0 18px", color: C.c }}>{free}</span>
        <span>{free === 1 ? "número libre" : "números libres"}</span>
      </>
    );

  const sub =
    free === 0
      ? "Gracias por jugar. ¡Nos vemos en el sorteo!"
      : paid + held > 0
        ? `${paid + held} ya tienen dueño. Si no apartas el tuyo, otro lo hará.`
        : "Escoge el tuyo antes que nadie.";

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        fontFamily: "Bricolage",
        color: C.cream,
        backgroundColor: "#1a0a2a",
        backgroundImage: `radial-gradient(circle at 100% 0%, ${C.a}55, transparent 40%), radial-gradient(circle at 0% 45%, ${C.violet}66, transparent 45%), radial-gradient(circle at 80% 100%, ${C.b}44, transparent 40%), linear-gradient(180deg, #24103a, #170823 60%, #1d0a20)`,
      }}
    >
      <Snow />
      {christmas && <Garland />}

      {/* Encabezado */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: christmas ? 150 : 90 }}>
        <OgLogoMark size={104} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 7, color: C.c }}>{raffle.name.toUpperCase()}</span>
          <span style={{ display: "flex", fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>
            <span>Rifa de&nbsp;</span>
            <span style={{ backgroundImage: "linear-gradient(100deg, #ff4f9a, #ff8a4d 55%, #ffd45c)", backgroundClip: "text", color: "transparent" }}>
              Adrian y Tatiana
            </span>
          </span>
        </div>
      </div>

      {/* Titular */}
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 46, fontSize: free === 0 ? 62 : 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
        {headline}
      </div>
      <div style={{ marginTop: 18, fontSize: 32, fontWeight: 700, color: "rgba(255,248,236,0.85)" }}>{sub}</div>

      {/* Tablero */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 36,
          padding: 26,
          borderRadius: 44,
          backgroundColor: "rgba(255,255,255,0.07)",
          border: "2px solid rgba(255,255,255,0.14)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", width: gridW, gap }}>
          {cells.map((state, i) => {
            const label = formatNumber(i, n);
            const base = {
              width: cell,
              height: cell,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: Math.round(cell * 0.24),
              fontSize: font,
              fontWeight: 800,
              position: "relative" as const,
            };
            if (state === "free")
              return (
                <div key={i} style={{ ...base, backgroundColor: C.cream, color: C.deep, borderBottom: "6px solid #d9c8b4", paddingTop: 6 }}>
                  {label}
                </div>
              );
            if (state === "held")
              return (
                <div key={i} style={{ ...base, backgroundColor: "rgba(255,201,60,0.14)", border: `3px solid ${C.c}`, color: C.c }}>
                  {label}
                </div>
              );
            return (
              <div key={i} style={{ ...base, backgroundImage: `linear-gradient(135deg, ${C.a}, ${C.b})`, color: "#fff" }}>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
                <div style={{ position: "absolute", right: Math.round(cell * 0.1), top: Math.round(cell * 0.08), display: "flex" }}>
                  <Check size={Math.round(cell * 0.32)} color="#fff" />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 40, marginTop: 26 }}>
          <Legend swatch={<div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: C.cream }} />} label="Libre" n={free} />
          <Legend
            swatch={<div style={{ width: 34, height: 34, borderRadius: 9, border: `3px solid ${C.c}`, backgroundColor: "rgba(255,201,60,0.14)" }} />}
            label="Separado"
            n={held}
          />
          <Legend swatch={<div style={{ width: 34, height: 34, borderRadius: 9, backgroundImage: `linear-gradient(135deg, ${C.a}, ${C.b})` }} />} label="Pagado" n={paid} />
        </div>
      </div>

      {/* Datos clave */}
      <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
        {[`${formatCOP(raffle.price)} el número`, `Abonos desde ${formatCOP(raffle.minDeposit)}`, `${formatCOP(prizes)} en premios`].map((t, i) => (
          <div
            key={t}
            style={{
              display: "flex",
              padding: "12px 22px",
              borderRadius: 999,
              fontSize: 27,
              fontWeight: 800,
              ...(i === 2 ? { color: C.c, border: `2px solid ${C.c}88` } : { border: "2px solid rgba(255,255,255,0.2)" }),
            }}
          >
            {t.replace(/ /g, " ")}
          </div>
        ))}
      </div>

      {/* Llamado a la acción */}
      <div style={{ flex: 1 }} />
      {free > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
            width: 940,
            height: 128,
            borderRadius: 999,
            fontSize: 50,
            fontWeight: 800,
            color: "#fff",
            backgroundImage: `linear-gradient(100deg, ${C.a}, ${C.b} 60%, ${C.c})`,
          }}
        >
          <ChatIcon size={56} />
          Responde QUIERO y elige
        </div>
      )}
      <div style={{ marginTop: 22, fontSize: 28, fontWeight: 700, color: "rgba(255,248,236,0.7)" }}>{free > 0 ? `o míralos en ${link}` : link}</div>
      <div style={{ marginTop: 10, marginBottom: 46, fontSize: 24, fontWeight: 700, color: "rgba(255,248,236,0.45)" }}>{`Actualizado el ${fmtStamp(now)}`}</div>
    </div>
  );
}
