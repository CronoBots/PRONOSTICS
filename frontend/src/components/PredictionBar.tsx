import { ProbabilityEntry } from "@/lib/types";

interface Props {
  probabilities: ProbabilityEntry[];
  pick: string;
}

const COLORS = ["bg-brand-500", "bg-slate-500", "bg-fuchsia-500"];

export function PredictionBar({ probabilities, pick }: Props) {
  return (
    <div>
      <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-white/5">
        {probabilities.map((p, idx) => (
          <div
            key={p.outcome}
            className={`${COLORS[idx % COLORS.length]} transition-all`}
            style={{ width: `${p.probability * 100}%` }}
            title={`${p.outcome}: ${(p.probability * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/70">
        {probabilities.map((p) => (
          <span
            key={p.outcome}
            className={p.outcome === pick ? "text-white font-semibold" : ""}
          >
            {p.outcome} {(p.probability * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
