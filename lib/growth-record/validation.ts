export const MAX_GROWTH_METRIC_VALUE = 999.99;

type GrowthMetricValues = {
  berat_badan?: unknown;
  tinggi_badan?: unknown;
  lingkar_kepala?: unknown;
  lingkar_lengan?: unknown;
};

const metricFields = [
  ["berat_badan", "Berat badan", "kg"],
  ["tinggi_badan", "Tinggi badan", "cm"],
  ["lingkar_kepala", "Lingkar kepala", "cm"],
  ["lingkar_lengan", "Lingkar lengan", "cm"],
] as const;

export function getGrowthMetricValidationError(values: GrowthMetricValues) {
  for (const [field, label, unit] of metricFields) {
    const value = values[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return `${label} harus berupa angka yang valid.`;
    }
    if (value < 0) return `${label} tidak boleh kurang dari 0.`;
    if (value > MAX_GROWTH_METRIC_VALUE) {
      return `${label} maksimal 999,99 ${unit}.`;
    }
  }
  return null;
}

export function isValidGrowthMetric(value: unknown, allowUndefined = false) {
  if (value === undefined) return allowUndefined;
  return value === null || (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_GROWTH_METRIC_VALUE
  );
}
