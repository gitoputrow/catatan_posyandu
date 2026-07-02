const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function MetricChange({ change, unit }: { change?: number | null; unit: string }) {
  if (change === null || change === undefined) return null;
  const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "→";
  const label = change > 0 ? "Naik" : change < 0 ? "Turun" : "Tetap";
  const color = change > 0 ? "text-[#5E8D2B]" : change < 0 ? "text-error" : "text-text-secondary";
  return (
    <p aria-label={`${label} ${Math.abs(change)} ${unit}`} className={`mt-1 text-[10px] font-bold ${color}`}>
      <span aria-hidden="true">{arrow} {numberFormatter.format(Math.abs(change))} {unit}</span>
    </p>
  );
}
