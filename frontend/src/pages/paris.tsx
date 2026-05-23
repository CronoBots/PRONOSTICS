import { useEffect, useState } from "react";
import Head from "next/head";

import { Header } from "@/components/Header";
import { HistoryList } from "@/components/HistoryList";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { fetchHistory } from "@/lib/dataSource";
import { useI18n } from "@/lib/i18n";
import { History } from "@/lib/types";

export default function ParisPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
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
  // Non-Premium voient seulement les paris réglés (les "en attente" sont gated sur /today)
  const displayedCount = isPremium
    ? picks.length
    : picks.filter((p) => p.outcome !== "pending").length;

  return (
    <>
      <Head>
        <title>{t("paris.titleTab")}</title>
      </Head>

      <main className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
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
              <h2 className="text-sm md:text-base font-semibold uppercase tracking-wider text-white/70">
                {t("paris.historyTitle")}
              </h2>
              <span className="text-[11px] text-white/40">
                {displayedCount > 1
                  ? t("paris.countMany", { n: displayedCount })
                  : t("paris.countOne", { n: displayedCount })}
              </span>
            </div>
            <HistoryList picks={picks} />
          </div>
        )}
      </main>
    </>
  );
}
