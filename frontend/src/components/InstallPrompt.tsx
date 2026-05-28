import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

const DISMISS_KEY = "pronostics.installprompt.dismissedAt";
// Une fois la bannière fermée, on attend 14 jours avant de la
// re-proposer — sinon on harcèle l'utilisateur à chaque visite.
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari expose navigator.standalone, les autres utilisent
  // matchMedia(display-mode: standalone).
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // iPad sur iPadOS 13+ se masque en MacIntel, on regarde aussi maxTouchPoints.
  const isIpad =
    /Macintosh/.test(ua) && (window.navigator.maxTouchPoints ?? 0) > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIpad;
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = parseInt(raw, 10);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const { t } = useI18n();
  const [variant, setVariant] = useState<"ios" | "android" | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    // Android / Chrome desktop : event natif beforeinstallprompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVariant("android");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari ne fire pas l'event → on tente le fallback hint
    // après un petit délai pour ne pas surcharger le first paint.
    let timer: number | null = null;
    if (isIos()) {
      timer = window.setTimeout(() => {
        if (!isStandalone()) setVariant("ios");
      }, 4000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVariant(null);
    setDeferred(null);
  }

  async function triggerInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    dismiss();
  }

  if (!variant) return null;

  return (
    <div className="fixed inset-x-0 z-40 px-4 lg:hidden" style={{ bottom: "calc(var(--safe-bottom) + 5rem)" }}>
      <div className="max-w-md mx-auto bg-bg-card/95 backdrop-blur border border-white/10 rounded-2xl shadow-2xl shadow-black/30 p-4 animate-slideUp">
        <div className="flex items-start gap-3">
          <div className="text-2xl shrink-0 mt-0.5">📲</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">
              {variant === "ios" ? t("install.iosTitle") : t("install.androidTitle")}
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed mt-1">
              {variant === "ios" ? (
                <>
                  {t("install.iosBody").split("«")[0]}
                  <span className="inline-flex items-center gap-1 align-middle">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="inline w-3.5 h-3.5 text-accent-blue"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
                    </svg>
                  </span>
                  {" "}«{t("install.iosBody").split("«")[1]}
                </>
              ) : (
                t("install.androidBody")
              )}
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label={t("install.dismiss")}
            className="text-white/40 hover:text-white shrink-0 -mr-1 -mt-1 p-1"
          >
            ✕
          </button>
        </div>
        {variant === "android" && deferred && (
          <button
            onClick={triggerInstall}
            className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-green text-bg-base font-bold text-sm active:scale-[0.99] transition-transform duration-100"
          >
            {t("install.cta")}
          </button>
        )}
      </div>
    </div>
  );
}
