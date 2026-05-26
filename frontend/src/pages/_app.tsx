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

  // App-feel mobile : empêche le pinch-zoom iOS Safari (qui ignore
  // user-scalable=no depuis iOS 10) + double-tap zoom. Le viewport meta
  // tag ne suffit pas, il faut bloquer les events gesturestart côté JS.
  useEffect(() => {
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    document.addEventListener("gestureend", preventGesture);

    // Empêche aussi le double-tap zoom (fallback hors Safari)
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchend", preventDoubleTapZoom);
    };
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
              // Mobile : hauteur stricte = viewport visible (100dvh suit l'URL bar
              // mobile) moins safe-top (body a déjà padding-top: safe-top).
              // Desktop (lg) : hauteur auto + min-h-screen pour permettre le scroll
              // sur les pages plus longues.
              className="page-fade flex flex-col h-[calc(100dvh-var(--safe-top,0px))] lg:h-auto lg:min-h-screen"
              style={{ background: "var(--bg-base)" }}
            >
              {showNav && <DesktopHeader />}
              <div
                // Mobile: overflow-y-auto autorise le scroll interne quand la
                // page depasse le viewport (la wrapper outer a height strict).
                // Desktop (lg): overflow-visible -> body scroll natif via
                // lg:h-auto lg:min-h-screen sur l'outer wrapper.
                className={`flex-1 flex flex-col min-h-0 overflow-y-auto lg:overflow-visible ${
                  showNav ? "pb-[calc(var(--safe-bottom)+4rem)] lg:pb-0" : ""
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
