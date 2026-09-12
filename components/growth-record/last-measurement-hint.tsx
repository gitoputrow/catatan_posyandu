import type { LastGrowthMeasurement } from "@/components/growth-record/types";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function LastMeasurementHint({
  label,
  measurement,
  unit,
}: {
  label: string;
  measurement: LastGrowthMeasurement | null;
  unit: string;
}) {
  if (!measurement) return null;

  return (
    <p className="mt-1.5 text-xs font-normal text-text-secondary">
      {label}: {formatMetricValue(measurement.value)} {unit} · {formatPeriod(measurement.periode_bulan)}
    </p>
  );
}

function formatMetricValue(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

function formatPeriod(value: string) {
  const match = value.match(/^(\d{4})-(\d{1,2})/);
  if (!match) return value;

  const month = Number(match[2]);
  return `${monthNames[month - 1] ?? match[2]} ${match[1]}`;
}
