import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { PersonalBetCard } from "@/components/PersonalBetCard";
import { PersonalBetForm } from "@/components/PersonalBetForm";
import { PersonalStatsBar } from "@/components/PersonalStatsBar";
import { Skeleton } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { computeStats, isCloudMode, listBets, PersonalBet } from "@/lib/personalBets";

type FilterKey = "all" | "pending" | "settled";

export default function MesParisPage() {
  const { t } = useI18n();
  const { user, ready, mode } = useAuth();
  const [bets, setBets] = useState<PersonalBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalBet | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let cancelled = false;
    listBets()
      .then((list) => {
        if (cancelled) return;
        setBets(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => computeStats(bets), [bets]);

  const filtered = useMemo(() => {
    if (filter === "pending") return bets.filter((b) => b.outcome === "pending");
    if (filter === "settled") return bets.filter((b) => b.outcome === "win" || b.outcome === "loss");
    return bets;
  }, [bets, filter]);

  function handleSaved(saved: PersonalBet) {
    setBets((prev) => {
      const idx = prev.findIndex((b) => b.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  }

  function handleChanged(id: string, next: PersonalBet | null) {
    setBets((prev) => {
      if (!next) return prev.filter((b) => b.id !== id);
      return prev.map((b) => (b.id === id ? next : b));
    });
  }

  const cloudMode = isCloudMode();
  const isLoggedIn = !!user;
  // Si Supabase actif + non connecté → on stocke quand même en local en attendant.

  return (
    <>
      <Head>
        <title>{t("perso.titleTab")}</title>
      </Head>

      <main className="w-full max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-accent-blue hover:bg-white/5"
            aria-label={t("common.back")}
          >
            ←
          </Link>
          <h1 className="text-lg font-bold tracking-tight flex-1">{t("perso.title")}</h1>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-accent-green to-accent-blue text-xs font-semibold text-white flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span>
            <span>{t("perso.add")}</span>
          </button>
        </div>

        <p className="text-xs text-white/45 leading-relaxed mb-4">{t("perso.intro")}</p>

        {/* Mode banner — local vs cloud */}
        {ready && (
          <ModeBanner cloudMode={cloudMode} isLoggedIn={isLoggedIn} mode={mode} />
        )}

        {loading ? (
          <div className="space-y-3 animate-fade-in">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : (
          <>
            <PersonalStatsBar stats={stats} />

            {/* Filter chips */}
            {bets.length > 0 && (
              <div className="flex gap-1.5 mb-3">
                <FilterChip
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                  label={`${t("perso.filterAll")} (${stats.total})`}
                />
                <FilterChip
                  active={filter === "pending"}
                  onClick={() => setFilter("pending")}
                  label={`${t("perso.filterPending")} (${stats.pending})`}
                />
                <FilterChip
                  active={filter === "settled"}
                  onClick={() => setFilter("settled")}
                  label={`${t("perso.filterSettled")} (${stats.settled})`}
                />
              </div>
            )}

            {bets.length === 0 ? (
              <EmptyState onAdd={() => setFormOpen(true)} />
            ) : filtered.length === 0 ? (
              <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 text-center">
                <p className="text-sm text-white/50">{t("perso.filterEmpty")}</p>
              </div>
            ) : (
              <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
                {filtered.map((b) => (
                  <PersonalBetCard
                    key={b.id}
                    bet={b}
                    onEdit={() => {
                      setEditing(b);
                      setFormOpen(true);
                    }}
                    onChanged={(next) => handleChanged(b.id, next)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <PersonalBetForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
        editing={editing}
      />
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
      className={`px-3 py-1 rounded-full text-xs border transition ${
        active
          ? "bg-accent-green/15 border-accent-green/50 text-accent-green"
          : "bg-bg-elevated border-white/10 text-white/60"
      }`}
    >
      {label}
    </button>
  );
}

function ModeBanner({
  cloudMode,
  isLoggedIn,
  mode,
}: {
  cloudMode: boolean;
  isLoggedIn: boolean;
  mode: "supabase" | "mock";
}) {
  const { t } = useI18n();
  if (cloudMode && isLoggedIn) {
    return (
      <div className="text-[11px] text-accent-green/80 bg-accent-green/10 border border-accent-green/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
        <span>☁️</span>
        <span>{t("perso.bannerCloud")}</span>
      </div>
    );
  }
  if (cloudMode && !isLoggedIn) {
    return (
      <div className="text-[11px] text-yellow-400/90 bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
        <span>⚠️</span>
        <div className="flex-1">
          <div>{t("perso.bannerNotLogged")}</div>
          <Link href="/login" className="underline text-yellow-300 hover:text-yellow-200">
            {t("perso.bannerLoginLink")}
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="text-[11px] text-white/50 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
      <span>💾</span>
      <span>{t(mode === "mock" ? "perso.bannerLocal" : "perso.bannerLocalDev")}</span>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-8 text-center">
      <div className="text-5xl mb-3 opacity-50">🎯</div>
      <p className="text-base font-semibold mb-2">{t("perso.emptyTitle")}</p>
      <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto mb-4">
        {t("perso.emptyBody")}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="px-4 py-2 rounded-xl bg-gradient-to-br from-accent-green to-accent-blue text-sm font-semibold text-white"
      >
        + {t("perso.addFirst")}
      </button>
    </div>
  );
}
