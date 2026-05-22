import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { Header } from "@/components/Header";
import { showToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { LANG_LABELS, useI18n } from "@/lib/i18n";

export default function ComptePage() {
  const { user, ready, logout, cancelSubscription } = useAuth();
  const { lang, setLang, t } = useI18n();
  const router = useRouter();

  async function handleCancel() {
    if (!confirm("Résilier ton abonnement Premium ? Le mois en cours reste actif jusqu'à expiration.")) return;
    try {
      await cancelSubscription();
      showToast("Abonnement résilié. Accès Premium actif jusqu'à expiration.", {
        type: "success",
        duration: 5000,
      });
    } catch (e) {
      showToast("Erreur lors de la résiliation. Réessaie.", { type: "error" });
    }
  }

  async function handleLogout() {
    try {
      await logout();
      showToast("À bientôt 👋", { type: "info", duration: 2000 });
      router.push("/");
    } catch (e) {
      showToast("Erreur de déconnexion", { type: "error" });
    }
  }

  if (!ready) {
    return <div className="text-white/50 text-sm py-12 text-center">…</div>;
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>{`${t("account.title")} — WTF`}</title>
        </Head>
        <main className="max-w-md mx-auto px-4 py-10 text-center">
          <Header title={t("account.title")} stats={null} />
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 mt-6">
            <p className="text-white/70 mb-4">
              Connecte-toi pour gérer ton compte, ton abonnement et tes préférences.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="block py-3 rounded-lg bg-gradient-to-r from-accent-blue to-purple-500 text-white font-semibold"
              >
                {t("auth.login")}
              </Link>
              <Link
                href="/register"
                className="block py-3 rounded-lg border border-white/10 text-white/80 hover:bg-white/5"
              >
                {t("auth.register")}
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{`${t("account.title")} — WTF`}</title>
      </Head>
      <main className="max-w-md mx-auto px-4 md:px-6 py-6 md:py-10">
        <h1 className="text-center text-base font-semibold text-white/80 mb-6">
          {t("account.title")}
        </h1>

        {/* Bloc identité */}
        <div className="bg-bg-card border border-white/10 rounded-2xl p-4 flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-bg-elevated ring-1 ring-white/10 flex items-center justify-center text-white/40 text-2xl">
            👤
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{user.pseudo}</div>
            <div className="mt-1">
              {user.isPremium ? (
                <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-accent-green/20 text-accent-green font-medium">
                  {t("account.premium")} · {user.plan === "yearly" ? "Annuel" : "Mensuel"}
                </span>
              ) : (
                <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/60">
                  {t("account.free")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CTA Premium si pas encore */}
        {!user.isPremium && (
          <Link
            href="/premium"
            className="block bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-bold rounded-2xl p-4 mb-4 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>👑</span>
              <span>{t("account.goPremium")}</span>
            </span>
            <span>›</span>
          </Link>
        )}

        {/* Gestion abonnement Premium */}
        {user.isPremium && user.subscriptionEnd && (
          <div className="bg-bg-card border border-accent-green/20 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-accent-green font-bold">
                Abonnement actif
              </span>
              <span className="text-[10px] text-white/40">
                {user.plan === "yearly" ? "Annuel −20%" : "Mensuel"}
              </span>
            </div>
            <p className="text-xs text-white/60 mb-3">
              Renouvellement le{" "}
              <strong className="text-white/80">
                {new Date(user.subscriptionEnd).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </p>
            <button
              onClick={handleCancel}
              className="w-full py-2 rounded-lg border border-white/10 text-xs text-white/60 hover:text-accent-red hover:border-accent-red/30 transition"
            >
              Résilier l'abonnement
            </button>
          </div>
        )}

        <Row icon="📧" label={t("auth.email")} value={user.email} />
        <Row icon="👤" label={t("auth.pseudo")} value={user.pseudo} />
        <Row icon="🔒" label={t("auth.password")} value="••••••••" />

        <RowSelect
          icon="🌐"
          label={t("account.language")}
          value={`${LANG_LABELS[lang].flag} ${LANG_LABELS[lang].name}`}
          onClick={() => {
            const next = lang === "fr" ? "en" : "fr";
            setLang(next);
          }}
        />

        <Row icon="❓" label={t("account.help")} value="" link />

        <button
          onClick={handleLogout}
          className="w-full mt-6 py-3 rounded-lg text-white/60 hover:text-accent-red border border-white/10 hover:border-accent-red/30 transition"
        >
          → {t("auth.logout")}
        </button>

        <div className="text-center text-xs text-white/30 mt-6">
          WTF · Win The Future · v0.2 · {new Date().getFullYear()}
        </div>
      </main>
    </>
  );
}

function Row({
  icon,
  label,
  value,
  link,
}: {
  icon: string;
  label: string;
  value: string;
  link?: boolean;
}) {
  return (
    <div className="bg-bg-card border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 mb-2">
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {value && <span className="text-sm text-white/50">{value}</span>}
      {link && <span className="text-white/30">›</span>}
    </div>
  );
}

function RowSelect({
  icon,
  label,
  value,
  onClick,
}: {
  icon: string;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-bg-card border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 mb-2 hover:border-accent-green/30 transition text-left"
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm text-white/70 bg-bg-elevated px-3 py-1 rounded-lg">{value}</span>
    </button>
  );
}
