import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { PickDetail, pickFromSafe } from "@/components/PickDetail";
import { useAuth } from "@/lib/auth";
import { fetchDay, fetchHistory } from "@/lib/dataSource";
import { DayPayload, History } from "@/lib/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
  const [day, setDay] = useState<DayPayload | null>(null);
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const { user, ready } = useAuth();

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchHistory(), fetchDay(date)]).then(([h, d]) => {
      if (cancelled) return;
      setDay(d);
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
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

        {!loading && !day?.safe_pick && (
          <div className="bg-bg-card border border-white/10 rounded-2xl p-8 text-center text-white/60">
            <p className="text-base">Aucun value bet identifié aujourd'hui.</p>
            <p className="text-sm text-white/40 mt-2">
              Le moteur n'a pas trouvé de cote ≥ 2.00 avec une probabilité supérieure
              à celle du bookmaker. Reviens demain.
            </p>
          </div>
        )}

        {!loading && day?.safe_pick && isLocked && (
          <PremiumGate />
        )}

        {!loading && day?.safe_pick && isPremium && (
          <PickDetail pick={pickFromSafe(day.safe_pick)} variant="today" />
        )}
      </main>
    </>
  );
}

function PremiumGate() {
  return (
    <div className="bg-gradient-to-br from-accent-blue/15 to-purple-500/10 border-2 border-accent-blue/30 rounded-3xl p-6 md:p-10 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold mb-3">Pick du jour réservé Premium</h2>
      <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto mb-6">
        L'historique de nos paris est <strong>100% public</strong> pour que tu puisses
        vérifier la qualité. Le pick du jour, son analyse complète (14+ points) et les
        sources sont l'abonnement.
      </p>
      <div className="space-y-3 max-w-sm mx-auto">
        <Link
          href="/premium"
          className="block py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-bold"
        >
          👑 Passer en Premium — à partir de 7,99€/mois
        </Link>
        <Link
          href="/paris"
          className="block py-2 text-sm text-white/50 hover:text-white"
        >
          Voir l'historique des paris →
        </Link>
      </div>
    </div>
  );
}
