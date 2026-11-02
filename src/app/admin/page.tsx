import { Plus } from "lucide-react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { listRaffles } from "@/lib/data";
import { formatCOP, formatDate } from "@/lib/raffle";
import { getTheme, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { draft: "Borrador", active: "Activa", closed: "Cerrada", finished: "Terminada" };

export default async function AdminHome() {
  await requireAdmin();
  const raffles = await listRaffles();
  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Panel</p>
          <h1 className="font-display text-4xl font-extrabold">Tus rifas</h1>
        </div>
        <Link href="/admin/rifas/nueva" className="btn-gold inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold">
          <Plus className="size-5" aria-hidden /> Nueva rifa
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {raffles.map((r) => {
          const t = getTheme(r.theme);
          return (
            <Link
              key={r.id}
              href={`/admin/rifas/${r.id}`}
              style={themeStyle(t)}
              className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[var(--bg2)] to-[var(--bg)] p-5 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:ring-[var(--accent)]/50"
            >
              <span className="absolute -right-4 -top-4 text-7xl opacity-20" aria-hidden>
                {t.emoji}
              </span>
              <p className="text-xs font-semibold text-[var(--accent)]">
                {t.label} · {STATUS[r.status]}
              </p>
              <p className="mt-1 font-display text-xl font-extrabold">{r.name}</p>
              <p className="mt-1 text-sm text-[var(--ink)]/65">
                {r.numberCount} números × {formatCOP(r.price)} · {formatDate(r.drawDate)}
              </p>
            </Link>
          );
        })}
        {raffles.length === 0 && <p className="text-[var(--ink)]/60">Aún no hay rifas. Crea la primera.</p>}
      </div>
    </AdminShell>
  );
}
