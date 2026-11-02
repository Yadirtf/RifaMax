"use client";

import { Copy, Download, ImageIcon, Loader2, RefreshCw, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { ticketState } from "@/lib/raffle";
import type { Raffle, Ticket } from "@/lib/types";

/** Firma del tablero para saber si la imagen generada quedó vieja. */
function boardKey(raffle: Raffle, tickets: Ticket[]) {
  return tickets
    .map((t) => `${t.number}:${ticketState(t, raffle.price)}`)
    .sort()
    .join(",");
}

/** Genera la imagen del tablero para el estado de WhatsApp, con el texto listo para copiar. */
export interface StoryState {
  src: string;
  key: string;
}

export default function StoryCard({
  raffle,
  tickets,
  publicUrl,
  story,
  onStory,
}: {
  raffle: Raffle;
  tickets: Ticket[];
  publicUrl: string;
  /** Vive en el componente padre para no perder la imagen al cambiar de pestaña. */
  story: StoryState | null;
  onStory: (s: StoryState | null) => void;
}) {
  const toast = useToast();
  const src = story?.src ?? null;
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const key = useMemo(() => boardKey(raffle, tickets), [raffle, tickets]);
  const stale = story !== null && story.key !== key;
  const free = raffle.numberCount - tickets.length;

  const caption =
    free > 0
      ? `${free === 1 ? "¡Queda 1 número!" : `Quedan ${free} números`} 🎄 Mira cuáles están libres aquí 👉 ${publicUrl}\nO responde QUIERO y te aparto el tuyo.`
      : `¡Todos los números tienen dueño! 🎉 Sigue el sorteo aquí 👉 ${publicUrl}`;

  const generate = () => {
    setLoading(true);
    onStory({ key, src: `/admin/rifas/${raffle.id}/estado?t=${Date.now()}` });
  };

  const share = async () => {
    if (!src) return;
    setSharing(true);
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], `estado-${raffle.slug}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.clipboard?.writeText(caption).catch(() => {});
        await navigator.share({ files: [file], text: caption });
      } else {
        toast({ ok: false, message: "Este navegador no puede compartir imágenes. Descárgala y súbela a tu estado." });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast({ ok: false, message: "No se pudo compartir. Descarga la imagen." });
    } finally {
      setSharing(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast({ ok: true, message: "Texto copiado. Pégalo al subir el estado." });
    } catch {
      toast({ ok: false, message: "No se pudo copiar. Selecciónalo y cópialo a mano." });
    }
  };

  return (
    <section className="glass rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Para tu estado</p>
          <h2 className="mt-1 font-display text-xl font-extrabold">Imagen del tablero</h2>
          <p className="mt-1 text-sm text-[var(--ink)]/65">Con los números libres, separados y pagados de este momento.</p>
        </div>
        <ImageIcon className="size-6 shrink-0 text-[var(--accent)]" aria-hidden />
      </div>

      {src && (
        <div className="relative mx-auto mt-4 aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Vista previa de la imagen para el estado"
            className={`size-full object-cover transition ${loading ? "opacity-30 blur-sm" : ""}`}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              onStory(null);
              toast({ ok: false, message: "No se pudo generar la imagen. Intenta de nuevo." });
            }}
          />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-semibold">
              <Loader2 className="size-7 animate-spin" aria-hidden /> Generando…
            </div>
          )}
        </div>
      )}

      {stale && !loading && (
        <p className="mt-3 rounded-xl bg-[var(--accent)]/15 px-3 py-2 text-sm font-semibold text-[var(--accent)]" role="status">
          El tablero cambió desde esta imagen. Genérala de nuevo.
        </p>
      )}

      <div className="mt-4 grid gap-2">
        <button
          onClick={generate}
          disabled={loading}
          className="btn-gold inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-display font-bold disabled:opacity-60"
        >
          <RefreshCw className={`size-5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {src ? "Generar de nuevo" : "Generar imagen"}
        </button>
        {src && !loading && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={share}
              disabled={sharing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 font-bold text-[#04260f] disabled:opacity-60"
            >
              <Share2 className="size-5" aria-hidden /> Compartir
            </button>
            <a
              href={`${src}&descargar=1`}
              download={`estado-${raffle.slug}.png`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-bold ring-1 ring-white/15 hover:bg-white/15"
            >
              <Download className="size-5" aria-hidden /> Descargar
            </a>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-black/25 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]/60">Texto para el estado</span>
          <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--accent)] hover:bg-white/10">
            <Copy className="size-4" aria-hidden /> Copiar
          </button>
        </div>
        <p className="whitespace-pre-line break-words text-sm text-[var(--ink)]/85">{caption}</p>
        <p className="mt-2 text-xs text-[var(--ink)]/50">El enlace se puede tocar si va en el texto del estado, no dentro de la imagen.</p>
      </div>
    </section>
  );
}
