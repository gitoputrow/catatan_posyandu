import type { DashboardData } from "@/components/dashboard/types";
import { SearchableSelect } from "@/components/ui/form";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type MonthlyWeighingChartProps = {
  data: DashboardData["monthlyWeighings"];
  isLoading: boolean;
  onYearChange: (value: string) => void;
  year: number;
  yearOptions: Array<{ label: string; value: string }>;
  showYearFilter?: boolean;
  title?: string;
  description?: string | null;
  chartAriaLabel?: string;
};

export function MonthlyWeighingChart({
  data,
  isLoading,
  onYearChange,
  year,
  yearOptions,
  showYearFilter = true,
  title = "Jumlah Penimbangan per Bulan",
  description = "Jumlah balita unik yang melakukan pencatatan setiap bulan.",
  chartAriaLabel = "Grafik garis jumlah penimbangan bulanan",
}: MonthlyWeighingChartProps) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-text-primary">{title}</h2>
          {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
        </div>
        {showYearFilter && (
          <SearchableSelect
            ariaLabel="Pilih tahun grafik"
            className="w-full sm:w-28"
            onValueChange={onYearChange}
            options={yearOptions}
            value={year}
          />
        )}
      </div>
      <LineChart ariaLabel={chartAriaLabel} data={data} isLoading={isLoading} />
    </section>
  );
}

function LineChart({ ariaLabel, data, isLoading }: Pick<MonthlyWeighingChartProps, "data" | "isLoading"> & { ariaLabel: string }) {
  const values = Array.from(
    { length: 12 },
    (_, index) => data.find((item) => item.month === index + 1)?.count ?? 0,
  );
  const maximum = Math.max(...values, 1);
  const chartValues = isLoading ? values.map(() => Math.max(1, maximum * 0.25)) : values;
  const points = chartValues.map((value, index) => ({
    x: 45 + index * 58,
    y: 215 - (value / maximum) * 165,
  }));
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `45,215 ${linePoints} ${points.at(-1)?.x ?? 683},215`;

  return (
    <div className="overflow-x-auto px-5 py-6 sm:px-6">
      <div className="min-w-[740px]">
        <svg
          aria-label={ariaLabel}
          className="h-72 w-full"
          role="img"
          viewBox="0 0 730 270"
        >
          <defs>
            <linearGradient id="dashboardChartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#13A698" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#13A698" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M45 50H683M45 105H683M45 160H683M45 215H683"
            fill="none"
            stroke="#DDEDEA"
            strokeDasharray="4 5"
          />
          <polygon fill="url(#dashboardChartFill)" points={areaPoints} />
          <polyline
            fill="none"
            points={linePoints}
            stroke="#13A698"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          {points.map((point, index) => (
            <g key={monthNames[index]}>
              <circle cx={point.x} cy={point.y} fill="#ffffff" r="6" stroke="#13A698" strokeWidth="4" />
              <text
                fill="#12383D"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                x={point.x}
                y={point.y - 14}
              >
                {isLoading ? "…" : values[index]}
              </text>
              <text
                fill="#6B8588"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                x={point.x}
                y="244"
              >
                {monthNames[index]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
