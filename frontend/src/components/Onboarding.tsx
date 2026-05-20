import { useEffect, useState } from "react";

const STORAGE_KEY = "pronostics.onboarding.done";

interface Slide {
  icon: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: "🎯",
    title: "1 pari safe par jour",
    body: "Chaque matin, Claude analyse les matchs du jour (multi-sports : football, NBA, NHL, MLB, ATP/WTA) et identifie le value bet le plus fiable. Cote ≥ 2.00 obligatoire.",
  },
  {
    icon: "📊",
    title: "Tracking transparent",
    body: "Historique complet visible publiquement : tous les picks passés, les résultats, le ROI cumulé. Aucun pick caché, aucune triche.",
  },
  {
    icon: "👑",
    title: "Premium pour le pick du jour",
    body: "L'historique est gratuit pour vérifier la qualité. Le pick du jour et l'analyse complète (14+ points avec sources) sont réservés aux abonnés Premium.",
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function next() {
    if (step < SLIDES.length - 1) setStep(step + 1);
    else close();
  }

  if (!open) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-bg-card border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-accent-green" : "w-2 bg-white/15"
              }`}
            />
          ))}
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
