/** Marca de quien organiza. Se muestra en la página, el panel y las vistas previas de WhatsApp. */
export const BRAND = {
  name: "Rifa de Adrian y Tatiana",
  monogram: ["A", "&", "T"] as const,
  tagline: "Rifas transparentes: lotería oficial y ruleta en vivo verificable.",
  /** Fucsia → naranja → dorado. */
  colors: { a: "#ff2d87", b: "#ff6a3d", c: "#ffc93c", deep: "#2b0b3d", violet: "#6b2bd9", cream: "#fff8ec" },
};

/** Silueta del boleto (viewBox 0 0 120 120): esquinas redondeadas y muescas a los lados. */
export const TICKET_PATH =
  "M25,34 H95 A9,9 0 0 1 104,43 V52 A8,8 0 0 0 104,68 V77 A9,9 0 0 1 95,86 H25 A9,9 0 0 1 16,77 V68 A8,8 0 0 0 16,52 V43 A9,9 0 0 1 25,34 Z";
export const HEART_PATH = "M94,66 C86,60 86,54 90,53 C92,52.5 93.5,53.5 94,55 C94.5,53.5 96,52.5 98,53 C102,54 102,60 94,66 Z";
export const SPARKLE_PATH = "M100,10 C101,18 104,21 112,22 C104,23 101,26 100,34 C99,26 96,23 88,22 C96,21 99,18 100,10 Z";
