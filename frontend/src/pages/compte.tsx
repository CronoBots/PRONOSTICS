import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState } from "react";

import { Sheet, SheetOption } from "@/components/Sheet";
import { showToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { LANG_LABELS, localeForLang, useI18n, type Lang } from "@/lib/i18n";
import {
  usePreferences,
  type BetDisplay,
  type Currency,
  type OddsFormat,
} from "@/lib/preferences";
import { useTheme, type ThemeChoice } from "@/lib/theme";

type SheetKind =
  | "theme"
  | "lang"
  | "odds"
  | "currency"
  | "betDisplay"
  | null;

export default function ComptePage() {
  const { user, ready, logout, cancelSubscription } = useAuth();
  const { lang, setLang, t } = useI18n();
  const { theme, setTheme, resolved } = useTheme();
  const {
    oddsFormat,
    setOddsFormat,
    currency,
    setCurrency,
    betDisplay,
    setBetDisplay,
    emailNotif,
    setEmailNotif,
  } = usePreferences();
  const router = useRouter();

  const [openSheet, setOpenSheet] = useState<SheetKind>(null);

  async function handleCancel() {
    if (!confirm(t("account.confirmCancel"))) return;
    try {
      await cancelSubscription();
      showToast(t("account.cancelSuccess"), {
        type: "success",
        duration: 5000,
      });
    } catch (e) {
      showToast(t("account.cancelError"), { type: "error" });
    }
  }

  async function handleLogout() {
    try {
      await logout();
      showToast(t("auth.toastBye"), { type: "info", duration: 2000 });
      router.push("/");
    } catch (e) {
      showToast(t("auth.toastLogoutError"), { type: "error" });
    }
  }

  function handleDelete() {
    if (!confirm(t("account.deleteConfirm"))) return;
    showToast(t("account.deleteSoon"), { type: "info", duration: 4500 });
  }

  if (!ready) {
    return <div className="text-white/50 text-sm py-12 text-center">…</div>;
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>{`${t("account.title")} — NΞXBΞT`}</title>
        </Head>
        <main className="max-w-md mx-auto px-4 py-10 lg:py-16 text-center">
          <h1 className="text-lg lg:text-2xl font-bold mb-6">{t("account.title")}</h1>
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 mt-6">
            <p className="text-white/70 mb-4">
              {t("account.loginToManage")}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="block py-3 rounded-lg bg-gradient-to-r from-accent-green to-accent-blue text-white font-semibold"
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

  const themeLabel =
    theme === "system"
      ? `${t("account.themeSystem")} · ${
          resolved === "light" ? t("account.themeLight") : t("account.themeDark")
        }`
      : theme === "light"
        ? t("account.themeLight")
        : t("account.themeDark");

  const oddsLabel =
    oddsFormat === "decimal"
      ? t("account.oddsDecimal")
      : oddsFormat === "fractional"
        ? t("account.oddsFractional")
        : t("account.oddsAmerican");

  const betDisplayLabel =
    betDisplay === "compact"
      ? t("account.betDisplayCompact")
      : t("account.betDisplayDetailed");

  return (
    <>
      <Head>
        <title>{`${t("account.title")} — NΞXBΞT`}</title>
      </Head>
      <main className="max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <h1 className="text-center text-base lg:text-2xl font-semibold lg:font-bold text-white/80 lg:text-white mb-6">
          {t("account.title")}
        </h1>

        {/* Bloc identité */}
        <div className="bg-bg-card border border-white/10 rounded-2xl p-4 flex items-center gap-4 mb-4">
          <button
            onClick={() =>
              showToast(t("account.avatarComingSoon"), {
                type: "info",
              })
            }
            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-green/20 ring-1 ring-white/10 flex items-center justify-center text-white/80 text-2xl font-bold"
            aria-label={t("account.avatar")}
          >
            {user.pseudo.slice(0, 1).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-bg-elevated border-2 border-bg-card flex items-center justify-center text-[10px]">
              ✏️
            </span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">{user.pseudo}</div>
            <div className="text-xs text-white/40 truncate">{user.email}</div>
            <div className="mt-1.5">
              {user.isPremium ? (
                <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-accent-green/20 text-accent-green font-medium">
                  {t("account.premium")} ·{" "}
                  {user.plan === "yearly" ? t("account.planYearly") : t("account.planMonthly")}
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
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-bg-base font-bold rounded-2xl p-4 mb-4 flex items-center justify-between"
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
                {t("account.activeSubscription")}
              </span>
              <span className="text-[10px] text-white/40">
                {user.plan === "yearly"
                  ? t("account.planYearlyDiscount")
                  : t("account.planMonthly")}
              </span>
            </div>
            <p className="text-xs text-white/60 mb-3">
              {t("account.renewalOn")}{" "}
              <strong className="text-white/80">
                {new Date(user.subscriptionEnd).toLocaleDateString(localeForLang(lang), {
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
              {t("account.cancelSubscription")}
            </button>
          </div>
        )}

        {/* Section : Profil */}
        <Section title={t("account.section.profile")}>
          <Row icon="📧" label={t("auth.email")} value={user.email} />
          <Row icon="👤" label={t("auth.pseudo")} value={user.pseudo} />
          <RowSelect
            icon="🔒"
            label={t("account.changePassword")}
            value="••••••••"
            onClick={() =>
              showToast(t("account.passwordComingSoon"), {
                type: "info",
                duration: 4000,
              })
            }
          />
        </Section>

        {/* Section : Préférences */}
        <Section title={t("account.section.preferences")}>
          <RowSelect
            icon={resolved === "light" ? "☀️" : "🌙"}
            label={t("account.theme")}
            value={themeLabel}
            onClick={() => setOpenSheet("theme")}
          />
          <RowSelect
            icon="🌐"
            label={t("account.language")}
            value={`${LANG_LABELS[lang].flag} ${LANG_LABELS[lang].name}`}
            onClick={() => setOpenSheet("lang")}
          />
          <RowSelect
            icon="🎯"
            label={t("account.oddsFormat")}
            value={oddsLabel}
            onClick={() => setOpenSheet("odds")}
          />
          <RowSelect
            icon="💶"
            label={t("account.currency")}
            value={currency}
            onClick={() => setOpenSheet("currency")}
          />
          <RowSelect
            icon="📋"
            label={t("account.betDisplay")}
            value={betDisplayLabel}
            onClick={() => setOpenSheet("betDisplay")}
          />
        </Section>

        {/* Section : Notifications */}
        <Section title={t("account.section.notifications")}>
          <RowToggle
            icon="✉️"
            label={t("account.emailNotif")}
            checked={emailNotif}
            onChange={setEmailNotif}
          />
        </Section>

        {/* Section : Support */}
        <Section title={t("account.section.support")}>
          <RowLink icon="🆕" label={t("account.news")} href="/plus#changelog" />
          <RowLink icon="📺" label={t("account.tutorials")} href="/plus#tutorials" />
          <RowLink icon="📚" label={t("account.help")} href="/plus" />
          <RowAction
            icon="💬"
            label={t("account.contact")}
            onClick={() => (window.location.href = "mailto:hello@cronobots.io")}
          />
          <RowLink icon="📄" label={t("account.legal")} href="/plus#legal" />
        </Section>

        <button
          onClick={handleLogout}
          className="w-full mt-6 py-3 rounded-xl text-white/70 hover:text-accent-red border border-white/10 hover:border-accent-red/30 transition font-medium"
        >
          → {t("auth.logout")}
        </button>

        <button
          onClick={handleDelete}
          className="w-full mt-3 py-3 rounded-xl text-accent-red/80 hover:text-accent-red border border-accent-red/20 hover:border-accent-red/40 transition text-sm"
        >
          {t("account.delete")}
        </button>

        <div className="text-center text-xs text-white/30 mt-6">
          {t("account.appFooter", { year: new Date().getFullYear() })}
        </div>
      </main>

      {/* === Sheets === */}
      <Sheet
        open={openSheet === "theme"}
        onClose={() => setOpenSheet(null)}
        title={t("account.theme")}
      >
        <SheetOption<ThemeChoice>
          icon="☀️"
          label={t("account.themeLight")}
          value="light"
          current={theme}
          onSelect={(v) => {
            setTheme(v);
            setOpenSheet(null);
          }}
        />
        <SheetOption<ThemeChoice>
          icon="🌙"
          label={t("account.themeDark")}
          value="dark"
          current={theme}
          onSelect={(v) => {
            setTheme(v);
            setOpenSheet(null);
          }}
        />
        <SheetOption<ThemeChoice>
          icon="🖥️"
          label={t("account.themeSystem")}
          hint={resolved === "light" ? t("account.themeLight") : t("account.themeDark")}
          value="system"
          current={theme}
          onSelect={(v) => {
            setTheme(v);
            setOpenSheet(null);
          }}
        />
      </Sheet>

      <Sheet
        open={openSheet === "lang"}
        onClose={() => setOpenSheet(null)}
        title={t("account.language")}
      >
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <SheetOption<Lang>
            key={l}
            icon={LANG_LABELS[l].flag}
            label={LANG_LABELS[l].name}
            value={l}
            current={lang}
            onSelect={(v) => {
              setLang(v);
              setOpenSheet(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet
        open={openSheet === "odds"}
        onClose={() => setOpenSheet(null)}
        title={t("account.oddsFormat")}
      >
        <SheetOption<OddsFormat>
          label={t("account.oddsDecimal")}
          hint={t("account.oddsDecimalHint")}
          value="decimal"
          current={oddsFormat}
          onSelect={(v) => {
            setOddsFormat(v);
            setOpenSheet(null);
          }}
        />
        <SheetOption<OddsFormat>
          label={t("account.oddsFractional")}
          hint={t("account.oddsFractionalHint")}
          value="fractional"
          current={oddsFormat}
          onSelect={(v) => {
            setOddsFormat(v);
            setOpenSheet(null);
          }}
        />
        <SheetOption<OddsFormat>
          label={t("account.oddsAmerican")}
          hint={t("account.oddsAmericanHint")}
          value="american"
          current={oddsFormat}
          onSelect={(v) => {
            setOddsFormat(v);
            setOpenSheet(null);
          }}
        />
      </Sheet>

      <Sheet
        open={openSheet === "currency"}
        onClose={() => setOpenSheet(null)}
        title={t("account.currency")}
      >
        {(["EUR", "USD", "GBP", "CHF"] as Currency[]).map((c) => (
          <SheetOption<Currency>
            key={c}
            icon={c === "EUR" ? "💶" : c === "USD" ? "💵" : c === "GBP" ? "💷" : "💰"}
            label={c}
            value={c}
            current={currency}
            onSelect={(v) => {
              setCurrency(v);
              setOpenSheet(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet
        open={openSheet === "betDisplay"}
        onClose={() => setOpenSheet(null)}
        title={t("account.betDisplay")}
      >
        <SheetOption<BetDisplay>
          label={t("account.betDisplayDetailed")}
          hint={t("account.betDisplayDetailedHint")}
          value="detailed"
          current={betDisplay}
          onSelect={(v) => {
            setBetDisplay(v);
            setOpenSheet(null);
          }}
        />
        <SheetOption<BetDisplay>
          label={t("account.betDisplayCompact")}
          hint={t("account.betDisplayCompactHint")}
          value="compact"
          current={betDisplay}
          onSelect={(v) => {
            setBetDisplay(v);
            setOpenSheet(null);
          }}
        />
      </Sheet>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-2 px-1">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-bg-card border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm text-white/50 truncate max-w-[55%] text-right">
        {value}
      </span>
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
      className="w-full bg-bg-card border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 hover:border-accent-green/30 transition text-left"
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm text-white/70 bg-bg-elevated px-3 py-1 rounded-lg max-w-[55%] truncate">
        {value}
      </span>
      <span className="text-white/30 -ml-1">›</span>
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
      className="w-full bg-bg-card border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 hover:border-white/20 transition"
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-white/30">›</span>
    </Link>
  );
}

function RowAction({
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
      className="w-full bg-bg-card border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 hover:border-white/20 transition text-left"
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-white/30">›</span>
    </button>
  );
}

function RowToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full bg-bg-card border border-white/10 rounded-2xl p-3.5 flex items-center gap-3 text-left"
      role="switch"
      aria-checked={checked}
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span
        className={`relative w-11 h-6 rounded-full transition ${
          checked ? "bg-accent-green" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
