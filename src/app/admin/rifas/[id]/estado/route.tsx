import { ImageResponse } from "next/og";
import { isAdmin } from "@/lib/auth";
import { ogFonts } from "@/lib/og";
import { getRepo } from "@/lib/repo";
import { STORY_SIZE, StoryImage } from "@/lib/story";

export const dynamic = "force-dynamic";

/** Imagen para el estado de WhatsApp con el tablero tal como está ahora. Solo para el panel. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("No autorizado", { status: 401 });
  const repo = getRepo();
  const raffle = await repo.getRaffle({ id: (await params).id });
  if (!raffle) return new Response("No existe", { status: 404 });
  const tickets = await repo.listTickets(raffle.id);
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const res = new ImageResponse(<StoryImage raffle={raffle} tickets={tickets} link={`${host}/rifa/${raffle.slug}`} now={new Date()} />, {
    ...STORY_SIZE,
    fonts: await ogFonts(),
  });
  res.headers.set("Cache-Control", "private, no-store");
  if (url.searchParams.has("descargar")) {
    res.headers.set("Content-Disposition", `attachment; filename="estado-${raffle.slug}.png"`);
  }
  return res;
}
