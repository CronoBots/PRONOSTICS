import { SPORT_EMOJIS, SPORT_LABELS } from "@/lib/types";

interface Props {
  sports: string[];
  active: string | null;
  onChange: (sport: string | null) => void;
}

export function SportFilter({ sports, active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-full text-sm border transition ${
          active === null
            ? "bg-brand-500 border-brand-500 text-white"
            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
        }`}
      >
        Tous
      </button>
      {sports.map((sport) => {
        const isActive = active === sport;
        return (
          <button
            type="button"
            key={sport}
            onClick={() => onChange(sport)}
            className={`px-3 py-1.5 rounded-full text-sm border transition flex items-center gap-1.5 ${
              isActive
                ? "bg-brand-500 border-brand-500 text-white"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            <span>{SPORT_EMOJIS[sport] || ""}</span>
            <span>{SPORT_LABELS[sport] || sport}</span>
          </button>
        );
      })}
    </div>
  );
}
