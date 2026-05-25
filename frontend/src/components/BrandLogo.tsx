/**
 * Logo NΞXBΞT — version PNG transparente.
 *
 * Deux variantes :
 * - "mark"     : monogramme AX seul, carré (`logo.png`, 512×512). `size` = côté.
 * - "wordmark" : monogramme AX + texte NEXBET + tagline (`logo-wordmark.png`,
 *                513×400, ratio ~1.28:1). `size` = HAUTEUR ; largeur calculée
 *                automatiquement pour préserver le ratio (pas d'écrasement).
 *
 * Polyvalent : se pose sur n'importe quel fond.
 */

interface Props {
  /** Taille en px. Pour mark = côté du carré ; pour wordmark = hauteur. Défaut 64. */
  size?: number;
  /** Border-radius en px (uniquement si background fourni). Ignoré en wordmark. */
  rounded?: number;
  /** Optionnel : couleur de fond derrière le logo. Par défaut transparent. */
  background?: string;
  /** Optionnel : className additionnelle */
  className?: string;
  /** Alt text. Défaut "NΞXBΞT". */
  alt?: string;
  /** "mark" (défaut) = monogramme seul ; "wordmark" = monogramme + texte */
  variant?: "mark" | "wordmark";
}

const BASE = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";
const WORDMARK_RATIO = 513 / 400; // ratio largeur/hauteur du PNG source

export function BrandLogo({
  size = 64,
  rounded,
  background = "transparent",
  className = "",
  alt = "NΞXBΞT",
  variant = "mark",
}: Props) {
  if (variant === "wordmark") {
    const width = Math.round(size * WORDMARK_RATIO);
    return (
      <img
        src={`${BASE}/logo-wordmark.png`}
        alt={alt}
        width={width}
        height={size}
        loading="eager"
        decoding="async"
        className={className}
        style={{ display: "block", height: size, width: "auto" }}
      />
    );
  }
  const radius = rounded ?? Math.round(size / 6);
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background,
        borderRadius: radius,
      }}
    >
      <img
        src={`${BASE}/logo.png`}
        alt={alt}
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </span>
  );
}
