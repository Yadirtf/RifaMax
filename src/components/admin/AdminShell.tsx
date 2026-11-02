import Link from "next/link";
import { logout } from "@/app/admin/actions";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-black">
            🎟️ RifaMax admin
          </Link>
          <form action={logout}>
            <button className="text-sm text-slate-500 underline">Salir</button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
