import { AnimatedNumber } from "@/components/AnimatedNumber";
import { BrandLogo } from "@/components/BrandLogo";
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
    <header className="lg:hidden flex items-center justify-between gap-2 mb-4 md:mb-6">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <BrandLogo size={40} rounded={10} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold tracking-tight truncate">{title}</h1>
          <p className="text-white/40 text-[10px] md:text-xs truncate">
            {t("header.brandTagline")}
          </p>
        </div>
      </div>
      {stats && (
        <div className="text-right shrink-0">
          <div className="text-[9px] md:text-xs uppercase tracking-wider text-white/40">
            {t("header.bankroll")}
          </div>
          <div
            className={`text-base md:text-2xl font-bold tabular-nums ${
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
