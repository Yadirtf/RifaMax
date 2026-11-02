"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";
import { LogoMark } from "@/components/Logo";
import { getTheme, themeStyle } from "@/lib/themes";
import { login, type Result } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<Result | null, FormData>(login, null);
  return (
    <main className="stage flex items-center justify-center p-5" style={themeStyle(getTheme("navidad"))}>
      <form action={action} className="glass w-full max-w-sm space-y-5 rounded-[28px] p-7">
        <LogoMark size={56} />
        <div>
          <h1 className="font-display text-3xl font-extrabold"><span className="inline-flex items-center gap-2"><KeyRound className="size-6 text-[var(--accent)]" aria-hidden /> Panel</span></h1>
          <p className="mt-1 text-sm text-[var(--ink)]/65">Rifa de Adrian y Tatiana · solo para quienes organizan.</p>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Clave</span>
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-xl bg-white/[0.08] px-4 py-3 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-[var(--accent)]"
          />
        </label>
        {state && !state.ok && (
          <p role="alert" className="text-sm text-red-200">
            {state.message}
          </p>
        )}
        <button disabled={pending} className="btn-gold w-full rounded-xl py-3.5 font-display text-lg font-bold disabled:opacity-60">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
