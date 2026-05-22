/**
 * Bannière NΞXBΞT — texte stylisé + tagline + barres décoratives.
 *
 * Toujours la version teal (couleur signature de la marque), quel que soit le
 * thème. Sur fond clair OU sombre, le teal se voit nettement.
 *
 * Source : 600px de large à l'origine, scale-to-fit via CSS.
 */

interface Props {
  /** Hauteur max en px. Défaut 40 (mobile). */
  height?: number;
  className?: string;
}

const BASE = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";

export function BrandBanner({ height = 40, className = "" }: Props) {
  return (
    <img
      src={`${BASE}/banniere-teal.png`}
      alt="NΞXBΞT — Trust the Algorithm"
      className={`block max-w-full object-contain ${className}`}
      style={{ height, width: "auto", maxHeight: height }}
      loading="eager"
      decoding="async"
    />
  );
}
