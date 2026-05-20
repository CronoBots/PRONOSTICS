import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
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
        <meta name="apple-mobile-web-app-title" content="PRONOSTICS" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Open Graph (preview sur réseaux sociaux) */}
        <meta property="og:title" content="PRONOSTICS — Pick safe du jour" />
        <meta property="og:description" content="1 value bet par jour analysé manuellement. Cote ≥ 2.00, ROI suivi en temps réel." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/PRONOSTICS/icons/icon-512.svg" />
        <meta name="twitter:card" content="summary_large_image" />

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
