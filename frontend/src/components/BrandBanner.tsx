/**
 * Bannière NΞXBΞT — texte stylisé + tagline + barres décoratives.
 *
 * Switch automatique selon le thème :
 *  - dark   → banniere-teal.png (couleur logo)
 *  - light  → banniere-black.png
 *
 * Source : 600px de large à l'origine, scale-to-fit via CSS.
 */

import { useTheme } from "@/lib/theme";

interface Props {
  /** Hauteur max en px. Défaut 64 (mobile). */
  height?: number;
  className?: string;
}

const BASE = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";

export function BrandBanner({ height = 64, className = "" }: Props) {
  const { resolved } = useTheme();
  const src =
    resolved === "light"
      ? `${BASE}/banniere-black.png`
      : `${BASE}/banniere-teal.png`;
  return (
    <img
      src={src}
      alt="NΞXBΞT — Trust the Algorithm"
      className={`block max-w-full object-contain ${className}`}
      style={{ height, width: "auto", maxHeight: height }}
      loading="eager"
      decoding="async"
    />
  );
}
