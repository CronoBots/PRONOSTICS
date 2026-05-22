/**
 * Logo NΞXBΞT — image officielle (hexagone teal + chevrons blancs 3D).
 *
 * Source : frontend/public/logo.jpg (1024×1024, ~95 KB).
 * Le logo a déjà son fond teal intégré ; pour utiliser sur un fond personnalisé,
 * passe `background="transparent"` (l'image gardera son fond teal d'origine).
 */

interface Props {
  /** Taille en px du conteneur (carré). Défaut 64. */
  size?: number;
  /** Border-radius en px. Défaut size/6. */
  rounded?: number;
  /** Optionnel : className additionnelle */
  className?: string;
  /** Alt text. Défaut "NΞXBΞT". */
  alt?: string;
}

const BASE = process.env.NEXT_PUBLIC_RESOLVED_BASE_PATH || "";

export function BrandLogo({ size = 64, rounded, className = "", alt = "NΞXBΞT" }: Props) {
  const radius = rounded ?? Math.round(size / 6);
  return (
    <span
      className={`inline-block overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
      }}
    >
      <img
        src={`${BASE}/logo.jpg`}
        alt={alt}
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    </span>
  );
}
