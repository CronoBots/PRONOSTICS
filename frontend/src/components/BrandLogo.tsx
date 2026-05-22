/**
 * Logo NΞXBΞT — hexagone blanc avec chevrons intérieurs.
 * SVG inline (pas de fichier image) pour rendu net à toutes tailles.
 *
 * En attendant le vrai PNG fourni par le brand, c'est une version simplifiée
 * inspirée du logo officiel (hexagone teal/blanc).
 */

interface Props {
  /** Taille en px du conteneur (carré). Défaut 64. */
  size?: number;
  /** Couleur du fond. Défaut accent-green (#10d9a3). Mettre "transparent" pour logo détouré. */
  background?: string;
  /** Couleur du trait du logo. Défaut blanc. */
  stroke?: string;
  /** Border-radius en px. Défaut size/6. */
  rounded?: number;
  /** Ratio de l'hexagone à l'intérieur (0.7 = hexagone occupant 70% du carré). Défaut 0.66. */
  fill?: number;
  /** Optionnel : className additionnelle */
  className?: string;
}

export function BrandLogo({
  size = 64,
  background = "#10d9a3",
  stroke = "#ffffff",
  rounded,
  fill: _fillRatio = 0.66,
  className = "",
}: Props) {
  const radius = rounded ?? Math.round(size / 6);
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background,
        borderRadius: radius,
      }}
      aria-label="NΞXBΞT"
    >
      <svg viewBox="0 0 100 100" width={size * 0.72} height={size * 0.72} aria-hidden>
        {/* Hexagone */}
        <polygon
          points="50,18 80,36 80,72 50,90 20,72 20,36"
          fill="none"
          stroke={stroke}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        {/* Chevron gauche */}
        <path
          fill={stroke}
          d="M 36 42 L 43 42 L 43 47 L 47 47 L 47 51 L 43 51 L 43 57 L 47 57 L 47 61 L 43 61 L 43 66 L 36 66 Z"
        />
        {/* Chevron droit */}
        <path
          fill={stroke}
          d="M 64 42 L 57 42 L 57 47 L 53 47 L 53 51 L 57 51 L 57 57 L 53 57 L 53 61 L 57 61 L 57 66 L 64 66 Z"
        />
      </svg>
    </span>
  );
}
