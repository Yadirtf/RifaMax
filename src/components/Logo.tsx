import { BRAND, HEART_PATH, SPARKLE_PATH, TICKET_PATH } from "@/lib/brand";

const C = BRAND.colors;

/** Marca: boleto con el monograma A&T sobre un degradado fucsia, naranja y dorado. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label={BRAND.name}>
      <defs>
        <linearGradient id="lm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.a} />
          <stop offset="0.55" stopColor={C.b} />
          <stop offset="1" stopColor={C.c} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="30" fill="url(#lm-bg)" />
      <ellipse cx="60" cy="-6" rx="78" ry="34" fill="#fff" opacity="0.14" />
      <g transform="rotate(-8 60 60)">
        <path d={TICKET_PATH} fill="#000" opacity="0.18" transform="translate(2 4)" />
        <path d={TICKET_PATH} fill={C.cream} />
        <line x1="82" y1="39" x2="82" y2="81" stroke={C.b} strokeWidth="2" strokeDasharray="3 3.5" strokeLinecap="round" opacity="0.7" />
        <path d={HEART_PATH} fill={C.a} />
        <text
          x="49"
          y="69.5"
          textAnchor="middle"
          fontFamily='"Bricolage Grotesque Variable", system-ui, sans-serif'
          fontWeight="800"
          fontSize="27"
          letterSpacing="-1"
        >
          <tspan fill={C.a}>A</tspan>
          <tspan fill={C.b}>&amp;</tspan>
          <tspan fill={C.violet}>T</tspan>
        </text>
      </g>
      <path d={SPARKLE_PATH} fill="#fff" opacity="0.95" />
    </svg>
  );
}

/** Marca con el nombre al lado. */
export function Logo({ size = 36, showName = true, className = "" }: { size?: number; showName?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0 drop-shadow-[0_4px_14px_rgba(255,45,135,0.35)]" />
      {showName && (
        <span className="font-display font-extrabold leading-none tracking-tight">
          Rifa de <span className="brand-text">Adrian y Tatiana</span>
        </span>
      )}
    </span>
  );
}
