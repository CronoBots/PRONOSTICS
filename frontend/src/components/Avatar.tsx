/**
 * Avatar — photo de profil utilisateur OU initiale en fallback.
 *
 * Mode interactif (editable=true) : tap → ouvre le file picker pour changer
 * la photo. Mode lecture seule : affiche juste l'image / l'initiale.
 *
 * Sync via event "avatar-changed" : tous les Avatar montés se rafraîchissent
 * automatiquement quand l'utilisateur change sa photo depuis /compte.
 */

import { useEffect, useRef, useState } from "react";

import { showToast } from "@/components/Toast";
import { loadAvatar, saveAvatarFromFile } from "@/lib/avatar";
import { useI18n } from "@/lib/i18n";

interface Props {
  /** Initiale à afficher si pas d'avatar (ex. première lettre du pseudo). */
  initial?: string;
  /** Taille en px. Défaut 64. */
  size?: number;
  /** Si true : ouvre le file picker au tap. Défaut false. */
  editable?: boolean;
  /** Classes additionnelles sur le wrapper. */
  className?: string;
}

export function Avatar({
  initial = "?",
  size = 64,
  editable = false,
  className = "",
}: Props) {
  const { t } = useI18n();
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Chargement initial + sync inter-composants via event custom
  useEffect(() => {
    setSrc(loadAvatar());
    const handler = () => setSrc(loadAvatar());
    window.addEventListener("avatar-changed", handler);
    return () => window.removeEventListener("avatar-changed", handler);
  }, []);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset pour permettre re-pick du même fichier
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast(t("avatar.errTooLarge"), { type: "error" });
      return;
    }
    setBusy(true);
    const result = await saveAvatarFromFile(file);
    setBusy(false);
    if (result) {
      showToast(t("avatar.updated"), { type: "success" });
    } else {
      showToast(t("avatar.errSave"), { type: "error" });
    }
  }

  const fontSize = Math.round(size * 0.42);

  const inner = src ? (
    <img
      src={src}
      alt={t("avatar.alt")}
      width={size}
      height={size}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  ) : (
    <span
      className="font-bold text-white"
      style={{ fontSize }}
      aria-hidden
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  );

  // Avatar v6.9 : fond cyan brand bien visible (vs ancien gradient sombre
  // qui rendait le V quasi invisible sur fond noir). Bordure cyan + glow
  // subtil pour bien le faire ressortir.
  const baseClass = `rounded-full overflow-hidden ring-2 ring-accent-blue/40 bg-gradient-to-br from-accent-blue/80 to-accent-blue/40 flex items-center justify-center shadow-lg shadow-accent-blue/15 ${className}`;
  const style = { width: size, height: size };

  if (!editable) {
    return (
      <span className={baseClass} style={style}>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className={`relative ${baseClass} cursor-pointer hover:opacity-90 transition disabled:opacity-60`}
      style={style}
      disabled={busy}
      aria-label={t("avatar.change")}
    >
      {inner}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFileSelected}
        className="hidden"
      />
      <span
        className="absolute bottom-0 right-0 bg-bg-elevated border-2 border-bg-card flex items-center justify-center"
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: "50%",
        }}
        aria-hidden
      >
        <span style={{ fontSize: size * 0.18 }}>✏️</span>
      </span>
    </button>
  );
}
