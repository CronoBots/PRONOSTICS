/**
 * Logo NΞXBΞT — version PNG transparente.
 *
 * Deux variantes :
 * - "mark"     : monogramme AX seul (`logo.png`, 512×512, carré, fond transparent)
 * - "wordmark" : monogramme AX + texte NEXBET + tagline BET·WIN·REPEAT
 *                (`logo-wordmark.png`, 600×600, fond transparent)
 *
 * Polyvalent : se pose sur n'importe quel fond.
 */

interface Props {
  /** Taille en px du conteneur (carré). Défaut 64. */
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

export function BrandLogo({
  size = 64,
  rounded,
  background = "transparent",
  className = "",
  alt = "NΞXBΞT",
  variant = "mark",
}: Props) {
  const radius = variant === "wordmark" ? 0 : (rounded ?? Math.round(size / 6));
  const src = variant === "wordmark" ? `${BASE}/logo-wordmark.png` : `${BASE}/logo.png`;
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
        src={src}
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
