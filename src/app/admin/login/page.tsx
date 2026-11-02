"use client";

import { useActionState } from "react";
import { login, type ActionState } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(login, null);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form action={action} className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-xl font-bold">RifaMax · Administración</h1>
        <label className="block text-sm">
          Clave
          <input name="password" type="password" required autoFocus className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-slate-900 py-2 font-semibold text-white disabled:opacity-60">
          Entrar
        </button>
      </form>
    </main>
  );
}
