"use client";

import { BellRing, CheckCircle2, Copy, ExternalLink, MessageCircle, Send, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { telegramConnectFinish, telegramConnectStart, telegramDisconnect, telegramTest } from "@/app/admin/actions";
import { useToast } from "@/components/ui";
import type { AdminProps } from "./AdminRaffle";

/** Conecta los celulares de quienes organizan (hasta 5) para recibir un aviso cada vez que alguien aparta. */
export default function TelegramCard({ telegram }: Pick<AdminProps, "telegram">) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<{ url: string; code: string } | null>(null);
  const toast = useToast();
  const router = useRouter();
  // Mientras haya una invitación abierta, revisa sola cada 5 s si ya tocaron Iniciar (hasta 10 min).
  const waiting = !!link || telegram.pending > 0;
  const busy = useRef(false);
  useEffect(() => {
    if (!waiting || !telegram.configured) return;
    const until = Date.now() + 10 * 60_000;
    const id = setInterval(async () => {
      if (busy.current || document.hidden) return;
      if (Date.now() > until) return clearInterval(id);
      busy.current = true;
      try {
        const r = await telegramConnectFinish({ quiet: true });
        if (r.ok) {
          toast(r);
          setLink(null);
          router.refresh();
        }
      } finally {
        busy.current = false;
      }
    }, 5000);
    return () => clearInterval(id);
  }, [waiting, telegram.configured, toast, router]);

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
            <li>Vuelve aquí y toca «Conectar Telegram». Luego puedes agregar a otra persona, como tu pareja.</li>
          </ol>
        </>
      ) : (
        <>
          {telegram.chats.length > 0 ? (
            <>
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-300" aria-hidden /> Les avisamos cada apartado y cada vencimiento a:
              </p>
              <ul className="divide-y divide-white/10 rounded-xl bg-black/20 px-3">
                {telegram.chats.map((c) => (
                  <li key={c.chatId} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate font-semibold">{c.name}</span>
                    <button
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`¿Dejar de enviarle avisos a ${c.name}?`)) act(() => telegramDisconnect({ chatId: c.chatId }));
                      }}
                      className="shrink-0 text-sm font-semibold text-[var(--ink)]/60 hover:text-red-200 disabled:opacity-60"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-[var(--ink)]/75">Recibe un mensaje cada vez que alguien aparte un número. Puedes conectar hasta 5 personas, por ejemplo a tu pareja.</p>
          )}

          {!link && telegram.pending > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#2AABEE]/10 px-3 py-2.5 text-sm ring-1 ring-[#2AABEE]/30">
              <span className="text-[var(--ink)]/80">
                {telegram.pending === 1 ? "Hay 1 invitación esperando" : `Hay ${telegram.pending} invitaciones esperando`} a que toquen <b>Iniciar</b>. La revisamos sola.
              </span>
              <button disabled={pending} onClick={() => act(() => telegramConnectFinish())} className="shrink-0 font-bold text-[#8fd3ff] disabled:opacity-60">
                Revisar
              </button>
            </div>
          )}

          {!link ? (
            <div className={telegram.chats.length ? "grid grid-cols-2 gap-2" : ""}>
              {telegram.chats.length > 0 && (
                <button
                  disabled={pending}
                  onClick={() => act(telegramTest)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl py-3 font-semibold ring-1 ring-white/15 hover:bg-white/10 disabled:opacity-60"
                >
                  <Send className="size-4" aria-hidden /> Probar
                </button>
              )}
              <button
                disabled={pending || telegram.chats.length >= 5}
                onClick={() =>
                  start(async () => {
                    const r = await telegramConnectStart();
                    if (!r.ok || !r.link || !r.code) return toast(r);
                    setLink({ url: r.link, code: r.code });
                  })
                }
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl font-bold disabled:opacity-60 ${
                  telegram.chats.length ? "whitespace-nowrap px-2 py-3 ring-1 ring-[#2AABEE]/60 text-[#8fd3ff] hover:bg-[#2AABEE]/15" : "bg-[#2AABEE] py-3.5 text-white"
                }`}
              >
                {telegram.chats.length ? (
                  <>
                    <UserPlus className="size-4" aria-hidden /> Agregar <span className="max-[420px]:hidden">persona</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden /> Conectar Telegram
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl bg-black/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--ink)]/80">
                  Abre este enlace en el celular de quien recibirá los avisos (el tuyo o el de tu pareja) y toca <b>Iniciar</b> en el bot. Aquí se agrega sola en unos segundos.
                </p>
                <button onClick={() => setLink(null)} aria-label="Cancelar" className="rounded-full p-1 text-[var(--ink)]/60 hover:bg-white/10">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2AABEE] px-2 py-3 text-sm font-bold text-white"
                >
                  <ExternalLink className="size-4" aria-hidden /> En este cel
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Toca este enlace y luego «Iniciar» para recibir los avisos de la rifa por Telegram: ${link.url}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-2 py-3 text-sm font-bold text-[#04260f]"
                >
                  <MessageCircle className="size-4" aria-hidden /> Por WhatsApp
                </a>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(link.url).then(() => toast({ ok: true, message: "Enlace copiado." }))}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]"
              >
                <Copy className="size-3.5" aria-hidden /> Copiar enlace
              </button>
              <button
                disabled={pending}
                onClick={() => act(() => telegramConnectFinish(), () => setLink(null))}
                className="btn-gold w-full rounded-xl py-3.5 font-display font-bold disabled:opacity-60"
              >
                {pending ? "Buscando…" : "Ya tocó Iniciar"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
