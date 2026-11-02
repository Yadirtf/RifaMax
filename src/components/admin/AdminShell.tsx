import { LogOut } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { logout } from "@/app/admin/actions";
import { getTheme, themeStyle } from "@/lib/themes";

export default function AdminShell({ children, theme = "navidad", title }: { children: React.ReactNode; theme?: string; title?: React.ReactNode }) {
  return (
    <div className="stage" style={themeStyle(getTheme(theme))}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-black">
            <LogoMark size={32} />
            <span className="hidden text-base sm:inline">
              Rifa de <span className="brand-text">Adrian y Tatiana</span>
            </span>
          </Link>
          {title && <div className="min-w-0 flex-1 truncate font-display font-bold text-[var(--ink)]/85">{title}</div>}
          <form action={logout} className="ml-auto">
            <button className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-[var(--ink)]/70 hover:bg-white/10">
              <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">{children}</div>
    </div>
  );
}
