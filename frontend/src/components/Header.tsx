import { HistoryStats } from "@/lib/types";

interface Props {
  title: string;
  stats?: HistoryStats | null;
}

export function Header({ title, stats }: Props) {
  const bankrollPositive =
    stats !== undefined && stats !== null && stats.current_bankroll >= stats.starting_bankroll;

  return (
    <header className="flex items-center justify-between gap-4 mb-6 md:mb-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent-green/15 ring-1 ring-accent-green/30 flex items-center justify-center">
          <span className="text-accent-green text-lg md:text-xl font-bold">P</span>
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-white/40 text-[11px] md:text-xs">
            1 value bet par jour · cote ≥ 2.00
          </p>
        </div>
      </div>
      {stats && (
        <div className="text-right">
          <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/40">
            Bankroll
          </div>
          <div
            className={`text-xl md:text-2xl font-bold tabular-nums ${
              bankrollPositive ? "text-accent-green" : "text-accent-red"
            }`}
          >
            {stats.current_bankroll.toFixed(2)} €
          </div>
        </div>
      )}
    </header>
  );
}
