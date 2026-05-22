/**
 * Toast notification system minimaliste.
 *
 * Usage :
 *   import { showToast } from "@/components/Toast";
 *   showToast("Abonnement résilié", { type: "success" });
 *   showToast("Erreur réseau", { type: "error" });
 *
 * Et dans _app.tsx : <ToastContainer />
 *
 * Implementation event-based (pas de Context provider) pour pouvoir appeler
 * depuis n'importe où sans drilling.
 */

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ShowToastOptions {
  type?: ToastType;
  /** Durée en ms. Défaut 3500ms. */
  duration?: number;
}

const SHOW_EVENT = "wtf-toast-show";
let nextId = 1;

/** Déclenche un toast depuis n'importe où dans l'app. */
export function showToast(message: string, options: ShowToastOptions = {}): void {
  if (typeof window === "undefined") return;
  const detail: Toast = {
    id: nextId++,
    message,
    type: options.type ?? "info",
    duration: options.duration ?? 3500,
  };
  window.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail }));
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "bg-accent-green/15 border-accent-green/40 text-accent-green",
  error: "bg-accent-red/15 border-accent-red/40 text-accent-red",
  info: "bg-accent-blue/15 border-accent-blue/40 text-accent-blue",
  warning: "bg-yellow-400/15 border-yellow-400/40 text-yellow-400",
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "⚠",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onShow(e: Event) {
      const toast = (e as CustomEvent<Toast>).detail;
      setToasts((prev) => [...prev, toast]);
      // Auto-dismiss
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration);
    }
    window.addEventListener(SHOW_EVENT, onShow);
    return () => window.removeEventListener(SHOW_EVENT, onShow);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ top: "calc(var(--safe-top) + 12px)" }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto max-w-md w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur bg-bg-card/95 shadow-lg animate-slideDown ${TYPE_STYLES[t.type]}`}
          style={{ animation: "slideDown 0.3s ease-out" }}
        >
          <span className="text-lg shrink-0">{TYPE_ICONS[t.type]}</span>
          <span className="text-sm font-medium flex-1 text-white/90">{t.message}</span>
          <span className="text-white/40 text-xs">✕</span>
        </button>
      ))}
    </div>
  );
}
