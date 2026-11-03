"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// --- Avisos ----------------------------------------------------------------

type Toast = { id: number; ok: boolean; message: string };
const ToastCtx = createContext<(r: { ok: boolean; message: string }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((r: { ok: boolean; message: string }) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, ...r }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl ring-1 ${
                t.ok ? "bg-emerald-950/95 text-emerald-100 ring-emerald-400/30" : "bg-red-950/95 text-red-100 ring-red-400/30"
              }`}
            >
              {t.ok ? <CheckCircle2 className="size-5 shrink-0" aria-hidden /> : <XCircle className="size-5 shrink-0" aria-hidden />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// --- Hoja deslizante (abajo en móvil, lateral en escritorio) ---------------

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-stretch sm:justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            initial={{ y: 40, x: 0, opacity: 0 }}
            animate={{ y: 0, x: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-[var(--bg2)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[var(--ink)] shadow-2xl ring-1 ring-white/10 sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-[28px]"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-extrabold">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const inputCls =
  "w-full rounded-xl bg-white/[0.07] px-4 py-3 text-[var(--ink)] outline-none ring-1 ring-white/15 placeholder:text-white/35 focus:ring-2 focus:ring-[var(--accent)]";

/**
 * Campo con etiqueta. Con `group`, envuelve varios botones (no un input),
 * así la etiqueta no se le asigna al primer botón.
 */
export function Field({ label, hint, children, group }: { label: string; hint?: string; children: ReactNode; group?: boolean }) {
  const body = (
    <>
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-[var(--ink)]/55">{hint}</span>}
    </>
  );
  return group ? (
    <div role="group" aria-label={label} className="block">
      {body}
    </div>
  ) : (
    <label className="block">{body}</label>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-black/25 p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${value === o.value ? "bg-[var(--ink)] text-[var(--bg)]" : "text-[var(--ink)]/70 hover:bg-white/10"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
