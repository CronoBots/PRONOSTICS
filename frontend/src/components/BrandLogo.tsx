/**
 * Logo NΞXBΞT — version PNG transparente (hexagone blanc détouré).
 *
 * Source : frontend/public/logo.png (512×512, fond transparent, ~130 KB).
 * Polyvalent : se pose sur n'importe quel fond (vert, sombre, gradient…).
 * Le hexagone blanc 3D avec son ombre douce reste visible partout.
 */

interface Props {
  /** Taille en px du conteneur (carré). Défaut 64. */
  size?: number;
  /** Border-radius en px (uniquement si background fourni). */
  rounded?: number;
  /** Optionnel : couleur de fond derrière le logo. Par défaut transparent. */
  background?: string;
  /** Optionnel : className additionnelle */
  className?: string;
  /** Alt text. Défaut "NΞXBΞT". */
  alt?: string;
}

const BASE = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";

export function BrandLogo({
  size = 64,
  rounded,
  background = "transparent",
  className = "",
  alt = "NΞXBΞT",
}: Props) {
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
