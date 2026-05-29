import { useAuth } from "@/lib/auth";

/**
 * Dev panel to flip Premium status without going through login + Stripe
 * Checkout. Persisted in localStorage so the choice survives reloads.
 * 3 states: Auto (suit l'auth réelle) / Premium / Free.
 *
 * Rendered in /plus and /compte for now. Intended as a temporary
 * facility to QA the Premium-gated UI while the real subscription
 * pipeline (Stripe) is still being built.
 */
export function DevPremiumToggle() {
  const { devSetPremium, devOverride, user } = useAuth();

  const states: { value: "premium" | "free" | null; label: string }[] = [
    { value: null,      label: "Auto" },
    { value: "premium", label: "👑 Premium" },
    { value: "free",    label: "🔒 Free" },
  ];

  return (
    <div className="bg-bg-card border border-yellow-400/25 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider font-bold text-yellow-300">
          Dev preview
        </span>
        <span className="text-[10px] text-white/40 italic">— bypass login/checkout</span>
      </div>
      <p className="text-[12px] text-white/60 leading-relaxed mb-3">
        Bascule le statut Premium pour visualiser l'app dans chaque état pendant les réglages.
        Persiste localement (localStorage). À retirer avant le launch grand public.
      </p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {states.map((s) => {
          const active = devOverride === s.value;
          return (
            <button
              key={s.label}
              onClick={() => devSetPremium(s.value)}
              className={`px-3 py-2 rounded-xl border text-[12px] font-semibold transition ${
                active
                  ? "bg-yellow-400/15 border-yellow-400/50 text-yellow-300"
                  : "bg-bg-elevated border-white/[0.06] text-white/65 hover:border-white/15"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-white/45 leading-snug">
        État effectif :{" "}
        <span className="font-semibold text-white/80">
          {user?.isPremium ? "👑 Premium" : "🔒 Free"}
        </span>
        {devOverride && (
          <span className="text-yellow-300/70"> (override actif)</span>
        )}
      </div>
    </div>
  );
}
