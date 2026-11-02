import type { CSSProperties } from "react";

export type Shape = "gift" | "ornament" | "star" | "heart" | "flower" | "leaf" | "coin" | "ticket";

/** Temas por temporada. Agregar uno nuevo es agregar una entrada aquí. */
export interface Theme {
  key: string;
  label: string;
  emoji: string;
  tagline: string;
  /** Fondo profundo, fondo secundario (degradado), color principal, secundario, acento (dorado) y texto. */
  bg: string;
  bg2: string;
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  /** Figuras 3D que flotan en la portada. */
  shapes: Shape[];
}

export const themes: Record<string, Theme> = {
  navidad: {
    key: "navidad",
    label: "Navidad",
    emoji: "🎄",
    tagline: "Abona a tu ritmo, gira la suerte y gana esta Navidad",
    bg: "#07150f",
    bg2: "#0f2a1e",
    primary: "#e23a4f",
    secondary: "#2fa36f",
    accent: "#f4c95d",
    ink: "#fff7e8",
    shapes: ["gift", "ornament", "star", "ornament", "gift", "coin"],
  },
  "amor-amistad": {
    key: "amor-amistad",
    label: "Amor y Amistad",
    emoji: "💛",
    tagline: "Juega con tus amigos y gana en septiembre",
    bg: "#1a0714",
    bg2: "#3a0f2c",
    primary: "#ff4f8b",
    secondary: "#b14fd1",
    accent: "#ffd166",
    ink: "#fff2f7",
    shapes: ["heart", "gift", "heart", "star", "coin"],
  },
  madres: {
    key: "madres",
    label: "Día de la Madre",
    emoji: "🌷",
    tagline: "El regalo para mamá puede salir de aquí",
    bg: "#160c22",
    bg2: "#2c1842",
    primary: "#e05aa8",
    secondary: "#8a5cf0",
    accent: "#ffe08a",
    ink: "#fbf3ff",
    shapes: ["flower", "heart", "gift", "flower", "coin"],
  },
  siembra: {
    key: "siembra",
    label: "Siembra",
    emoji: "🌱",
    tagline: "Siembra un número y cosecha un premio",
    bg: "#0d1508",
    bg2: "#1e2c12",
    primary: "#8cc63f",
    secondary: "#c08a3e",
    accent: "#ffd23f",
    ink: "#f8fbef",
    shapes: ["leaf", "flower", "coin", "leaf", "star"],
  },
  generico: {
    key: "generico",
    label: "General",
    emoji: "🎟️",
    tagline: "Más de una forma de ganar",
    bg: "#0b0d1c",
    bg2: "#171b38",
    primary: "#6c7bff",
    secondary: "#22b8a8",
    accent: "#ffcc4d",
    ink: "#f4f5ff",
    shapes: ["ticket", "coin", "star", "ticket", "coin"],
  },
};

export function getTheme(key: string): Theme {
  return themes[key] ?? themes.generico;
}

export function themeStyle(t: Theme): CSSProperties {
  return {
    "--bg": t.bg,
    "--bg2": t.bg2,
    "--primary": t.primary,
    "--secondary": t.secondary,
    "--accent": t.accent,
    "--ink": t.ink,
  } as CSSProperties;
}
