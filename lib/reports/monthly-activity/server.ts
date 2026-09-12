import "server-only";

import type {
  MonthlyActivityGenderCount,
  MonthlyActivityOverview,
  MonthlyActivityReport,
} from "@/components/reports/monthly-activity/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { databaseResult, insertRow, pgUuidArray, queryOne, queryRows, updateRow } from "@/lib/neon/query";
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
  const { posyanduId } = await getAuthenticatedPetugas();
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(Date.UTC(year, month, 1)).toISOString();
  const registrationStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const oldestDisplayedBirthDate = getOldestDisplayedBirthDate(month, year);

  const [attendance, activity] = await Promise.all([
    queryOne<{ total_ibu_hamil: number | null; total_ibu_menyusui: number | null }>(
      "select total_ibu_hamil, total_ibu_menyusui from laporan_kehadiran_posyandu where posyandu_id = $1 and periode = $2::date order by created_at desc nulls last limit 1",
      [posyanduId, period],
    ),
    queryOne<MonthlyActivityReport>(
      `select r.*, p.nama as created_by_name from laporan_kegiatan_posyandu r
       left join petugas p on p.id = r.created_by and p.posyandu_id = r.posyandu_id
       where r.posyandu_id = $1 and r.periode = $2::date order by r.created_at desc limit 1`,
      [posyanduId, period],
    ),
  ]);
  const report = activity;
  const weighingSummary = await getWeighingSummary(report);

  return {
    month,
    year,
    totalPregnantWomen: attendance?.total_ibu_hamil ?? 0,
    totalBreastfeedingMothers: attendance?.total_ibu_menyusui ?? 0,
    weighingSummary,
    savedReport: report,
  };

  async function getWeighingSummary(reportData: MonthlyActivityReport | null) {
    const activeChildren = await queryRows<ActiveChild>(`select id, jenis_kelamin from balita
      where posyandu_id = $1 and registered_at >= $2::timestamptz and registered_at < $3::timestamptz
      and (tanggal_lahir is null or tanggal_lahir >= $4::date)`,
      [posyanduId, registrationStart, periodEnd, oldestDisplayedBirthDate]);
    const activeChildrenById = new Map(activeChildren.map((child) => [child.id, child]));
    const activeChildrenCount = countChildrenByGender(activeChildren);

    const currentMeasurementsData = await queryRows<WeightMeasurement>(`select balita_id, periode_bulan,
      berat_badan::float8 as berat_badan from tumbuh_kembang_balita where posyandu_id = $1
      and periode_bulan >= $2::date and periode_bulan < $3::date and berat_badan is not null
      order by periode_bulan desc`, [posyanduId, periodStart, periodEnd]);

    const currentMeasurementsByChild = new Map<string, WeightMeasurement>();
    for (const measurement of currentMeasurementsData) {
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
      const previousMeasurementsData = await queryRows<WeightMeasurement>(`select balita_id, periode_bulan,
        berat_badan::float8 as berat_badan from tumbuh_kembang_balita where posyandu_id = $1
        and balita_id = any($2::uuid[]) and periode_bulan >= $3::date and periode_bulan < $4::date
        and berat_badan is not null order by periode_bulan desc`,
        [posyanduId, pgUuidArray(currentChildIds), historyStart, periodStart]);

      for (const measurement of previousMeasurementsData) {
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

}

export async function createMonthlyActivityReport(input: MonthlyActivityInput) {
  const { petugasId, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const payload = toActivityPayload(input);

  const existing = await queryOne<{ id: string }>("select id from laporan_kegiatan_posyandu where posyandu_id = $1 and periode = $2::date limit 1", [posyanduId, period]);
  if (existing) throw new MonthlyActivityReportExistsError();

  const fullPayload = { ...payload, periode: period, posyandu_id: posyanduId, created_by: petugasId };
  const data = await insertRow<{ id: string; periode: string }>(tableName, fullPayload, Object.keys(fullPayload));
  return databaseResult(data);
}

export async function saveMonthlyActivityReport(input: MonthlyActivityInput) {
  const { petugasId, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const payload = toActivityPayload(input);

  const existing = await queryOne<{ id: string }>("select id from laporan_kegiatan_posyandu where posyandu_id = $1 and periode = $2::date limit 1", [posyanduId, period]);

  if (existing) {
    const updatePayload = { ...payload, periode: period, updated_at: new Date().toISOString() };
    const data = await updateRow<{ id: string; periode: string }>(tableName, updatePayload, Object.keys(updatePayload), { id: existing.id, posyandu_id: posyanduId });
    return { ...databaseResult(data), mode: "updated" as const };
  }

  const insertPayload = { ...payload, periode: period, posyandu_id: posyanduId, created_by: petugasId };
  const data = await insertRow<{ id: string; periode: string }>(tableName, insertPayload, Object.keys(insertPayload));
  return { ...databaseResult(data), mode: "created" as const };
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
