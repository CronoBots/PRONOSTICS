import "@/styles/globals.css";

import { useEffect } from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";

import { BottomNav } from "@/components/BottomNav";
import { Onboarding } from "@/components/Onboarding";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";

const HIDE_NAV = new Set(["/login", "/register", "/forgot-password"]);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const showNav = !HIDE_NAV.has(router.pathname);

  // Pin les valeurs safe-area iOS au premier load pour éviter les
  // recalculs intempestifs (clavier qui s'affiche, transitions, etc.)
  useEffect(() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    // Lecture des env() résolus initialement
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;visibility:hidden;" +
      "padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const top = cs.paddingTop;
    const bottom = cs.paddingBottom;
    document.body.removeChild(probe);
    if (top && top !== "0px") root.style.setProperty("--safe-top", top);
    if (bottom && bottom !== "0px") root.style.setProperty("--safe-bottom", bottom);
  }, []);

  return (
    <I18nProvider>
      <AuthProvider>
        {/* Viewport doit être dans _app ou page-level (jamais dans _document) */}
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          />
        </Head>
        <div
          // key force un remount + animation fade au changement de route
          // pour masquer la latence de chargement du chunk Next.js.
          // PAS de min-height ni contain (cassait le layout de la Home).
          key={router.pathname}
          className="page-fade"
          style={{
            background: "var(--bg-base)",
            paddingBottom: showNav ? "calc(var(--safe-bottom) + 5.5rem)" : 0,
          }}
        >
          <Component {...pageProps} />
        </div>
        {showNav && <BottomNav />}
        {showNav && <Onboarding />}
      </AuthProvider>
    </I18nProvider>
  );
}
