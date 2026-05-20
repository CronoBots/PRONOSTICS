import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await login(email.trim(), password);
    setBusy(false);
    if (res.ok) router.push("/");
    else setError(res.error ?? "Erreur");
  }

  return (
    <>
      <Head>
        <title>{t("auth.login")} — PRONOSTICS</title>
      </Head>
      <main className="min-h-screen flex flex-col">
        {/* Hero vert */}
        <div className="bg-accent-green flex-1 flex items-center justify-center py-16 min-h-[280px]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 ring-2 ring-white/40 mx-auto mb-3 flex items-center justify-center">
              <span className="text-white text-3xl font-bold">P</span>
            </div>
            <div className="text-white font-bold text-2xl tracking-tight">PRONOSTICS</div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-bg-card -mt-6 rounded-t-3xl px-6 py-8 max-w-md w-full mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">{t("auth.login")}</h1>
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
            <label className="block">
              <span className="text-xs text-white/50 uppercase tracking-wider">
                {t("auth.password")}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="mt-1 w-full bg-bg-elevated border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-green/50 placeholder:text-white/30"
                required
                minLength={6}
              />
            </label>
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-white/50 hover:text-accent-green"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
            {error && (
              <div className="text-sm text-accent-red bg-accent-red/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-accent-blue to-purple-500 text-white font-semibold disabled:opacity-50"
            >
              {busy ? "…" : t("auth.login")}
            </button>
            <Link
              href="/register"
              className="block text-center text-sm text-white/60 hover:text-white py-2"
            >
              {t("auth.noAccount")} →
            </Link>
          </form>
        </div>
      </main>
    </>
  );
}
