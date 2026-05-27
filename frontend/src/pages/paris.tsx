import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

import { Header } from "@/components/Header";
import { HistoryList } from "@/components/HistoryList";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { fetchHistory } from "@/lib/dataSource";
import { useI18n } from "@/lib/i18n";
import { History } from "@/lib/types";

type BetTypeFilter = "all" | "single" | "combo";

export default function ParisPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [betType, setBetType] = useState<BetTypeFilter>("all");
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const isPremium = ready && user?.isPremium;

  useEffect(() => {
    let cancelled = false;
    fetchHistory().then((h) => {
      if (cancelled) return;
      setHistory(h);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const picks = history?.picks ?? [];

  // Filtre Simple / Combiné
  const filteredPicks = useMemo(() => {
    if (betType === "single") return picks.filter((p) => p.match.sport !== "combo");
    if (betType === "combo") return picks.filter((p) => p.match.sport === "combo");
    return picks;
  }, [picks, betType]);

  // Compteurs par catégorie pour les chips
  const counts = useMemo(() => {
    const settled = picks.filter((p) => p.outcome !== "pending");
    return {
      all: isPremium ? picks.length : settled.length,
      single: (isPremium ? picks : settled).filter((p) => p.match.sport !== "combo").length,
      combo: (isPremium ? picks : settled).filter((p) => p.match.sport === "combo").length,
    };
  }, [picks, isPremium]);

  const displayedCount = isPremium
    ? filteredPicks.length
    : filteredPicks.filter((p) => p.outcome !== "pending").length;

  return (
    <>
      <Head>
        <title>{t("paris.titleTab")}</title>
      </Head>

      <main className="w-full max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <Header title={t("paris.title")} stats={history?.stats} />

        {loading && (
          <div className="space-y-4 animate-fade-in">
            <Skeleton className="h-14 rounded-2xl" />
            <Skeleton className="h-7 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </div>
        )}

        {!loading && history && (
          <div>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-sm md:text-base font-semibold uppercase tracking-wider text-white">
                {t("paris.historyTitle")}
              </h2>
              <span className="text-[11px] text-white/55">
                {displayedCount > 1
                  ? t("paris.countMany", { n: displayedCount })
                  : t("paris.countOne", { n: displayedCount })}
              </span>
            </div>

            {/* Filtres Simple / Combiné */}
            <div className="flex gap-1.5 mb-3">
              <FilterChip
                active={betType === "all"}
                onClick={() => setBetType("all")}
                label={`${t("paris.filterAll")} (${counts.all})`}
              />
              <FilterChip
                active={betType === "single"}
                onClick={() => setBetType("single")}
                label={`${t("paris.filterSingle")} (${counts.single})`}
              />
              <FilterChip
                active={betType === "combo"}
                onClick={() => setBetType("combo")}
                label={`${t("paris.filterCombo")} (${counts.combo})`}
              />
            </div>

            <HistoryList picks={filteredPicks} />
          </div>
        )}
      </main>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
        active
          ? "bg-white/15 border-white/40 text-white"
          : "bg-transparent border-white/15 text-white hover:border-white/30"
      }`}
    >
      {label}
    </button>
  );
}
