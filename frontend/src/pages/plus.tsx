import { ReactNode, useEffect, useState } from "react";
import Head from "next/head";
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

export default function PlusPage() {
  const { t } = useI18n();
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<SheetKey | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  function replayOnboarding() {
    resetOnboarding();
    setShowOnboarding(true);
  }
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchHistory().then((h) => {
      if (cancelled) return;
      setHistory(h);
      setLoading(false);
    });
    try {
      setNotes(localStorage.getItem("pronostics.notes") || "");
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, []);

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
      <Head>
        <title>{t("plus.titleTab")}</title>
      </Head>
      <main className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-accent-blue hover:bg-white/5"
            aria-label={t("common.back")}
          >
            ←
          </Link>
          <h1 className="text-lg lg:text-2xl font-bold tracking-tight">{t("plus.title")}</h1>
        </div>

        {loading && (
          <div className="text-white/40 text-sm py-12 text-center animate-fade-in">
            <div className="inline-block w-6 h-6 border-2 border-accent-green border-t-transparent rounded-full animate-spin mb-3" />
            <div>{t("common.loading")}</div>
          </div>
        )}

        {!loading && (
          <>
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-0">
              <Section title="Outils">
                <RowLink icon="🎯" label={t("perso.title")} href="/mes-paris" />
                <Row icon="🧮" label="Simulateur de mise" onClick={() => setOpen("simulateur")} />
                <Row icon="📊" label="Calculateur Kelly" onClick={() => setOpen("kelly")} />
                <Row icon="📝" label="Bloc notes" onClick={() => setOpen("notes")} />
              </Section>

              <Section title="Partager">
                <Row icon="🔗" label="Partager la plateforme" onClick={() => setOpen("share")} />
                <Row icon="</>" label="Code d'intégration" onClick={() => setOpen("embed")} />
              </Section>

              <Section title="Infos">
                <Row icon="📖" label="Lexique" onClick={() => setOpen("lexique")} />
                <Row icon="❓" label="Comment ça marche" onClick={() => setOpen("howto")} />
                <Row icon="👋" label="Revoir l'intro" onClick={replayOnboarding} />
                <Row icon="🆘" label="Jeu responsable" onClick={() => setOpen("responsible")} />
                <Row icon="⚖️" label="Mentions légales" onClick={() => setOpen("legal")} />
                <Row icon="🛡️" label="Politique de confidentialité" onClick={() => setOpen("privacy")} />
              </Section>

              <Section title={t("nav.account")}>
                <RowLink icon="👤" label={t("account.title")} href="/compte" />
                <RowLink icon="👑" label={t("account.goPremium")} href="/premium" />
              </Section>
            </div>

            <div className="text-center text-[10px] text-white/30 mt-8">
              NΞXBΞT · Trust the Algorithm · v0.2 · {new Date().getFullYear()}
            </div>
          </>
        )}
      </main>

      {/* Sheets */}
      <InfoSheet
        title="Simulateur de mise"
        open={open === "simulateur"}
        onClose={() => setOpen(null)}
      >
        <StakeSimulator
          picks={picks}
          defaultStake={5}
          defaultStartingBankroll={startingBankroll}
        />
      </InfoSheet>

      <InfoSheet
        title="Calculateur Kelly"
        open={open === "kelly"}
        onClose={() => setOpen(null)}
      >
        <KellyCalculator />
      </InfoSheet>

      <InfoSheet title="Bloc notes" open={open === "notes"} onClose={() => setOpen(null)}>
        <p className="text-xs text-white/50">
          Tes notes personnelles (stratégies, hypothèses, contraintes). Sauvegardées
          localement sur ce navigateur.
        </p>
        <textarea
          value={notes}
          onChange={(e) => saveNotes(e.target.value)}
          placeholder="Ex: ne pas miser le dimanche soir, max 3% bankroll par pari…"
          className="w-full h-40 mt-2 bg-bg-elevated border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-accent-green/40 resize-none"
        />
        <div className="text-[11px] text-white/40 mt-1 text-right">
          {notes.length} caractères · sauvegarde automatique
        </div>
      </InfoSheet>

      <InfoSheet
        title="Partager la plateforme"
        open={open === "share"}
        onClose={() => setOpen(null)}
      >
        <p>Diffuse le lien pour faire connaître l'app :</p>
        <ShareBox text="https://cronobots.github.io/PRONOSTICS/" />
        <p className="text-xs text-white/50 mt-3">
          Plus d'utilisateurs = plus de données, plus de confiance dans le track record
          public.
        </p>
      </InfoSheet>

      <InfoSheet
        title="Code d'intégration"
        open={open === "embed"}
        onClose={() => setOpen(null)}
      >
        <p>Embarque la page d'historique sur ton site :</p>
        <ShareBox text='<iframe src="https://cronobots.github.io/PRONOSTICS/paris" width="100%" height="600" frameborder="0"></iframe>' />
      </InfoSheet>

      <InfoSheet title="Lexique" open={open === "lexique"} onClose={() => setOpen(null)}>
        <Lex term="Cote (décimale)">
          Multiplicateur du gain. Cote 2.73 = pour 1€ misé tu touches 2.73€.
        </Lex>
        <Lex term="Cote boostée">
          Promo du bookmaker qui augmente la cote normale temporairement.
        </Lex>
        <Lex term="Mise">Combien tu paries. Si tu perds, tu perds la mise.</Lex>
        <Lex term="EV (Expected Value)">
          Espérance de gain en %. Positive = pari statistiquement rentable.
        </Lex>
        <Lex term="Value bet">
          Pari où notre estimation de probabilité dépasse celle du bookmaker.
        </Lex>
        <Lex term="ROI">(Bénéfice / Mises totales) × 100. Rendement par euro misé.</Lex>
        <Lex term="Bankroll">Capital total dédié aux paris (à gérer comme un compte de trading).</Lex>
        <Lex term="Drawdown">Plus grosse baisse depuis un pic de bankroll.</Lex>
        <Lex term="ERA (baseball)">
          Points encaissés par lanceur sur 9 manches. Élite &lt; 2.50.
        </Lex>
        <Lex term="WHIP (baseball)">
          Coureurs adverses sur base par manche. Élite &lt; 1.10.
        </Lex>
        <Lex term="H2H">Historique des confrontations directes.</Lex>
      </InfoSheet>

      <InfoSheet
        title="Comment ça marche"
        open={open === "howto"}
        onClose={() => setOpen(null)}
      >
        <ol className="space-y-2 list-decimal list-inside text-sm">
          <li>Chaque jour, <strong>NΞXBΞT (l'IA)</strong> analyse les matchs disponibles (foot, NBA, NHL, MLB, ATP/WTA).</li>
          <li>Sources croisées : forme récente, blessures, H2H, statistiques avancées.</li>
          <li>
            Identification du <strong>value bet</strong> du jour : cote ≥ 2.00 + probabilité estimée supérieure à celle du bookmaker.
          </li>
          <li>Le pick est publié avant le match, avec rationale détaillée (45-60 points) et sources vérifiables.</li>
          <li>L'historique est mis à jour quotidiennement avec les résultats.</li>
          <li>Premium débloque le pick du jour + l'analyse complète.</li>
        </ol>
      </InfoSheet>

      <InfoSheet
        title="Jeu responsable"
        open={open === "responsible"}
        onClose={() => setOpen(null)}
      >
        <p className="text-sm font-semibold text-white/90 mb-2">
          Les paris sportifs sont un loisir, pas un revenu.
        </p>
        <ul className="space-y-2 text-xs text-white/70 leading-relaxed">
          <li>✅ <strong>Ne mise que ce que tu peux perdre</strong> sans impacter ton budget vital (loyer, factures, alimentation).</li>
          <li>✅ <strong>Fixe-toi une limite</strong> hebdomadaire ou mensuelle stricte et tiens-la.</li>
          <li>✅ <strong>Ne chasse jamais tes pertes</strong> — si tu perds, accepte et arrête pour la journée.</li>
          <li>✅ <strong>Prends des pauses régulières</strong> (1 jour sans pari par semaine minimum).</li>
          <li>⛔ <strong>Interdit aux moins de 18 ans</strong> (21 ans dans certains pays).</li>
          <li>⛔ Ne parie pas si tu as bu, fumé, ou si tu te sens stressé / triste.</li>
        </ul>
        <div className="mt-4 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20">
          <p className="text-xs font-semibold text-accent-red mb-2">
            Besoin d'aide ? Tu n'es pas seul.
          </p>
          <ul className="text-xs text-white/70 space-y-1.5">
            <li>🇫🇷 <strong>Joueurs Info Service</strong> : 09 74 75 13 13 (8h-2h, 7j/7, anonyme)</li>
            <li>🇧🇪 <strong>BeGambleAware</strong> : 0800 35 777 (gratuit, 24h/24)</li>
            <li>🇧🇪 <strong>Cliniques du jeu</strong> : <a href="https://www.cliniquedujeu.be" target="_blank" rel="noopener noreferrer" className="text-accent-blue underline">cliniquedujeu.be</a></li>
            <li>🇨🇦 <strong>Jeu : aide et référence</strong> : 1 800 461-0140</li>
          </ul>
        </div>
        <p className="text-[10px] text-white/40 mt-4 italic">
          NΞXBΞT est un service d'analyse statistique informatif. Nous ne prenons aucun pari
          et ne touchons aucune commission sur les mises placées chez les bookmakers.
        </p>
      </InfoSheet>

      <InfoSheet
        title="Mentions légales"
        open={open === "legal"}
        onClose={() => setOpen(null)}
      >
        <p className="text-xs">
          <strong>Service</strong> : NΞXBΞT · Trust the Algorithm
          <br />
          <strong>Éditeur</strong> : CronoBots
          <br />
          <strong>Hébergement</strong> : GitHub Pages
          <br />
          <strong>Contact</strong> : via la page Compte
        </p>
        <p className="text-xs text-white/50 mt-3">
          Contenu informatif uniquement. Les paris sportifs comportent un risque de perte
          financière et d'addiction. Ne pariez que ce que vous pouvez perdre. Interdit
          aux mineurs.
        </p>
        <p className="text-xs text-white/50 mt-2">
          🆘 Joueurs Info Service (FR) : 09 74 75 13 13 — BeGambleAware (BE) : 0800 35 777
        </p>
      </InfoSheet>

      <InfoSheet
        title="Politique de confidentialité"
        open={open === "privacy"}
        onClose={() => setOpen(null)}
      >
        <p className="text-xs">
          Données collectées : email + pseudo + abonnement (Phase 2 via Supabase). Aucun
          tracking publicitaire, aucune revente de données.
        </p>
        <p className="text-xs text-white/50 mt-2">
          Tu peux supprimer ton compte à tout moment depuis la page Compte. Toutes les
          données associées sont effacées sous 30 jours.
        </p>
      </InfoSheet>

      {/* Onboarding revisitable */}
      {showOnboarding && (
        <Onboarding forceShow onClose={() => setShowOnboarding(false)} />
      )}
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

function Row({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
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

function RowLink({
  icon,
  label,
  href,
}: {
  icon: string;
  label: string;
  href: string;
}) {
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
