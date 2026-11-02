import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { listRaffles } from "@/lib/data";
import { formatCOP, formatDate } from "@/lib/raffle";
import { getTheme } from "@/lib/themes";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { draft: "Borrador", active: "Activa", closed: "Cerrada", finished: "Terminada" };

export default async function AdminHome() {
  await requireAdmin();
  const raffles = await listRaffles();
  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rifas</h1>
        <Link href="/admin/rifas/nueva" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Nueva rifa
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {raffles.map((r) => (
          <Link key={r.id} href={`/admin/rifas/${r.id}`} className="rounded-xl bg-white p-4 shadow-sm hover:shadow">
            <p className="text-xs text-slate-500">
              {getTheme(r.theme).emoji} {getTheme(r.theme).label} · {STATUS[r.status]}
            </p>
            <p className="font-bold">{r.name}</p>
            <p className="text-sm text-slate-600">
              {r.numberCount} números × {formatCOP(r.price)} · sorteo {formatDate(r.drawDate)}
            </p>
          </Link>
        ))}
        {raffles.length === 0 && <p className="text-slate-500">Aún no hay rifas.</p>}
      </div>
    </AdminShell>
  );
}
