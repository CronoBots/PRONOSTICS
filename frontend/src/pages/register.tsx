import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [cgu, setCgu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (!cgu) {
      setError("Tu dois accepter les CGU");
      return;
    }
    setBusy(true);
    const res = await register(pseudo, email.trim(), password);
    setBusy(false);
    if (res.ok) router.push("/");
    else setError(res.error ?? "Erreur");
  }

  return (
    <>
      <Head>
        <title>{t("auth.register")} — WTF</title>
      </Head>
      <main className="min-h-screen flex flex-col">
        <div className="bg-accent-green flex-1 flex items-center justify-center py-16 min-h-[280px]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 ring-2 ring-white/40 mx-auto mb-3 flex items-center justify-center">
              <span className="text-3xl">🤖</span>
            </div>
            <div className="text-white font-bold text-2xl tracking-tight">WTF</div>
            <div className="text-white/80 text-xs mt-1 tracking-wider">Win The Future</div>
          </div>
        </div>

        <div className="bg-bg-card -mt-6 rounded-t-3xl px-6 py-8 max-w-md w-full mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">{t("auth.register")}</h1>
          <form onSubmit={onSubmit} className="space-y-3.5">
            <label className="block">
              <span className="text-xs text-white/50 uppercase tracking-wider">
                {t("auth.pseudo")}
              </span>
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="Pseudo"
                className="mt-1 w-full bg-bg-elevated border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-green/50 placeholder:text-white/30"
                required
              />
            </label>
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
            <label className="block">
              <span className="text-xs text-white/50 uppercase tracking-wider">
                {t("auth.passwordConfirm")}
              </span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="********"
                className="mt-1 w-full bg-bg-elevated border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-green/50 placeholder:text-white/30"
                required
                minLength={6}
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-white/60 cursor-pointer">
              <input
                type="checkbox"
                checked={cgu}
                onChange={(e) => setCgu(e.target.checked)}
                className="mt-0.5"
              />
              <span>{t("auth.acceptCgu")}</span>
            </label>
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
              {busy ? "…" : t("auth.register")}
            </button>
            <Link
              href="/login"
              className="block text-center text-sm text-white/60 hover:text-white py-2"
            >
              {t("auth.hasAccount")} →
            </Link>
          </form>
        </div>
      </main>
    </>
  );
}
