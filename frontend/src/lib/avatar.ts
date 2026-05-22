/**
 * Avatar / photo de profil — stockage local (base64 dans localStorage).
 *
 * MVP : pas de cloud sync. La photo est par-navigateur. Future amélioration :
 * upload vers Supabase Storage (bucket "avatars", policy RLS user_id).
 *
 * Pour éviter de saturer le quota localStorage (5-10 MB selon le navigateur),
 * la photo est downscale automatiquement à 256x256 via Canvas avant stockage.
 */

const STORAGE_KEY = "pronostics.avatar";
const MAX_DIM = 256;
const QUALITY = 0.85;

/** Récupère le data URL de l'avatar (ou null si pas défini). */
export function loadAvatar(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Supprime l'avatar du stockage local. */
export function clearAvatar(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("avatar-changed"));
  } catch {
    /* ignore */
  }
}

/**
 * Lit un fichier image utilisateur, le downscale en 256x256 (objet-cover style)
 * via Canvas, le compresse en JPEG 85% et sauvegarde le data URL.
 *
 * Retourne le data URL résultant (ou null en cas d'erreur).
 */
export async function saveAvatarFromFile(file: File): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!file.type.startsWith("image/")) return null;

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  const downscaled = downscaleSquare(img, MAX_DIM);

  try {
    window.localStorage.setItem(STORAGE_KEY, downscaled);
    window.dispatchEvent(new CustomEvent("avatar-changed"));
    return downscaled;
  } catch {
    // Quota exceeded probable — laisser remonter en null
    return null;
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Crop carré centré + resize à dimMax×dimMax via Canvas, retourne data URL JPEG.
 */
function downscaleSquare(img: HTMLImageElement, dimMax: number): string {
  const { naturalWidth: w, naturalHeight: h } = img;
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = dimMax;
  canvas.height = dimMax;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Améliore le rendering avec antialiasing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, dimMax, dimMax);

  return canvas.toDataURL("image/jpeg", QUALITY);
}
