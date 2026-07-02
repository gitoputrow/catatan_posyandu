export type GrowthTrendMeasurement = {
  balita_id: string;
  berat_badan: number | null;
  lingkar_kepala?: number | null;
  lingkar_lengan?: number | null;
  periode_bulan: string;
  tinggi_badan: number | null;
};

export type GrowthTrendCounts = ReturnType<typeof calculateGrowthTrends>;

export function getPeriodTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function withGrowthTrendChanges(
  current: GrowthTrendCounts,
  previous: GrowthTrendCounts,
) {
  return {
    ...current,
    weightUpChange: current.weightUp - previous.weightUp,
    weightDownChange: current.weightDown - previous.weightDown,
    heightUpChange: current.heightUp - previous.heightUp,
  };
}

export function calculateGrowthTrends(
  currentMeasurements: GrowthTrendMeasurement[],
  previousMeasurements: GrowthTrendMeasurement[],
) {
  const currentByChild = groupMeasurementsByChild(currentMeasurements);
  const previousByChild = groupMeasurementsByChild(previousMeasurements);
  const trends = { weightUp: 0, weightDown: 0, heightUp: 0 };

  for (const [childId, measurements] of currentByChild) {
    const previous = previousByChild.get(childId) ?? [];
    const currentWeight = findLatestMetric(measurements, "berat_badan");
    const previousWeight = findLatestMetric(previous, "berat_badan");
    const currentHeight = findLatestMetric(measurements, "tinggi_badan");
    const previousHeight = findLatestMetric(previous, "tinggi_badan");

    if (currentWeight !== null && previousWeight !== null) {
      if (currentWeight > previousWeight) trends.weightUp += 1;
      else if (currentWeight < previousWeight) trends.weightDown += 1;
    }
    if (currentHeight !== null && previousHeight !== null && currentHeight > previousHeight) {
      trends.heightUp += 1;
    }
  }
  return trends;
}

function groupMeasurementsByChild(measurements: GrowthTrendMeasurement[]) {
  const grouped = new Map<string, GrowthTrendMeasurement[]>();
  for (const measurement of measurements) {
    const values = grouped.get(measurement.balita_id) ?? [];
    values.push(measurement);
    grouped.set(measurement.balita_id, values);
  }
  return grouped;
}

function findLatestMetric(
  measurements: GrowthTrendMeasurement[],
  metric: "berat_badan" | "tinggi_badan",
) {
  for (const measurement of measurements) {
    if (measurement[metric] === null) continue;
    const value = Number(measurement[metric]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}
