import "@/styles/globals.css";

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

  return (
    <I18nProvider>
      <AuthProvider>
        <div className={showNav ? "pb-20" : ""}>
          <Component {...pageProps} />
        </div>
        {showNav && <BottomNav />}
        {showNav && <Onboarding />}
      </AuthProvider>
    </I18nProvider>
  );
}
