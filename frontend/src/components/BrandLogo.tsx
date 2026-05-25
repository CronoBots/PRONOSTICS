/**
 * Logo NΞXBΞT — variantes PNG.
 *
 * Trois variantes :
 * - "mark"     : monogramme AX seul, carré transparent (`logo.png`, 512×512).
 *                `size` = côté.
 * - "wordmark" : mark AX + texte NEXBET + tagline, transparent
 *                (`logo-wordmark.png`, 513×400). `size` = HAUTEUR ; largeur auto.
 * - "banner"   : bannière NEXBET + tagline horizontale (`logo-banner.png`,
 *                640×427, ratio 1.5:1, **fond blanc** — version brand
 *                officielle uploadée par l'utilisateur). `size` = HAUTEUR.
 */

interface Props {
  /** Taille en px. Pour mark = côté du carré ; pour wordmark/banner = hauteur. */
  size?: number;
  /** Border-radius en px (uniquement si background fourni). Ignoré en wordmark/banner. */
  rounded?: number;
  /** Optionnel : couleur de fond derrière le logo. Par défaut transparent. */
  background?: string;
  /** Optionnel : className additionnelle */
  className?: string;
  /** Alt text. Défaut "NΞXBΞT". */
  alt?: string;
  /** "mark" (défaut) | "wordmark" (mark + texte) | "banner" (texte seul) */
  variant?: "mark" | "wordmark" | "banner";
}

const BASE = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";
const WORDMARK_RATIO = 513 / 400; // ratio largeur/hauteur du PNG wordmark
const BANNER_RATIO = 640 / 427;   // ratio largeur/hauteur du PNG bannière user (~1.5:1)

export function BrandLogo({
  size = 64,
  rounded,
  background = "transparent",
  className = "",
  alt = "NΞXBΞT",
  variant = "mark",
}: Props) {
  if (variant === "wordmark" || variant === "banner") {
    const ratio = variant === "banner" ? BANNER_RATIO : WORDMARK_RATIO;
    const width = Math.round(size * ratio);
    const src = variant === "banner" ? `${BASE}/logo-banner.png` : `${BASE}/logo-wordmark.png`;
    return (
      <img
        src={src}
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
