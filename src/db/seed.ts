/**
 * Crea la Rifa Navideña 2026 con la configuración propuesta.
 * Uso: npm run db:seed   (no hace nada si la rifa ya existe)
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { prizes, raffles } from "./schema";

const SLUG = "navidad-2026";

async function main() {
  const existing = await db.select().from(raffles).where(eq(raffles.slug, SLUG));
  if (existing.length > 0) {
    console.log(`La rifa "${SLUG}" ya existe. No se cambió nada.`);
    return;
  }

  const [raffle] = await db
    .insert(raffles)
    .values({
      slug: SLUG,
      name: "Rifa Navideña 2026",
      description:
        "100 números de $20.000. Aparta el tuyo con $5.000 y abona a tu ritmo. Cinco formas de ganar, incluida una para recuperar lo invertido.",
      theme: "navidad",
      numberCount: 100,
      price: 20000,
      minDeposit: 5000,
      paymentDeadline: "2026-12-15",
      drawDate: "2026-12-18",
      paymentInfo: "Nequi o Daviplata al número de quien organiza. Envía el comprobante por WhatsApp.",
      organizerPhone: "",
      status: "active",
    })
    .returning();

  await db.insert(prizes).values([
    {
      raffleId: raffle.id,
      position: 1,
      title: "Premio mayor",
      description: "Últimas 2 cifras de la Lotería de Medellín.",
      kind: "cash",
      value: 500000,
      method: "lottery",
      lotteryName: "Lotería de Medellín",
      drawDate: "2026-12-18",
      fallback: "roulette",
      excludePreviousWinners: false,
    },
    {
      raffleId: raffle.id,
      position: 2,
      title: "Segundo premio",
      description: "Ruleta en vivo entre los números pagados.",
      kind: "cash",
      value: 100000,
      method: "roulette",
      drawDate: "2026-12-18",
    },
    {
      raffleId: raffle.id,
      position: 3,
      title: "Ancheta navideña",
      description: "Ruleta en vivo entre los números pagados.",
      kind: "item",
      value: 150000,
      method: "roulette",
      drawDate: "2026-12-18",
    },
    {
      raffleId: raffle.id,
      position: 4,
      title: "Reintegro",
      description: "El número invertido del premio mayor recupera lo invertido (37 → 73).",
      kind: "refund",
      value: 20000,
      method: "reverse",
      sourcePosition: 1,
      drawDate: "2026-12-18",
      fallback: "roulette",
    },
    {
      raffleId: raffle.id,
      position: 5,
      title: "Bono madrugador",
      description: "El doble de lo que pagaste. Participan quienes pagaron completo hasta el 30 de noviembre.",
      kind: "cash",
      value: 40000,
      method: "roulette",
      drawDate: "2026-11-30",
      paidBefore: "2026-11-30",
    },
  ]);

  console.log(`Rifa creada: /rifa/${SLUG}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
