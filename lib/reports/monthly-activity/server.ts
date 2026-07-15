import "server-only";

import type {
  MonthlyActivityGenderCount,
  MonthlyActivityOverview,
  MonthlyActivityReport,
} from "@/components/reports/monthly-activity/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { getAuthenticatedPetugas, getAuthenticatedPetugasForWrite } from "@/lib/user/server";

const tableName = "laporan_kegiatan_posyandu";

export type MonthlyActivityInput = Omit<
  MonthlyActivityReport,
  "id" | "posyandu_id" | "created_by" | "created_by_name" | "created_at" | "updated_at"
>;

export class MonthlyActivityReportExistsError extends Error {
  constructor() {
    super("Laporan kegiatan pada periode tersebut sudah tersedia.");
    this.name = "MonthlyActivityReportExistsError";
  }
}

type ActiveChild = {
  id: string;
  jenis_kelamin: "L" | "P" | null;
};

type WeightMeasurement = {
  balita_id: string;
  periode_bulan: string;
  berat_badan: number | string | null;
};

export async function getMonthlyActivityReport(
  month: number,
  year: number,
): Promise<MonthlyActivityOverview> {
  const period = formatPeriod(month, year);
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(Date.UTC(year, month, 1)).toISOString();
  const registrationStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const oldestDisplayedBirthDate = getOldestDisplayedBirthDate(month, year);

  const [attendanceResult, activityResult] = await Promise.all([
    supabase
      .from("laporan_kehadiran_posyandu")
      .select("total_ibu_hamil, total_ibu_menyusui")
      .eq("posyandu_id", posyanduId)
      .eq("periode", period)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from(tableName)
      .select("*")
      .eq("posyandu_id", posyanduId)
      .eq("periode", period)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (attendanceResult.error) throw attendanceResult.error;
  if (activityResult.error) throw activityResult.error;

  const activity = activityResult.data as MonthlyActivityReport | null;
  const report = activity ? await withCreatorName(activity) : null;
  const weighingSummary = await getWeighingSummary(report);

  return {
    month,
    year,
    totalPregnantWomen: attendanceResult.data?.total_ibu_hamil ?? 0,
    totalBreastfeedingMothers: attendanceResult.data?.total_ibu_menyusui ?? 0,
    weighingSummary,
    savedReport: report,
  };

  async function getWeighingSummary(reportData: MonthlyActivityReport | null) {
    const { data: activeChildrenData, error: activeChildrenError } = await supabase
      .from("balita")
      .select("id, jenis_kelamin")
      .eq("posyandu_id", posyanduId)
      .gte("registered_at", registrationStart)
      .lt("registered_at", periodEnd)
      .or(`tanggal_lahir.is.null,tanggal_lahir.gte.${oldestDisplayedBirthDate}`);
    if (activeChildrenError) throw activeChildrenError;

    const activeChildren = (activeChildrenData ?? []) as ActiveChild[];
    const activeChildrenById = new Map(activeChildren.map((child) => [child.id, child]));
    const activeChildrenCount = countChildrenByGender(activeChildren);

    const { data: currentMeasurementsData, error: currentMeasurementsError } = await supabase
      .from("tumbuh_kembang_balita")
      .select("balita_id, periode_bulan, berat_badan")
      .eq("posyandu_id", posyanduId)
      .gte("periode_bulan", periodStart)
      .lt("periode_bulan", periodEnd)
      .not("berat_badan", "is", null)
      .order("periode_bulan", { ascending: false });
    if (currentMeasurementsError) throw currentMeasurementsError;

    const currentMeasurementsByChild = new Map<string, WeightMeasurement>();
    for (const measurement of (currentMeasurementsData ?? []) as WeightMeasurement[]) {
      if (!activeChildrenById.has(measurement.balita_id)) continue;
      if (!currentMeasurementsByChild.has(measurement.balita_id)) {
        currentMeasurementsByChild.set(measurement.balita_id, measurement);
      }
    }

    const weighedChildren = [...currentMeasurementsByChild.keys()]
      .map((childId) => activeChildrenById.get(childId))
      .filter((child): child is ActiveChild => Boolean(child));
    const weighedChildrenCount = countChildrenByGender(weighedChildren);
    const currentChildIds = [...currentMeasurementsByChild.keys()];
    const previousMeasurementsByChild = new Map<string, WeightMeasurement>();

    if (currentChildIds.length > 0) {
      const historyStart = new Date(Date.UTC(year - 1, month - 1, 1)).toISOString();
      const { data: previousMeasurementsData, error: previousMeasurementsError } = await supabase
        .from("tumbuh_kembang_balita")
        .select("balita_id, periode_bulan, berat_badan")
        .eq("posyandu_id", posyanduId)
        .in("balita_id", currentChildIds)
        .gte("periode_bulan", historyStart)
        .lt("periode_bulan", periodStart)
        .not("berat_badan", "is", null)
        .order("periode_bulan", { ascending: false });
      if (previousMeasurementsError) throw previousMeasurementsError;

      for (const measurement of (previousMeasurementsData ?? []) as WeightMeasurement[]) {
        if (!previousMeasurementsByChild.has(measurement.balita_id)) {
          previousMeasurementsByChild.set(measurement.balita_id, measurement);
        }
      }
    }

    const weightUpChildren: ActiveChild[] = [];
    for (const [childId, currentMeasurement] of currentMeasurementsByChild) {
      const currentWeight = toNumber(currentMeasurement.berat_badan);
      const previousWeight = toNumber(previousMeasurementsByChild.get(childId)?.berat_badan ?? null);
      const child = activeChildrenById.get(childId);
      if (!child || currentWeight === null || previousWeight === null) continue;
      if (currentWeight > previousWeight) weightUpChildren.push(child);
    }

    return {
      activeChildren: activeChildrenCount,
      kmsK: getConditionalGenderCount(reportData?.balita_kmsk ?? null, activeChildrenCount),
      weighedChildren: weighedChildrenCount,
      weightUp: countChildrenByGender(weightUpChildren),
      vitaminA: getConditionalGenderCount(reportData?.dapat_vit_a ?? null, weighedChildrenCount),
      pmt: getConditionalGenderCount(reportData?.dapat_pmt ?? null, weighedChildrenCount),
    };
  }

  async function withCreatorName(reportData: MonthlyActivityReport) {
    if (!reportData.created_by) return reportData;

    const { data: creator, error } = await supabase
      .from("petugas")
      .select("nama")
      .eq("id", reportData.created_by)
      .eq("posyandu_id", posyanduId)
      .maybeSingle();
    if (error) throw error;

    return {
      ...reportData,
      created_by_name: creator?.nama ?? null,
    };
  }
}

export async function createMonthlyActivityReport(input: MonthlyActivityInput) {
  const { petugasId, supabase, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const payload = toActivityPayload(input);

  const { data: existing, error: existingError } = await supabase
    .from(tableName)
    .select("id")
    .eq("posyandu_id", posyanduId)
    .eq("periode", period)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new MonthlyActivityReportExistsError();

  return supabase
    .from(tableName)
    .insert({ ...payload, periode: period, posyandu_id: posyanduId, created_by: petugasId })
    .select("id, periode")
    .single();
}

export async function saveMonthlyActivityReport(input: MonthlyActivityInput) {
  const { petugasId, supabase, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const payload = toActivityPayload(input);

  const { data: existing, error: existingError } = await supabase
    .from(tableName)
    .select("id")
    .eq("posyandu_id", posyanduId)
    .eq("periode", period)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const result = await supabase
      .from(tableName)
      .update({ ...payload, periode: period, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("posyandu_id", posyanduId)
      .select("id, periode")
      .single();
    return { ...result, mode: "updated" as const };
  }

  const result = await supabase
    .from(tableName)
    .insert({ ...payload, periode: period, posyandu_id: posyanduId, created_by: petugasId })
    .select("id, periode")
    .single();
  return { ...result, mode: "created" as const };
}

function countChildrenByGender(children: ActiveChild[]): MonthlyActivityGenderCount {
  const count = createGenderCount();
  for (const child of children) {
    if (child.jenis_kelamin === "L") count.male += 1;
    if (child.jenis_kelamin === "P") count.female += 1;
  }
  count.total = count.male + count.female;
  return count;
}

function createGenderCount(): MonthlyActivityGenderCount {
  return { female: 0, male: 0, total: 0 };
}

function getConditionalGenderCount(
  isEnabled: boolean | null,
  enabledCount: MonthlyActivityGenderCount,
): MonthlyActivityGenderCount | null {
  if (isEnabled === true) return enabledCount;
  if (isEnabled === false) return createGenderCount();
  return null;
}

function toNumber(value: number | string | null) {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatPeriod(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function normalizePeriod(value: string) {
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  if (!match) throw new Error("Periode laporan kegiatan tidak valid.");
  return `${match[1]}-${match[2]}-01`;
}

function toActivityPayload(input: MonthlyActivityInput) {
  return {
    total_kb_kondom: input.total_kb_kondom,
    total_kb_pil: input.total_kb_pil,
    total_kb_implant: input.total_kb_implant,
    total_kb_mop: input.total_kb_mop,
    total_kb_mow: input.total_kb_mow,
    total_kb_iud: input.total_kb_iud,
    total_kb_suntik: input.total_kb_suntik,
    total_kb_lainnya: input.total_kb_lainnya,
    fe_tab_tablet_besi: input.fe_tab_tablet_besi,
    balita_kmsk: input.balita_kmsk,
    dapat_vit_a: input.dapat_vit_a,
    dapat_pmt: input.dapat_pmt,
    imunisasi_tt_1: input.imunisasi_tt_1,
    imunisasi_tt_2: input.imunisasi_tt_2,
    periksa_bumil: input.periksa_bumil,
    total_bcg_l: input.total_bcg_l,
    total_bcg_p: input.total_bcg_p,
    total_dpt_1_l: input.total_dpt_1_l,
    total_dpt_1_p: input.total_dpt_1_p,
    total_dpt_2_l: input.total_dpt_2_l,
    total_dpt_2_p: input.total_dpt_2_p,
    total_dpt_3_l: input.total_dpt_3_l,
    total_dpt_3_p: input.total_dpt_3_p,
    total_polio_1_l: input.total_polio_1_l,
    total_polio_1_p: input.total_polio_1_p,
    total_polio_2_l: input.total_polio_2_l,
    total_polio_2_p: input.total_polio_2_p,
    total_polio_3_l: input.total_polio_3_l,
    total_polio_3_p: input.total_polio_3_p,
    total_polio_4_l: input.total_polio_4_l,
    total_polio_4_p: input.total_polio_4_p,
    total_hepatitis_b_1_l: input.total_hepatitis_b_1_l,
    total_hepatitis_b_1_p: input.total_hepatitis_b_1_p,
    total_hepatitis_b_2_l: input.total_hepatitis_b_2_l,
    total_hepatitis_b_2_p: input.total_hepatitis_b_2_p,
    total_hepatitis_b_3_l: input.total_hepatitis_b_3_l,
    total_hepatitis_b_3_p: input.total_hepatitis_b_3_p,
    total_campak_l: input.total_campak_l,
    total_campak_p: input.total_campak_p,
    total_balita_diare_l: input.total_balita_diare_l,
    total_balita_diare_p: input.total_balita_diare_p,
    total_oralit_l: input.total_oralit_l,
    total_oralit_p: input.total_oralit_p,
    keterangan: input.keterangan,
  };
}
