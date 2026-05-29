import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

/**
 * Dev panel to flip Premium status without going through login + Stripe
 * Checkout. Persisted in localStorage so the choice survives reloads.
 * 3 states: Auto (suit l'auth réelle) / Premium / Free.
 */
export function DevPremiumToggle() {
  const { devSetPremium, devOverride, user } = useAuth();
  const { t } = useI18n();

  const states: { value: "premium" | "free" | null; key: "auto" | "premium" | "free" }[] = [
    { value: null,      key: "auto" },
    { value: "premium", key: "premium" },
    { value: "free",    key: "free" },
  ];

  return (
    <div className="bg-bg-card border border-yellow-400/25 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider font-bold text-yellow-300">
          {t("dev.premium.title")}
        </span>
        <span className="text-[10px] text-white/40 italic">{t("dev.premium.subtitle")}</span>
      </div>
      <p className="text-[12px] text-white/60 leading-relaxed mb-3">
        {t("dev.premium.body")}
      </p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {states.map((s) => {
          const active = devOverride === s.value;
          return (
            <button
              key={s.key}
              onClick={() => devSetPremium(s.value)}
              className={`px-3 py-2 rounded-xl border text-[12px] font-semibold transition ${
                active
                  ? "bg-yellow-400/15 border-yellow-400/50 text-yellow-300"
                  : "bg-bg-elevated border-white/[0.06] text-white/65 hover:border-white/15"
              }`}
            >
              {t(`dev.premium.${s.key}`)}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] text-white/45 leading-snug">
        {t("dev.premium.effective")}{" "}
        <span className="font-semibold text-white/80">
          {user?.isPremium ? t("dev.premium.premium") : t("dev.premium.free")}
        </span>
        {devOverride && (
          <span className="text-yellow-300/70"> {t("dev.premium.override")}</span>
        )}
      </div>
    </div>
  );
}
