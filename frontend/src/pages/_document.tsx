import { Html, Head, Main, NextScript } from "next/document";

// Anti-FOUC : inline script qui applique le thème AVANT que la page ne s'hydrate.
// Doit être dans _document pour s'exécuter en tout premier (avant le bundle React).
const THEME_BOOT = `(function(){try{var s=localStorage.getItem('pronostics.theme');var r;if(s==='light'||s==='dark'){r=s;}else{r=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',r);var m=document.querySelector('meta[name=theme-color]');if(m){m.content=r==='light'?'#f6f7fb':'#0a0b1e';}}catch(e){}})();`;

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* Note : <meta name="viewport"> est dans _app.tsx (recommandation Next.js).
           Le _document.tsx contient uniquement les meta tags statiques + assets. */}

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
        <meta name="apple-mobile-web-app-title" content="NΞXBΞT" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Open Graph */}
        <meta property="og:title" content="NΞXBΞT — Trust the Algorithm" />
        <meta property="og:description" content="L'IA qui analyse 30+ matchs par jour et identifie LE value bet à cote ≥ 2.00 le plus fiable. Tracking ROI transparent." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/PRONOSTICS/icons/og-image.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="NΞXBΞT — Trust the Algorithm · L'IA qui prédit, tu gagnes" />
        <meta property="og:site_name" content="Trust the Algorithm" />
        <meta property="og:locale" content="fr_FR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NΞXBΞT — Trust the Algorithm" />
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
