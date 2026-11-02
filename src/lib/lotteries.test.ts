import { describe, expect, it } from "vitest";
import { fetchOfficialResult, parseMedellinResults } from "./lotteries";

const HTML = `
<div class="elementor"><h2>Sorteo número 4859 del 30 de Octubre de 2026</h2>
<div><span>Premio Mayor</span><p>Número</p><p><strong>2168</strong></p><p>Serie</p><p>056</p></div>
<div><span>Seco</span><p>Número 1234</p><p>Serie 999</p></div>
<h2>Sorteo número 4866 del 18 de Diciembre de 2026</h2>
<p>Número:&nbsp;4837</p><p>Serie: 123</p>
</div>`;

describe("Lotería de Medellín", () => {
  it("lee sorteos, fecha, número y serie del premio mayor", () => {
    expect(parseMedellinResults(HTML)).toEqual([
      { drawNumber: "4859", date: "2026-10-30", number: "2168", serie: "056" },
      { drawNumber: "4866", date: "2026-12-18", number: "4837", serie: "123" },
    ]);
  });

  it("devuelve el sorteo de la fecha pedida o explica cuál es el último", async () => {
    const fake = (async () => new Response(HTML)) as unknown as typeof fetch;
    const ok = await fetchOfficialResult("medellin", "2026-12-18", fake);
    expect(ok).toEqual({ ok: true, result: { drawNumber: "4866", date: "2026-12-18", number: "4837", serie: "123" } });
    const missing = await fetchOfficialResult("medellin", "2026-12-25", fake);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.message).toContain("4866");
  });
});
