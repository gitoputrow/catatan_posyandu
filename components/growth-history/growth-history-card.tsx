import type { GrowthHistoryMeasurement } from "@/components/growth-history/types";
import { historyMonthNames } from "@/lib/growth-history/export";

export function GrowthHistoryCard({ measurement, month }: { measurement?: GrowthHistoryMeasurement; month: number }) {
  return <article className="rounded-xl border border-border p-4">
    <h3 className="font-extrabold text-text-primary">{historyMonthNames[month - 1]}</h3>
    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
      <Metric label="Berat badan" unit="kg" value={measurement?.berat_badan} />
      <Metric label="Tinggi badan" unit="cm" value={measurement?.tinggi_badan} />
      <Metric label="Lingkar lengan" unit="cm" value={measurement?.lingkar_lengan} />
      <Metric label="Lingkar kepala" unit="cm" value={measurement?.lingkar_kepala} />
    </div>
  </article>;
}

function Metric({ label, unit, value }: { label: string; unit: string; value?: number | null }) {
  return <div><p className="font-bold text-text-secondary">{label}</p><p className="mt-1 font-extrabold text-text-primary">{value == null ? "-" : `${value} ${unit}`}</p></div>;
}
