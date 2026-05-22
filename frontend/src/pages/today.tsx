import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { PickDetail, pickFromSafe } from "@/components/PickDetail";
import { useAuth } from "@/lib/auth";
import { fetchDay, fetchHistory } from "@/lib/dataSource";
import { DayPayload, History, SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
  const [day, setDay] = useState<DayPayload | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const { user, ready } = useAuth();

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchHistory(), fetchDay(date)]).then(([h, d]) => {
      if (cancelled) return;
      setDay(d);
      setHistory(h);
      if (!d?.safe_pick && h) {
        const lastPending = [...h.picks].reverse().find((p) => p.outcome === "pending");
        if (lastPending) setDate(lastPending.date);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const isPremium = ready && user?.isPremium;
  const isLocked = ready && (!user || !user.isPremium);

  return (
    <>
      <Head>
        <title>Pick du jour — WTF</title>
      </Head>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-bg-card border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition"
            aria-label="Retour"
          >
            ←
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Pick safe du jour</h1>
        </div>

        {loading && (
          <div className="text-white/50 text-sm py-12 text-center">Chargement…</div>
        )}

        {!loading && !day?.safe_pick && <NoPickToday />}

        {!loading && day?.safe_pick && isLocked && (
          <PremiumGate pick={day.safe_pick} history={history} />
        )}

        {!loading && day?.safe_pick && isPremium && (
          <PickDetail pick={pickFromSafe(day.safe_pick)} variant="today" />
        )}
      </main>
    </>
  );
}

function NoPickToday() {
  return (
    <div className="bg-bg-card border border-white/10 rounded-2xl p-8 text-center">
      <div className="text-5xl mb-3">🧘</div>
      <p className="text-base font-semibold mb-2">Aucun value bet aujourd'hui</p>
      <p className="text-sm text-white/50 leading-relaxed max-w-sm mx-auto">
        Le moteur n'a pas identifié de pari avec probabilité ≥ 70% et edge suffisant.
        On préfère skip un jour plutôt que de te proposer un pari médiocre.
      </p>
      <p className="text-xs text-white/40 mt-4 italic">
        La discipline {">"} le volume. Reviens demain.
      </p>
    </div>
  );
}

function PremiumGate({
  pick,
  history,
}: {
  pick: NonNullable<DayPayload["safe_pick"]>;
  history: History | null;
}) {
  const stats = history?.stats;
  const sportEmoji = SPORT_EMOJIS[pick.sport] || "🎯";
  const sportLabel = SPORT_LABELS[pick.sport] || pick.sport;
  const kickoffDate = new Date(pick.kickoff);
  const kickoffText = kickoffDate.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      {/* Card teaser — révèle les infos non-confidentielles, masque le pick */}
      <div className="relative bg-bg-card border-2 border-yellow-400/30 rounded-3xl overflow-hidden">
        {/* Header avec sport + kickoff */}
        <div className="bg-gradient-to-r from-accent-green/10 to-accent-blue/10 px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="text-base">{sportEmoji}</span>
            <span className="font-semibold">{sportLabel}</span>
            <span className="text-white/30">·</span>
            <span className="capitalize">{kickoffText}</span>
          </div>
          <div className="text-xs text-white/50 mt-0.5">{pick.league}</div>
        </div>

        {/* Match teaser */}
        <div className="px-5 py-5">
          <div className="text-xl font-bold leading-tight mb-3">
            {pick.home_team}{" "}
            <span className="text-white/30 text-base font-normal">vs</span>{" "}
            {pick.away_team}
          </div>

          {/* Stats publiques */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-bg-elevated/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
                Cote
              </div>
              <div className="text-sm font-bold tabular-nums">
                {pick.odds.toFixed(2)}
              </div>
            </div>
            <div className="bg-bg-elevated/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
                Confiance
              </div>
              <div className="text-sm font-bold text-accent-green tabular-nums">
                {(pick.model_probability * 100).toFixed(0)}%
              </div>
            </div>
            <div className="bg-bg-elevated/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
                EV
              </div>
              <div className="text-sm font-bold text-accent-green tabular-nums">
                +{(pick.expected_value * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Section masquée — le pick + analyse */}
          <div className="relative">
            <div className="bg-bg-elevated/30 rounded-xl p-4 select-none filter blur-sm">
              <div className="text-[10px] uppercase tracking-wider text-accent-green/80 font-bold mb-1">
                💡 Le pick
              </div>
              <div className="text-lg font-extrabold mb-2">▓▓▓▓▓▓ ▓▓▓▓▓▓▓</div>
              <div className="text-xs text-white/60 leading-relaxed">
                {"▓".repeat(60)} {"▓".repeat(45)} {"▓".repeat(80)}
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-3xl">🔒</div>
            </div>
          </div>

          {/* Liste des bonus Premium */}
          <ul className="text-xs text-white/70 mt-4 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              <span>
                <strong className="text-white/90">{pick.rationale?.length ?? 45}+ points
                d'analyse</strong> structurés
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              <span>
                <strong className="text-white/90">{pick.sources?.length ?? 3} sources
                web</strong> vérifiables (cliquables)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              <span>Top 5 candidats écartés + raisons</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-green">✓</span>
              <span>Liens bookmakers (bwin, Winamax, Unibet)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Social proof (track record) */}
      {stats && stats.total_picks >= 3 && (
        <div className="bg-bg-card border border-accent-green/20 rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-accent-green font-bold mb-2 text-center">
            📈 Track record vérifiable
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xl font-bold text-accent-green tabular-nums">
                {stats.win_rate.toFixed(0)}%
              </div>
              <div className="text-[10px] text-white/50">Réussite</div>
            </div>
            <div>
              <div className="text-xl font-bold text-accent-green tabular-nums">
                +{stats.roi_percent.toFixed(0)}%
              </div>
              <div className="text-[10px] text-white/50">ROI</div>
            </div>
            <div>
              <div className="text-xl font-bold text-accent-green tabular-nums">
                ×{(stats.current_bankroll / stats.starting_bankroll).toFixed(1)}
              </div>
              <div className="text-[10px] text-white/50">Bankroll</div>
            </div>
          </div>
          <p className="text-[10px] text-white/40 text-center mt-2">
            {stats.won}V / {stats.lost}D sur {stats.total_picks} paris ·{" "}
            <Link href="/paris" className="text-accent-blue hover:underline">
              voir l'historique complet
            </Link>
          </p>
        </div>
      )}

      {/* CTA Premium */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-400/5 border border-yellow-400/30 rounded-2xl p-5">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">👑</div>
          <h3 className="text-lg font-bold mb-1">Découvre le pick complet</h3>
          <p className="text-xs text-white/60">
            Le pick + analyse + sources sont réservés aux Premium.
          </p>
        </div>
        <Link
          href="/premium"
          className="block py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-extrabold text-center"
        >
          Passer en Premium · à partir de 7,99€/mois
        </Link>
        <p className="text-[10px] text-white/40 text-center mt-3">
          *7,99€/mois avec l'annuel (95,88€/an, −20%). Mensuel : 9,99€. Résiliable
          en 1 clic.
        </p>
      </div>

      {/* Lien historique secondaire */}
      <Link
        href="/paris"
        className="block text-center text-sm text-white/40 hover:text-white py-2"
      >
        Voir l'historique des paris →
      </Link>
    </div>
  );
}
