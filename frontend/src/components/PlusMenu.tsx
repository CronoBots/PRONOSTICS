/**
 * PlusMenu — composant self-contained extrait de /plus, réutilisable
 * dans /compte (intégration v6.9 : le burger redirige vers /compte qui
 * embarque maintenant ces sections). La page /plus.tsx l'utilise aussi
 * pour rester accessible à son URL.
 *
 * Contient : Outils, Partager, Infos. PAS la section "Mon compte" (qui
 * serait redondante si rendu dans /compte).
 */

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";

import { InfoSheet } from "@/components/InfoSheet";
import { KellyCalculator } from "@/components/KellyCalculator";
import { Onboarding, resetOnboarding } from "@/components/Onboarding";
import { StakeSimulator } from "@/components/StakeSimulator";
import { fetchHistory } from "@/lib/dataSource";
import { useI18n } from "@/lib/i18n";
import { History } from "@/lib/types";

type SheetKey =
  | "simulateur"
  | "kelly"
  | "notes"
  | "share"
  | "embed"
  | "lexique"
  | "howto"
  | "responsible"
  | "legal"
  | "privacy";

interface Props {
  /** Si true, affiche aussi la section "Mon compte" (utile sur /plus, redondant sur /compte). */
  showAccountSection?: boolean;
}

export function PlusMenu({ showAccountSection = false }: Props) {
  const { t, lang } = useI18n();
  const [history, setHistory] = useState<History | null>(null);
  const [open, setOpen] = useState<SheetKey | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notes, setNotes] = useState("");

  function replayOnboarding() {
    resetOnboarding();
    setShowOnboarding(true);
  }

  useEffect(() => {
    let cancelled = false;
    fetchHistory(lang).then((h) => {
      if (cancelled) return;
      setHistory(h);
    });
    try {
      setNotes(localStorage.getItem("pronostics.notes") || "");
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, [lang]);

  function saveNotes(v: string) {
    setNotes(v);
    try {
      localStorage.setItem("pronostics.notes", v);
    } catch {
      /* ignore */
    }
  }

  const picks = history?.picks ?? [];
  const startingBankroll = history?.stats?.starting_bankroll ?? 5;

  return (
    <>
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-0">
        <Section title={t("plus.section.tools")}>
          <RowLink icon="🎯" label={t("perso.title")} href="/mes-paris" />
          <Row icon="🧮" label={t("plus.tool.stake")} onClick={() => setOpen("simulateur")} />
          <Row icon="📊" label={t("plus.tool.kelly")} onClick={() => setOpen("kelly")} />
          <Row icon="📝" label={t("plus.tool.notes")} onClick={() => setOpen("notes")} />
        </Section>

        <Section title={t("plus.section.share")}>
          <Row icon="🔗" label={t("plus.share.platform")} onClick={() => setOpen("share")} />
          <Row icon="</>" label={t("plus.share.embed")} onClick={() => setOpen("embed")} />
        </Section>

        <Section title={t("plus.section.info")}>
          <Row icon="📖" label={t("plus.info.lexicon")} onClick={() => setOpen("lexique")} />
          <Row icon="❓" label={t("plus.info.howto")} onClick={() => setOpen("howto")} />
          <Row icon="👋" label={t("plus.info.replayIntro")} onClick={replayOnboarding} />
          <Row icon="🆘" label={t("plus.info.responsible")} onClick={() => setOpen("responsible")} />
          <Row icon="⚖️" label={t("plus.info.legal")} onClick={() => setOpen("legal")} />
          <Row icon="🛡️" label={t("plus.info.privacy")} onClick={() => setOpen("privacy")} />
        </Section>

        {showAccountSection && (
          <Section title={t("nav.account")}>
            <RowLink icon="👤" label={t("account.title")} href="/compte" />
            <RowLink icon="👑" label={t("account.goPremium")} href="/premium" />
          </Section>
        )}
      </div>

      <InfoSheet title={t("plus.tool.stake")} open={open === "simulateur"} onClose={() => setOpen(null)}>
        <StakeSimulator picks={picks} defaultStake={5} defaultStartingBankroll={startingBankroll} />
      </InfoSheet>

      <InfoSheet title={t("plus.tool.kelly")} open={open === "kelly"} onClose={() => setOpen(null)}>
        <KellyCalculator />
      </InfoSheet>

      <InfoSheet title={t("plus.tool.notes")} open={open === "notes"} onClose={() => setOpen(null)}>
        <p className="text-xs text-white/50">{t("plus.notes.intro")}</p>
        <textarea
          value={notes}
          onChange={(e) => saveNotes(e.target.value)}
          placeholder={t("plus.notes.placeholder")}
          className="w-full h-40 mt-2 bg-bg-elevated border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-accent-green/40 resize-none"
        />
        <div className="text-[11px] text-white/40 mt-1 text-right">
          {t("plus.notes.charCount", { n: String(notes.length) })}
        </div>
      </InfoSheet>

      <InfoSheet title={t("plus.share.platform")} open={open === "share"} onClose={() => setOpen(null)}>
        <p>{t("plus.share.intro")}</p>
        <ShareBox text="https://cronobots.github.io/PRONOSTICS/" />
        <p className="text-xs text-white/50 mt-3">{t("plus.share.footer")}</p>
      </InfoSheet>

      <InfoSheet title={t("plus.share.embed")} open={open === "embed"} onClose={() => setOpen(null)}>
        <p>{t("plus.embed.intro")}</p>
        <ShareBox text='<iframe src="https://cronobots.github.io/PRONOSTICS/paris" width="100%" height="600" frameborder="0"></iframe>' />
      </InfoSheet>

      <InfoSheet title={t("plus.info.lexicon")} open={open === "lexique"} onClose={() => setOpen(null)}>
        <Lex term={t("plus.lex.odds")}>{t("plus.lex.odds.def")}</Lex>
        <Lex term={t("plus.lex.boostedOdds")}>{t("plus.lex.boostedOdds.def")}</Lex>
        <Lex term={t("plus.lex.stake")}>{t("plus.lex.stake.def")}</Lex>
        <Lex term={t("plus.lex.ev")}>{t("plus.lex.ev.def")}</Lex>
        <Lex term={t("plus.lex.valueBet")}>{t("plus.lex.valueBet.def")}</Lex>
        <Lex term={t("plus.lex.roi")}>{t("plus.lex.roi.def")}</Lex>
        <Lex term={t("plus.lex.bankroll")}>{t("plus.lex.bankroll.def")}</Lex>
        <Lex term={t("plus.lex.drawdown")}>{t("plus.lex.drawdown.def")}</Lex>
        <Lex term={t("plus.lex.h2h")}>{t("plus.lex.h2h.def")}</Lex>
      </InfoSheet>

      <InfoSheet title={t("plus.info.howto")} open={open === "howto"} onClose={() => setOpen(null)}>
        <ol className="space-y-2 list-decimal list-inside text-sm">
          {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
            <li key={k} dangerouslySetInnerHTML={{ __html: t(`plus.howto.${k}`).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          ))}
        </ol>
      </InfoSheet>

      <InfoSheet title={t("plus.info.responsible")} open={open === "responsible"} onClose={() => setOpen(null)}>
        <p className="text-sm font-semibold text-white/90 mb-2">{t("plus.responsible.headline")}</p>
        <ul className="space-y-2 text-xs text-white/70 leading-relaxed">
          {["r1", "r2", "r3", "r4", "r5", "r6"].map((k) => (
            <li key={k} dangerouslySetInnerHTML={{ __html: t(`plus.responsible.${k}`).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          ))}
        </ul>
        <div className="mt-4 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20">
          <p className="text-xs font-semibold text-accent-red mb-2">{t("plus.responsible.helpTitle")}</p>
          <ul className="text-xs text-white/70 space-y-1.5">
            <li>🇫🇷 <strong>Joueurs Info Service</strong> : 09 74 75 13 13 (8h-2h, 7j/7, anonyme)</li>
            <li>🇧🇪 <strong>BeGambleAware</strong> : 0800 35 777 (gratuit, 24h/24)</li>
            <li>🇧🇪 <strong>Cliniques du jeu</strong> : <a href="https://www.cliniquedujeu.be" target="_blank" rel="noopener noreferrer" className="text-accent-blue underline">cliniquedujeu.be</a></li>
            <li>🇨🇦 <strong>Jeu : aide et référence</strong> : 1 800 461-0140</li>
          </ul>
        </div>
        <p className="text-[10px] text-white/40 mt-4 italic">{t("plus.responsible.footer")}</p>
      </InfoSheet>

      <InfoSheet title={t("plus.info.legal")} open={open === "legal"} onClose={() => setOpen(null)}>
        <p className="text-xs">
          <strong>{t("plus.legal.service")}</strong> : NEXBET · Trust the Algorithm<br />
          <strong>{t("plus.legal.publisher")}</strong> : CronoBots<br />
          <strong>{t("plus.legal.host")}</strong> : GitHub Pages<br />
          <strong>{t("plus.legal.contact")}</strong> : {t("plus.legal.contactValue")}
        </p>
        <p className="text-xs text-white/50 mt-3">{t("plus.legal.disclaimer")}</p>
        <p className="text-xs text-white/50 mt-2">
          🆘 Joueurs Info Service (FR) : 09 74 75 13 13 — BeGambleAware (BE) : 0800 35 777
        </p>
      </InfoSheet>

      <InfoSheet title={t("plus.info.privacy")} open={open === "privacy"} onClose={() => setOpen(null)}>
        <p className="text-xs">{t("plus.privacy.p1")}</p>
        <p className="text-xs text-white/50 mt-2">{t("plus.privacy.p2")}</p>
      </InfoSheet>

      {showOnboarding && <Onboarding forceShow onClose={() => setShowOnboarding(false)} />}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-2 px-1">
        {title}
      </h3>
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/5">
        {children}
      </div>
    </section>
  );
}

function Row({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] text-left transition"
    >
      <span className="text-xl w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-white/30">›</span>
    </button>
  );
}

function RowLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] text-left transition"
    >
      <span className="text-xl w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-white/30">›</span>
    </Link>
  );
}

function ShareBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={text}
        readOnly
        className="flex-1 bg-bg-elevated border border-white/10 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none truncate"
      />
      <button
        onClick={copy}
        className="px-4 py-2 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:opacity-90"
      >
        {copied ? "✓" : "Copier"}
      </button>
    </div>
  );
}

function Lex({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-accent-green/40 pl-3 mb-2">
      <div className="font-semibold text-white/90 text-sm">{term}</div>
      <div className="text-white/55 text-[13px] leading-relaxed mt-0.5">{children}</div>
    </div>
  );
}
