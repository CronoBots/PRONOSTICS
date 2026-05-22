import { useEffect, useState } from "react";

const STORAGE_KEY = "pronostics.onboarding.done";

interface Slide {
  icon: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: "🤖",
    title: "WTF · Win The Future",
    body: "L'IA qui analyse 30+ matchs par jour (football, NBA, NHL, MLB, ATP/WTA) et identifie LE value bet à cote ≥ 2.00 le plus fiable du jour.",
  },
  {
    icon: "📊",
    title: "Tracking 100% transparent",
    body: "Historique complet visible publiquement : tous les picks passés, les résultats, le ROI cumulé. Aucun pick caché, aucune triche. Vérifie toi-même avant de t'abonner.",
  },
  {
    icon: "👑",
    title: "Premium pour le pick du jour",
    body: "L'historique reste gratuit. Le pick du jour et l'analyse complète (45-60 points avec sources web vérifiables) sont réservés aux abonnés Premium.",
  },
];

interface OnboardingProps {
  /** Si true, affiche l'onboarding même s'il a déjà été vu */
  forceShow?: boolean;
  /** Callback appelé à la fermeture (utile pour reset le state parent) */
  onClose?: () => void;
}

/**
 * Reset le flag onboarding dans localStorage (= reverra le tour au prochain load).
 * À appeler quand le user veut re-voir l'intro depuis /plus.
 */
export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function Onboarding({ forceShow = false, onClose }: OnboardingProps = {}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      setStep(0);
      return;
    }
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setOpen(true);
    } catch {
      /* ignore */
    }
  }, [forceShow]);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    onClose?.();
  }

  function next() {
    if (step < SLIDES.length - 1) setStep(step + 1);
    else close();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!open) return null;

  const slide = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-slideUp"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-bg-card border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header : back + progress dots + close */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prev}
            disabled={isFirst}
            aria-label="Précédent"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isFirst
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-white/10 text-white/70"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-accent-green" : "w-2 bg-white/15"
                }`}
              />
            ))}
          </div>
          <button
            onClick={close}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="text-6xl text-center mb-4">{slide.icon}</div>
        <h2 className="text-2xl font-bold text-center mb-3">{slide.title}</h2>
        <p className="text-white/60 text-center text-sm leading-relaxed mb-6">
          {slide.body}
        </p>

        <div className="flex gap-3">
          <button
            onClick={close}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5"
          >
            Passer
          </button>
          <button
            onClick={next}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-green text-bg-base font-semibold text-sm"
          >
            {isLast ? "Commencer" : "Suivant"}
          </button>
        </div>
      </div>
    </div>
  );
}
