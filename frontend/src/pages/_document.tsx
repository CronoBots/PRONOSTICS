import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* Viewport : zoom désactivé + viewport-fit cover pour bords écran iOS */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* Cache busting agressif */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="theme-color" content="#0a0b1e" />

        {/* PWA installable */}
        <link rel="manifest" href="/PRONOSTICS/manifest.json" />
        <link rel="apple-touch-icon" href="/PRONOSTICS/icons/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WTF" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Open Graph */}
        <meta property="og:title" content="WTF — Win The Future" />
        <meta property="og:description" content="L'IA qui analyse 30+ matchs par jour et identifie LE value bet à cote ≥ 2.00 le plus fiable. Tracking ROI transparent." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/PRONOSTICS/icons/og-image.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="WTF — Win The Future · L'IA qui prédit, tu gagnes" />
        <meta property="og:site_name" content="Win The Future" />
        <meta property="og:locale" content="fr_FR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WTF — Win The Future" />
        <meta name="twitter:description" content="L'IA qui prédit. Tu gagnes." />
        <meta name="twitter:image" content="/PRONOSTICS/icons/og-image.svg" />
        <meta name="description" content="L'IA qui analyse 30+ matchs par jour et identifie LE value bet à cote ≥ 2.00 le plus fiable. Tracking ROI transparent, historique vérifiable." />
        <meta name="keywords" content="paris sportifs, value bet, IA, pronostic, football, NBA, tennis, NHL, MLB, ROI, bankroll, bookmaker" />
        <meta name="author" content="CronoBots" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
