import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { fetchHistory } from "@/lib/dataSource";
import { History } from "@/lib/types";

const PRICE_MONTHLY = 9.99;
const PRICE_YEARLY = 95.88; // 9.99 * 12 - 20% ≈ 95.88

export default function PremiumPage() {
  const { user, upgradeTo } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<"monthly" | "yearly">("yearly");
  const [history, setHistory] = useState<History | null>(null);

  useEffect(() => {
    fetchHistory().then(setHistory);
  }, []);

  function handleSubscribe() {
    if (!user) {
      router.push("/login");
      return;
    }
    upgradeTo(selected);
    router.push("/compte");
  }

  const stats = history?.stats;

  return (
    <>
      <Head>
        <title>{t("pricing.title")} — WTF</title>
      </Head>
      <main className="max-w-md mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-bg-card border border-white/5 flex items-center justify-center text-white/60"
            aria-label="Retour"
          >
            ←
          </Link>
          <h1 className="text-lg font-bold tracking-tight flex-1">
            Passer en Premium
          </h1>
        </div>

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">👑</div>
          <h2 className="text-2xl font-extrabold mb-2 leading-tight">
            Débloque{" "}
            <span className="bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
              le pick safe
            </span>{" "}
            du jour
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            L'IA WTF analyse 30+ matchs chaque jour et identifie{" "}
            <strong className="text-white/90">LE value bet</strong> le plus
            fiable. Ne le rate plus.
          </p>
        </div>

        {/* Track record (social proof) */}
        {stats && stats.total_picks >= 3 && (
          <div className="bg-bg-card border border-accent-green/20 rounded-2xl p-4 mb-6">
            <div className="text-[10px] uppercase tracking-wider text-accent-green font-bold mb-2 text-center">
              📈 Track record vérifiable
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-accent-green tabular-nums">
                  {stats.win_rate.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50">Réussite</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-green tabular-nums">
                  +{stats.roi_percent.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50">ROI</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-green tabular-nums">
                  +{stats.progression_percent.toFixed(0)}%
                </div>
                <div className="text-[10px] text-white/50">Progression</div>
              </div>
            </div>
            <p className="text-[10px] text-white/40 text-center mt-2">
              {stats.won}V / {stats.lost}D sur {stats.total_picks} paris ·{" "}
              <Link href="/paris" className="text-accent-blue hover:underline">
                voir l'historique
              </Link>
            </p>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <PlanCard
            label="Mensuel"
            price={PRICE_MONTHLY}
            period="/mois"
            selected={selected === "monthly"}
            onSelect={() => setSelected("monthly")}
          />
          <PlanCard
            label="Annuel"
            price={PRICE_YEARLY}
            period="/an"
            subtitle={`Soit ${(PRICE_YEARLY / 12).toFixed(2)}€/mois`}
            badge="−20%"
            selected={selected === "yearly"}
            onSelect={() => setSelected("yearly")}
            highlight
          />
        </div>

        {/* Features détaillées */}
        <div className="bg-bg-card border border-white/10 rounded-2xl p-5 mb-5">
          <ul className="space-y-3">
            <Feature
              icon="🎯"
              title="LE pick safe du jour"
              text="1 value bet curé par jour, cote ≥ 2.00, edge > +5%"
            />
            <Feature
              icon="🧠"
              title="Analyse 45-60 points"
              text="Stats avancées, H2H, formes, lineups, météo, consensus tiers"
            />
            <Feature
              icon="🔗"
              title="Sources web vérifiables"
              text="3+ sources cliquables par pick (ESPN, FanGraphs, etc.)"
            />
            <Feature
              icon="🎯"
              title="Comparaison des candidats"
              text="On te montre les top 3 alternatives écartées et pourquoi"
            />
            <Feature
              icon="🔓"
              title="Sans engagement"
              text="Résiliable à tout moment, en 1 clic depuis ton compte"
            />
            <Feature
              icon="🇫🇷"
              title="Support FR & EN"
              text="L'app fonctionne dans ta langue, picks expliqués pour débutants"
            />
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-extrabold text-base shadow-lg shadow-yellow-500/20"
        >
          👑 Choisir {selected === "yearly" ? "l'annuel" : "le mensuel"} ·{" "}
          {(selected === "yearly" ? PRICE_YEARLY : PRICE_MONTHLY).toFixed(2)}€
        </button>

        <p className="text-[11px] text-white/40 text-center mt-3 leading-relaxed">
          🔒 Paiement sécurisé Stripe (CB / PayPal / Apple Pay / Google Pay).
          <br />
          Résiliable en 1 clic. Aucun engagement.
        </p>

        <p className="text-[10px] text-white/30 text-center mt-3">
          Phase 1 démo — aucun paiement réel pour l'instant. Stripe sera activé
          en Phase 2.
        </p>

        {/* Jeu responsable */}
        <div className="mt-6 p-3 rounded-xl bg-accent-red/[0.06] border border-accent-red/20">
          <p className="text-[11px] text-white/70 leading-relaxed text-center">
            <strong className="text-accent-red">⚠️ Jeu responsable.</strong> Les paris
            sportifs comportent un risque de perte et d'addiction. Interdit aux moins de
            18 ans. Ne misez que ce que vous pouvez perdre.
          </p>
          <p className="text-[10px] text-white/50 text-center mt-2">
            🆘 BE 0800 35 777 · FR 09 74 75 13 13 · <Link href="/plus" className="text-accent-blue hover:underline">en savoir plus</Link>
          </p>
        </div>

        {/* FAQ rapide */}
        <div className="mt-8">
          <h3 className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-3 px-1">
            Questions fréquentes
          </h3>
          <FAQ
            q="Comment fonctionne la garantie ?"
            a="Tu peux résilier à tout moment depuis ton compte. Le mois en cours reste actif jusqu'à expiration."
          />
          <FAQ
            q="Puis-je vérifier vos résultats avant d'acheter ?"
            a="100% oui. L'historique de tous les picks passés est public et gratuit, avec scores et analyses complètes."
          />
          <FAQ
            q="Quelle différence avec un bookmaker ?"
            a="Aucune ! On ne prend pas tes paris, on les analyse. Tu places tes mises chez bwin/Winamax/Unibet en suivant nos recommandations."
          />
          <FAQ
            q="Que se passe-t-il s'il n'y a pas de value bet un jour ?"
            a="On dit honnêtement 'aucun pari aujourd'hui' plutôt que forcer. La discipline > le volume."
          />
        </div>
      </main>
    </>
  );
}

interface PlanProps {
  label: string;
  price: number;
  period: string;
  subtitle?: string;
  badge?: string;
  selected: boolean;
  highlight?: boolean;
  onSelect: () => void;
}

function PlanCard({
  label,
  price,
  period,
  subtitle,
  badge,
  selected,
  highlight,
  onSelect,
}: PlanProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative text-left rounded-2xl p-4 border transition ${
        selected
          ? highlight
            ? "border-yellow-400/60 bg-yellow-500/10"
            : "border-accent-green/60 bg-accent-green/10"
          : "border-white/10 bg-bg-card hover:border-white/20"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 text-[10px] uppercase tracking-wider bg-yellow-400 text-bg-base font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="text-xs uppercase tracking-wider text-white/50 mb-2">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{price.toFixed(2)}€</div>
      <div className="text-[11px] text-white/40">{period}</div>
      {subtitle && (
        <div className="text-[10px] text-accent-green/80 mt-1">{subtitle}</div>
      )}
    </button>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-white/60 leading-relaxed">{text}</div>
      </div>
    </li>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-xl mb-2 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-white/[0.02]"
      >
        <span className="text-sm font-medium">{q}</span>
        <span className={`text-white/40 transition-transform ${open ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-xs text-white/60 leading-relaxed">{a}</div>
      )}
    </div>
  );
}
