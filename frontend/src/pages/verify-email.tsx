import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { showToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const COOLDOWN_SECONDS = 30;

export default function VerifyEmailPage() {
  const { t } = useI18n();
  const { resendConfirmation } = useAuth();
  const router = useRouter();
  const queryEmail = typeof router.query.email === "string" ? router.query.email : "";
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (queryEmail) setEmail(queryEmail);
  }, [queryEmail]);

  // Cooldown anti-spam pour le bouton "Renvoyer"
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (!email || !email.includes("@")) {
      showToast(t("auth.errEmailInvalid"), { type: "error" });
      return;
    }
    setBusy(true);
    const res = await resendConfirmation(email.trim());
    setBusy(false);
    if (res.ok) {
      showToast(t("auth.toastConfirmationResent"), { type: "success" });
      setCooldown(COOLDOWN_SECONDS);
    } else {
      showToast(res.error ?? t("auth.errGeneric"), { type: "error" });
    }
  }

  return (
    <>
      <Head>
        <title>{t("auth.verifyEmailTitleTab")}</title>
      </Head>
      <main className="min-h-screen flex flex-col relative">
        <Link
          href="/login"
          aria-label={t("auth.backToLogin")}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center text-white hover:bg-white/25 transition"
          style={{ marginTop: "var(--safe-top)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        <div className="bg-accent-green flex-1 flex items-center justify-center py-16 min-h-[260px]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 ring-2 ring-white/40 mx-auto mb-3 flex items-center justify-center">
              <span className="text-3xl">📬</span>
            </div>
            <div className="text-white font-bold text-2xl tracking-tight">WTF</div>
            <div className="text-white/80 text-xs mt-1 tracking-wider">Win The Future</div>
          </div>
        </div>

        <div className="bg-bg-card -mt-6 rounded-t-3xl px-6 py-8 max-w-md w-full mx-auto">
          <h1 className="text-2xl font-bold text-center mb-2">{t("auth.verifyEmailTitle")}</h1>
          <p className="text-sm text-white/65 text-center leading-relaxed mb-2">
            {t("auth.verifyEmailIntro")}
          </p>

          {email && (
            <div className="bg-bg-elevated border border-white/10 rounded-xl px-3 py-2 text-center font-mono text-sm text-accent-green break-all mb-4">
              {email}
            </div>
          )}

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-4">
            <ol className="space-y-2 text-xs text-white/70 list-decimal list-inside leading-relaxed">
              <li>{t("auth.verifyStep1")}</li>
              <li>{t("auth.verifyStep2")}</li>
              <li>{t("auth.verifyStep3")}</li>
            </ol>
          </div>

          {/* Si pas d'email dans l'URL, on permet de le saisir pour resend */}
          {!queryEmail && (
            <label className="block mb-3">
              <span className="text-[11px] text-white/50 uppercase tracking-wider">
                {t("auth.email")}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@mail.com"
                className="mt-1 w-full bg-bg-elevated border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-green/50 placeholder:text-white/30"
              />
            </label>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={busy || cooldown > 0}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-accent-blue to-purple-500 text-white font-semibold disabled:opacity-50"
          >
            {busy
              ? "…"
              : cooldown > 0
                ? t("auth.resendCooldown", { s: cooldown })
                : t("auth.resendConfirmation")}
          </button>

          <p className="text-[11px] text-white/40 text-center mt-3 leading-relaxed">
            {t("auth.verifyTroubleshoot")}
          </p>

          <Link
            href="/login"
            className="block text-center text-sm text-white/60 hover:text-white py-4 mt-2"
          >
            ← {t("auth.backToLogin")}
          </Link>
        </div>
      </main>
    </>
  );
}
