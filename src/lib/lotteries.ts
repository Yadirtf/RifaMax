/**
 * Loterías oficiales de Colombia. Ninguna ofrece una API pública, así que:
 * - Cada una tiene el enlace oficial de resultados para que el jugador verifique.
 * - Para agregar otra lotería basta una entrada aquí (y un lector si se quiere automática).
 * - La Lotería de Medellín se consulta automáticamente leyendo su página
 *   oficial de resultados; quien organiza confirma antes de aplicar.
 */

export interface LotteryInfo {
  key: string;
  name: string;
  /** Día en que juega (informativo). */
  day: string;
  resultsUrl: string;
  /** true si podemos leer el resultado de la página oficial. */
  automatic: boolean;
}

export const LOTTERIES: Record<string, LotteryInfo> = {
  medellin: {
    key: "medellin",
    name: "Lotería de Medellín",
    day: "viernes",
    resultsUrl: "https://loteriademedellin.com.co/resultados/",
    automatic: true,
  },
};

export function lotteryInfo(key: string | undefined): LotteryInfo {
  return LOTTERIES[key ?? ""] ?? LOTTERIES.medellin;
}

const MONTHS: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

export interface OfficialResult {
  drawNumber: string;
  date: string;
  number: string;
  serie?: string;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/\s+/g, " ");
}

/**
 * Lee los resultados publicados en loteriademedellin.com.co/resultados.
 * La página muestra bloques como:
 *   "Sorteo número 4859 del 30 de Octubre de 2026 … Número 2168 … Serie 056"
 * El primer número/serie después del encabezado es el premio mayor.
 */
export function parseMedellinResults(html: string): OfficialResult[] {
  const text = htmlToText(html);
  const re = /Sorteo\s+(?:n[uú]mero|No\.?|N°)\s*(\d{1,5})\s+del?\s+(\d{1,2})\s+de\s+([A-Za-zñÑ]+)\s+(?:de\s+)?(\d{4})/gi;
  const heads = [...text.matchAll(re)];
  const out: OfficialResult[] = [];
  heads.forEach((m, i) => {
    const month = MONTHS[m[3].toLowerCase()];
    if (!month) return;
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const block = text.slice(m.index! + m[0].length, end);
    const num = block.match(/N[uú]mero\s*:?\s*(\d{4})\b/i);
    if (!num) return;
    const serie = block.match(/Serie\s*:?\s*(\d{3})\b/i);
    out.push({
      drawNumber: m[1],
      date: `${m[4]}-${month}-${m[2].padStart(2, "0")}`,
      number: num[1],
      serie: serie?.[1],
    });
  });
  return out;
}

/** Consulta la página oficial y devuelve el resultado de la fecha pedida, si ya está publicado. */
export async function fetchOfficialResult(
  key: string,
  date: string,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: true; result: OfficialResult } | { ok: false; message: string; latest?: OfficialResult }> {
  const info = LOTTERIES[key];
  if (!info?.automatic) return { ok: false, message: `${info?.name ?? "Esta lotería"} no tiene consulta automática. Digita el resultado.` };
  let html: string;
  try {
    const res = await fetcher(info.resultsUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { "user-agent": "Mozilla/5.0 (RifaMax; consulta de resultados)" },
    });
    if (!res.ok) return { ok: false, message: `La página oficial respondió ${res.status}. Intenta más tarde o digita el resultado.` };
    html = await res.text();
  } catch {
    return { ok: false, message: "No se pudo abrir la página oficial. Intenta más tarde o digita el resultado." };
  }
  const results = parseMedellinResults(html);
  const found = results.find((r) => r.date === date);
  if (found) return { ok: true, result: found };
  const latest = [...results].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    ok: false,
    latest,
    message: latest
      ? `Aún no está publicado el sorteo del ${date}. El último publicado es el ${latest.drawNumber} del ${latest.date}.`
      : "No se encontraron resultados en la página oficial. Digita el resultado.",
  };
}
