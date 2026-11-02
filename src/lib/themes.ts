/** Temas por temporada. Agregar uno nuevo es agregar una entrada aquí. */
export interface Theme {
  key: string;
  label: string;
  emoji: string;
  tagline: string;
  /** Colores: fondo, superficie, primario, secundario, acento. */
  bg: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  /** Emojis que caen como decoración. */
  decorations: string[];
}

export const themes: Record<string, Theme> = {
  navidad: {
    key: "navidad",
    label: "Navidad",
    emoji: "🎄",
    tagline: "Juega, abona a tu ritmo y gana en Navidad",
    bg: "#0f2e1f",
    surface: "#173d2a",
    primary: "#c8102e",
    secondary: "#1f7a4d",
    accent: "#f5c542",
    decorations: ["❄️", "⭐", "🎁", "❄️"],
  },
  "amor-amistad": {
    key: "amor-amistad",
    label: "Amor y Amistad",
    emoji: "💛",
    tagline: "Juega con tus amigos y gana en septiembre",
    bg: "#3b0d2a",
    surface: "#521539",
    primary: "#e63972",
    secondary: "#a12a8f",
    accent: "#ffd166",
    decorations: ["💛", "💌", "✨"],
  },
  madres: {
    key: "madres",
    label: "Día de la Madre",
    emoji: "🌷",
    tagline: "Un regalo para mamá puede salir de aquí",
    bg: "#2e1a3d",
    surface: "#432657",
    primary: "#d6589f",
    secondary: "#7c4dbd",
    accent: "#ffe08a",
    decorations: ["🌷", "🌸", "💐"],
  },
  siembra: {
    key: "siembra",
    label: "Siembra",
    emoji: "🌱",
    tagline: "Siembra un número y cosecha un premio",
    bg: "#1f2a12",
    surface: "#2f3d1c",
    primary: "#7cb342",
    secondary: "#8d6e3f",
    accent: "#ffca28",
    decorations: ["🌱", "🌻", "☀️"],
  },
  generico: {
    key: "generico",
    label: "General",
    emoji: "🎟️",
    tagline: "Más de una forma de ganar",
    bg: "#14172b",
    surface: "#1e2340",
    primary: "#5b6cff",
    secondary: "#2bb3a3",
    accent: "#ffcc4d",
    decorations: ["✨", "🎟️", "⭐"],
  },
};

export function getTheme(key: string): Theme {
  return themes[key] ?? themes.generico;
}

export function themeStyle(theme: Theme): React.CSSProperties {
  return {
    "--bg": theme.bg,
    "--surface": theme.surface,
    "--primary": theme.primary,
    "--secondary": theme.secondary,
    "--accent": theme.accent,
  } as React.CSSProperties;
}
