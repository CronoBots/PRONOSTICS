import { ReactNode, useEffect } from "react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function InfoSheet({ title, open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-bg-card border-t border-white/10 rounded-t-3xl shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="font-bold text-base">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-accent-blue hover:bg-white/5"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-5 text-sm text-white/80 leading-relaxed space-y-3">
          {children}
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 text-center text-sm text-white/60 hover:text-white"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
