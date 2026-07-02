export type GrowthTrendData = {
  weightUp: number;
  weightDown: number;
  heightUp: number;
  weightUpChange: number;
  weightDownChange: number;
  heightUpChange: number;
};

type GrowthTrendSummaryProps = {
  description?: string;
  isLoading: boolean;
  periodLabel?: string;
  trends: GrowthTrendData | null;
};

export function GrowthTrendSummary({
  description = "Perbandingan dua pencatatan terakhir setiap balita pada periode yang dipilih.",
  isLoading,
  periodLabel,
  trends,
}: GrowthTrendSummaryProps) {
  const cards = [
    {
      label: "Berat Badan Naik",
      value: trends?.weightUp ?? 0,
      color: "bg-primary/10 text-primary",
      direction: "up" as const,
      change: trends?.weightUpChange ?? 0,
      isHeight: false,
    },
    {
      label: "Berat Badan Turun",
      value: trends?.weightDown ?? 0,
      color: "bg-error/10 text-error",
      direction: "down" as const,
      change: trends?.weightDownChange ?? 0,
      isHeight: false,
    },
    {
      label: "Tinggi Badan Naik",
      value: trends?.heightUp ?? 0,
      color: "bg-success/15 text-[#5E8D2B]",
      direction: "up" as const,
      change: trends?.heightUpChange ?? 0,
      isHeight: true,
    },
  ];

  return (
    <section aria-labelledby="growth-trend-title" className="mt-6">
      <div className="mb-4">
        <h2 className="font-bold text-text-primary" id="growth-trend-title">
          Perubahan Pertumbuhan{periodLabel ? ` · ${periodLabel}` : ""}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {description}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm" key={card.label}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-text-primary">{card.label}</p>
              <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${card.color}`}>
                <TrendIcon direction={card.direction} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-extrabold tracking-tight text-text-primary">
              {isLoading ? "…" : card.value}
            </p>
            <p className="mt-1 text-xs font-semibold text-text-secondary">balita</p>
            {!isLoading && (
              <p className={`mt-3 text-xs font-semibold ${card.change > 0 ? "text-[#5E8D2B]" : card.change < 0 ? "text-error" : "text-text-secondary"}`}>
                {formatChange(card.change, card.isHeight)}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatChange(change: number, isHeight: boolean) {
  if (change > 0) return `${change} anak naik dari bulan sebelumnya`;
  if (change < 0) {
    return isHeight
      ? `${Math.abs(change)} anak lebih sedikit dari bulan sebelumnya`
      : `${Math.abs(change)} anak turun dari bulan sebelumnya`;
  }
  return "Tidak berubah dari bulan sebelumnya";
}

function TrendIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d={direction === "up" ? "M5 16l5-5 4 4 5-7" : "M5 8l5 5 4-4 5 7"} />
      <path d={direction === "up" ? "M15 8h4v4" : "M15 16h4v-4"} />
    </svg>
  );
}
