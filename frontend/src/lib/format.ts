/**
 * Formate un nombre avec son signe (+/-) et un suffixe optionnel.
 * Utilisé par les composants qui affichent des montants signés (gain/perte,
 * progression, etc.).
 *
 * Exemples :
 *   formatSignedAmount(13.57)            -> "+13.57 €"
 *   formatSignedAmount(-5)               -> "-5.00 €"
 *   formatSignedAmount(0)                -> "0.00 €"
 *   formatSignedAmount(2.5, "%", 1)      -> "+2.5%"
 *   formatSignedAmount(-1.234, " €", 3)  -> "-1.234 €"
 */
export function formatSignedAmount(
  value: number,
  suffix = " €",
  decimals = 2,
): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}${suffix}`;
}
