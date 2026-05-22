import "@/styles/globals.css";

import { useEffect } from "react";
import Head from "next/head";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";

import { BottomNav } from "@/components/BottomNav";
import { DesktopHeader } from "@/components/DesktopHeader";
import { Onboarding } from "@/components/Onboarding";
import { ToastContainer } from "@/components/Toast";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { PreferencesProvider } from "@/lib/preferences";
import { ThemeProvider } from "@/lib/theme";

const HIDE_NAV = new Set(["/login", "/register", "/forgot-password", "/verify-email"]);

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
    <ThemeProvider>
      <PreferencesProvider>
        <I18nProvider>
          <AuthProvider>
            <Head>
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
              />
            </Head>
            <div
              key={router.pathname}
              className="page-fade flex flex-col"
              style={{
                background: "var(--bg-base)",
                // 100dvh = dynamic viewport height : s'adapte automatiquement à
                // l'URL bar mobile Safari/Chrome quand elle se cache / s'affiche.
                // -safe-top car body a déjà padding-top:safe-top.
                minHeight: "calc(100dvh - var(--safe-top, 0px))",
              }}
            >
              {showNav && <DesktopHeader />}
              <div
                className={`flex-1 flex flex-col ${
                  showNav ? "pb-[calc(var(--safe-bottom)+5.5rem)] lg:pb-0" : ""
                }`}
              >
                <Component {...pageProps} />
              </div>
            </div>
            {showNav && <BottomNav />}
            {showNav && <Onboarding />}
            <ToastContainer />
          </AuthProvider>
        </I18nProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
