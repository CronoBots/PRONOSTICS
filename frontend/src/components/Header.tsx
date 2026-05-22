import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useI18n } from "@/lib/i18n";
import { HistoryStats } from "@/lib/types";

interface Props {
  title: string;
  stats?: HistoryStats | null;
}

export function Header({ title, stats }: Props) {
  const { t } = useI18n();
  const bankrollPositive =
    stats !== undefined && stats !== null && stats.current_bankroll >= stats.starting_bankroll;

  return (
    <header className="flex items-center justify-between gap-4 mb-6 md:mb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-accent-green/20 to-accent-blue/20 ring-1 ring-white/10 flex items-center justify-center">
          <span className="bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent text-xs md:text-sm font-extrabold tracking-tighter">
            NΞXBΞT
          </span>
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-white/40 text-[11px] md:text-xs">
            {t("header.brandTagline")}
          </p>
        </div>
      </div>
      {stats && (
        <div className="text-right">
          <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/40">
            {t("header.bankroll")}
          </div>
          <div
            className={`text-xl md:text-2xl font-bold tabular-nums ${
              bankrollPositive ? "text-accent-green" : "text-accent-red"
            }`}
          >
            <AnimatedNumber value={stats.current_bankroll} decimals={2} suffix=" €" />
          </div>
        </div>
      )}
    </header>
  );
}
