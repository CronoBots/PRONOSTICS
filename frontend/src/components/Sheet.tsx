import { ReactNode, useEffect } from "react";

/**
 * Bottom-sheet modal — overlay + slide-up depuis le bas.
 *
 * Usage :
 *   <Sheet open={open} onClose={...} title="Titre">
 *     ...contenu...
 *   </Sheet>
 *
 * Ferme via : tap overlay, swipe down (touchstart/end), bouton ✕, Esc.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.18s_ease-out]"
      />
      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-bg-card border-t border-x border-white/10 rounded-t-3xl animate-slideUp"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 1.25rem)" }}
      >
        {/* Drag handle visuel */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {title && (
          <div className="px-5 pt-2 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 text-white/60 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-5 pb-2">{children}</div>
      </div>
    </div>
  );
}

/**
 * Sheet option list — boutons radio-style pour Sheet pickers.
 */
interface OptionProps<T extends string> {
  label: string;
  hint?: string;
  value: T;
  current: T;
  onSelect: (v: T) => void;
  icon?: string;
}

export function SheetOption<T extends string>({
  label,
  hint,
  value,
  current,
  onSelect,
  icon,
}: OptionProps<T>) {
  const selected = value === current;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 border transition text-left ${
        selected
          ? "bg-accent-green/10 border-accent-green/40"
          : "bg-bg-elevated border-white/5 hover:border-white/15"
      }`}
    >
      {icon && <span className="text-xl w-6 text-center">{icon}</span>}
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-white/40 mt-0.5">{hint}</span>}
      </span>
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? "border-accent-green bg-accent-green" : "border-white/20"
        }`}
      >
        {selected && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 5l2.5 2.5L9 2"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
