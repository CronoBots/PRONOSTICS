import { useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { useI18n } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      <Head>
        <title>{t("auth.forgotPasswordTitleTab")}</title>
      </Head>
      <main className="min-h-screen flex flex-col relative">
        {/* Back button — flottant en haut à gauche */}
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
              <span className="text-3xl">🤖</span>
            </div>
            <div className="text-white font-bold text-2xl tracking-tight">WTF</div>
            <div className="text-white/80 text-xs mt-1 tracking-wider">Win The Future</div>
          </div>
        </div>

        <div className="bg-bg-card -mt-6 rounded-t-3xl px-6 py-8 max-w-md w-full mx-auto">
          <h1 className="text-2xl font-bold text-center mb-3">{t("auth.forgotPasswordTitle")}</h1>
          <p className="text-sm text-white/60 text-center mb-6">
            {t("auth.forgotPasswordIntro")}
          </p>
          {sent ? (
            <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4 text-sm text-center text-accent-green">
              {t("auth.forgotPasswordSent")}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="text-xs text-white/50 uppercase tracking-wider">
                  {t("auth.email")}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@mail.com"
                  className="mt-1 w-full bg-bg-elevated border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-green/50 placeholder:text-white/30"
                  required
                />
              </label>
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-gradient-to-r from-accent-blue to-purple-500 text-white font-semibold"
              >
                {t("auth.sendLink")}
              </button>
            </form>
          )}
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
