import type { GrowthHistoryMeasurement } from "@/components/growth-history/types";
import { MetricChange } from "@/components/ui/metric-change";
import { historyMonthNames } from "@/lib/growth-history/export";

export function GrowthHistoryCard({ armChange, headChange, heightChange, measurement, month, weightChange }: { armChange?: number | null; headChange?: number | null; heightChange?: number | null; measurement?: GrowthHistoryMeasurement; month: number; weightChange?: number | null }) {
  return <article className="rounded-xl border border-border p-4">
    <h3 className="font-extrabold text-text-primary">{historyMonthNames[month - 1]}</h3>
    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
      <Metric change={weightChange} label="Berat badan" unit="kg" value={measurement?.berat_badan} />
      <Metric change={heightChange} label="Tinggi badan" unit="cm" value={measurement?.tinggi_badan} />
      <Metric change={armChange} label="Lingkar lengan" unit="cm" value={measurement?.lingkar_lengan} />
      <Metric change={headChange} label="Lingkar kepala" unit="cm" value={measurement?.lingkar_kepala} />
    </div>
  </article>;
}

function Metric({ change, label, unit, value }: { change?: number | null; label: string; unit: string; value?: number | null }) {
  return <div><p className="font-bold text-text-secondary">{label}</p><p className="mt-1 font-extrabold text-text-primary">{value == null ? "-" : `${value} ${unit}`}</p><MetricChange change={change} unit={unit} /></div>;
}
