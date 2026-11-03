"use client";

import { BellRing, CheckCircle2, ExternalLink, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { telegramConnectFinish, telegramConnectStart, telegramDisconnect, telegramTest } from "@/app/admin/actions";
import { useToast } from "@/components/ui";
import type { AdminProps } from "./AdminRaffle";

/** Conecta el celular de quien organiza para recibir un aviso cada vez que alguien aparta. */
export default function TelegramCard({ telegram }: Pick<AdminProps, "telegram">) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<{ url: string; code: string } | null>(null);
  const toast = useToast();
  const router = useRouter();
  const act = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      toast(r);
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <section className="glass space-y-3 rounded-[26px] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <BellRing className="size-5 text-[var(--accent)]" aria-hidden /> Avisos en tu celular
      </h2>

      {!telegram.configured ? (
        <>
          <p className="text-sm text-[var(--ink)]/75">Recibe un mensaje de Telegram cada vez que alguien aparte un número desde la página. Es gratis y se configura una sola vez:</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[var(--ink)]/80">
            <li>
              En Telegram abre{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] underline">
                @BotFather
              </a>
              , escribe <code className="rounded bg-black/30 px-1">/newbot</code> y ponle un nombre (por ejemplo, Avisos Rifa).
            </li>
            <li>Copia el token que te da (se ve como 123456:ABC…).</li>
            <li>
              En Vercel, en tu proyecto → Settings → Environment Variables, agrega <code className="rounded bg-black/30 px-1">TELEGRAM_BOT_TOKEN</code> con ese token y
              haz Redeploy.
            </li>
            <li>Vuelve aquí y toca «Conectar mi Telegram».</li>
          </ol>
        </>
      ) : telegram.chat ? (
        <>
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-5 text-emerald-300" aria-hidden /> Conectado con <b>{telegram.chat.name}</b>. Te avisamos cada apartado y cada vencimiento.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={pending}
              onClick={() => act(telegramTest)}
              className="inline-flex items-center justify-center gap-2 rounded-xl py-3 font-semibold ring-1 ring-white/15 hover:bg-white/10 disabled:opacity-60"
            >
              <Send className="size-4" aria-hidden /> Probar
            </button>
            <button
              disabled={pending}
              onClick={() => act(telegramDisconnect)}
              className="rounded-xl py-3 font-semibold text-[var(--ink)]/70 ring-1 ring-white/15 hover:bg-red-500/15 disabled:opacity-60"
            >
              Desconectar
            </button>
          </div>
        </>
      ) : !link ? (
        <>
          <p className="text-sm text-[var(--ink)]/75">Recibe un mensaje cada vez que alguien aparte un número.</p>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await telegramConnectStart();
                if (!r.ok || !r.link || !r.code) return toast(r);
                setLink({ url: r.link, code: r.code });
                window.open(r.link, "_blank", "noopener");
              })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2AABEE] py-3.5 font-bold text-white disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden /> Conectar mi Telegram
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--ink)]/75">
            Se abrió Telegram. Toca <b>Iniciar</b> en el chat del bot y luego vuelve aquí.
          </p>
          <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
            Abrir el bot otra vez <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <button
            disabled={pending}
            onClick={() => act(() => telegramConnectFinish({ code: link.code }), () => setLink(null))}
            className="btn-gold w-full rounded-xl py-3.5 font-display font-bold disabled:opacity-60"
          >
            {pending ? "Buscando…" : "Ya toqué Iniciar"}
          </button>
        </>
      )}
    </section>
  );
}
