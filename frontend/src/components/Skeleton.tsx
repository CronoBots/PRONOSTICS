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
  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-6 space-y-4">
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="w-24 h-6" />
        <Skeleton className="w-9 h-9 rounded-full" />
      </div>
      <Skeleton className="h-72 rounded-3xl" />
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
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
