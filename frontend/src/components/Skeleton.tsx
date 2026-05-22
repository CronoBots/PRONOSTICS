interface Props {
  className?: string;
}

export function Skeleton({ className = "" }: Props) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-bg-card via-bg-elevated to-bg-card bg-[length:200%_100%] rounded-lg ${className}`}
      style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
    />
  );
}

export function HomeSkeleton() {
  // Rendu directement dans le <main> de index.tsx — pas de wrapper qui duplique
  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Daily status card placeholder */}
      <Skeleton className="h-24 rounded-2xl" />
      {/* Chart */}
      <Skeleton className="h-[240px] rounded-2xl" />
      {/* Filter pills */}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 rounded-full" />
        ))}
      </div>
      {/* Analyses / Calendrier */}
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
      {/* 4 stat tiles */}
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20" />
    </div>
  );
}
