import "server-only";

import type {
  MonthlyResultsGroupedCount,
  MonthlyResultsOverview,
  MonthlyResultsReport,
} from "@/components/reports/monthly-results/types";
import { databaseResult, insertRow, pgUuidArray, queryOne, queryRows, updateRow } from "@/lib/neon/query";
import { getAuthenticatedPetugas, getAuthenticatedPetugasForWrite } from "@/lib/user/server";

const tableName = "laporan_hasil_kegiatan_bulanan";

export type MonthlyResultsInput = import("@/components/reports/monthly-results/types").MonthlyResultsReportInput;

type PosyanduAddressRow = {
  nama_posyandu: string | null;
  rt: string | null;
  rw: string | null;
  nama_kelurahan: string | null;
  nama_kecamatan: string | null;
  nama_kota: string | null;
};

type AttendanceRow = {
  id_petugas: string[] | null;
  total_ibu_hamil: number | null;
};

type MonthlyActivityRow = {
  balita_kmsk: boolean | null;
  dapat_vit_a: boolean | null;
  fe_tab_tablet_besi: boolean | null;
};

type WeighingChild = {
  id: string;
  jenis_kelamin: "L" | "P" | null;
  tanggal_lahir: string | null;
};

type WeightMeasurement = {
  balita_id: string;
  berat_badan: number | string | null;
  periode_bulan: string;
};

export async function getMonthlyResultsReport(
  month: number,
  year: number,
): Promise<MonthlyResultsOverview> {
  const { posyanduId } = await getAuthenticatedPetugas();
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(Date.UTC(year, month, 1)).toISOString();
  const [posyandu, cadres, attendance, activity, savedReport] = await Promise.all([
    queryOne<PosyanduAddressRow>("select nama_posyandu, rt, rw, nama_kelurahan, nama_kecamatan, nama_kota from posyandu where id = $1", [posyanduId]),
    queryRows<{ id: string; nama: string | null }>("select id, nama from petugas where posyandu_id = $1 and lower(jenis_petugas) = 'kader' and is_active = true", [posyanduId]),
    queryOne<AttendanceRow>(`select id_petugas, total_ibu_hamil from laporan_kehadiran_posyandu
      where posyandu_id = $1 and periode >= $2::date and periode < $3::date order by created_at desc nulls last limit 1`, [posyanduId, periodStart, periodEnd]),
    queryOne<MonthlyActivityRow>(`select balita_kmsk, dapat_vit_a, fe_tab_tablet_besi from laporan_kegiatan_posyandu
      where posyandu_id = $1 and periode >= $2::date and periode < $3::date order by created_at desc limit 1`, [posyanduId, periodStart, periodEnd]),
    queryOne<MonthlyResultsReport>(`select * from laporan_hasil_kegiatan_bulanan
      where posyandu_id = $1 and periode >= $2::timestamptz and periode < $3::timestamptz order by created_at desc limit 1`, [posyanduId, periodStart, periodEnd]),
  ]);

  if (!posyandu) throw new Error("Data Posyandu tidak ditemukan.");
  const cadreIds = new Set(cadres.map((cadre) => cadre.id));
  const totalPregnantWomen = attendance?.total_ibu_hamil ?? 0;
  const weighingActivities = await getWeighingActivities(
    posyanduId,
    month,
    year,
    activity?.balita_kmsk ?? null,
  );
  const presentCadres = new Set(
    (attendance?.id_petugas ?? []).filter((officerId) => cadreIds.has(officerId)),
  ).size;
  return {
    address: {
      cityName: posyandu.nama_kota,
      districtName: posyandu.nama_kecamatan,
      posyanduName: posyandu.nama_posyandu ?? "-",
      rt: posyandu.rt,
      rw: posyandu.rw,
      villageName: posyandu.nama_kelurahan,
    },
    cadres: {
      list: cadres.map((cadre) => ({ id: cadre.id, name: cadre.nama ?? "-" })),
      present: presentCadres,
      total: cadreIds.size,
    },
    month,
    pregnantAndPostpartum: {
      postpartumMothersReceivedRedVitaminA: conditionalTotal(
        savedReport?.dapat_vit_a_merah ?? null,
        savedReport?.total_ibu_nifas ?? null,
      ),
      pregnantWomenAtRiskOfKek: savedReport?.total_ibu_hamil_resiko_kek ?? null,
      pregnantWomenReceivedIron: conditionalTotal(
        activity?.fe_tab_tablet_besi ?? null,
        totalPregnantWomen,
      ),
      totalPostpartumMothers: savedReport?.total_ibu_nifas ?? null,
      totalPregnantWomen,
    },
    savedReport,
    exclusiveBreastfeeding: {
      breastMilkOnlyInProcess: nullableGenderCount(
        savedReport?.total_balita_diberi_asi_proses_l ?? null,
        savedReport?.total_balita_diberi_asi_proses_p ?? null,
      ),
      receivedOtherFoodOrDrink: nullableGenderCount(
        savedReport?.total_balita_diberi_makan_minum_l ?? null,
        savedReport?.total_balita_diberi_makan_minum_p ?? null,
      ),
      weighedWithoutBreastfeedingRegistration: nullableGenderCount(
        savedReport?.total_balita_timbang_tidak_terdaftar_asi_l ?? null,
        savedReport?.total_balita_timbang_tidak_terdaftar_asi_p ?? null,
      ),
      reachedSixMonthsThisMonth: weighingActivities.reachedSixMonthsThisMonth,
      completedExclusiveBreastfeeding: nullableGenderCount(
        savedReport?.total_balita_asi_dapat_eksklusif_l ?? null,
        savedReport?.total_balita_asi_dapat_eksklusif_p ?? null,
      ),
    },
    vitaminA: {
      blueCapsuleAge6To11Months: conditionalGenderCount(
        activity?.dapat_vit_a ?? null,
        weighingActivities.weighedChildren.age6To11Months,
      ),
      redCapsuleAge12To59Months: conditionalGenderCount(
        activity?.dapat_vit_a ?? null,
        {
          female: weighingActivities.weighedChildren.age12To23Months.female +
            weighingActivities.weighedChildren.age24To59Months.female,
          male: weighingActivities.weighedChildren.age12To23Months.male +
            weighingActivities.weighedChildren.age24To59Months.male,
          total: weighingActivities.weighedChildren.age12To23Months.total +
            weighingActivities.weighedChildren.age24To59Months.total,
        },
      ),
    },
    weighingActivities,
    year,
  };
}

export async function saveMonthlyResultsReport(input: MonthlyResultsInput) {
  const { petugasId, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const periodStart = new Date(`${period}T00:00:00.000Z`).toISOString();
  const periodDate = new Date(periodStart);
  const periodEnd = new Date(Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth() + 1, 1)).toISOString();
  const payload = toMonthlyResultsPayload(input);
  const existing = await queryOne<{ id: string }>(`select id from laporan_hasil_kegiatan_bulanan
    where posyandu_id = $1 and periode >= $2::timestamptz and periode < $3::timestamptz limit 1`,
    [posyanduId, periodStart, periodEnd]);

  if (existing) {
    const updatePayload = { ...payload, periode: period, updated_at: new Date().toISOString() };
    const data = await updateRow<{ id: string; periode: string }>(tableName, updatePayload, Object.keys(updatePayload), { id: existing.id, posyandu_id: posyanduId });
    return { ...databaseResult(data), mode: "updated" as const };
  }

  const insertPayload = { ...payload, periode: period, posyandu_id: posyanduId, created_by: petugasId };
  const data = await insertRow<{ id: string; periode: string }>(tableName, insertPayload, Object.keys(insertPayload));
  return { ...databaseResult(data), mode: "created" as const };
}

function normalizePeriod(value: string) {
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  if (!match) throw new Error("Periode kegiatan penimbangan tidak valid.");
  return `${match[1]}-${match[2]}-01`;
}

function toMonthlyResultsPayload(input: MonthlyResultsInput) {
  return {
    total_ibu_nifas: input.total_ibu_nifas,
    dapat_vit_a_merah: input.dapat_vit_a_merah,
    total_balita_diberi_asi_proses_l: input.total_balita_diberi_asi_proses_l,
    total_balita_diberi_asi_proses_p: input.total_balita_diberi_asi_proses_p,
    total_balita_diberi_makan_minum_l: input.total_balita_diberi_makan_minum_l,
    total_balita_diberi_makan_minum_p: input.total_balita_diberi_makan_minum_p,
    total_balita_timbang_tidak_terdaftar_asi_l: input.total_balita_timbang_tidak_terdaftar_asi_l,
    total_balita_timbang_tidak_terdaftar_asi_p: input.total_balita_timbang_tidak_terdaftar_asi_p,
    total_balita_asi_dapat_eksklusif_l: input.total_balita_asi_dapat_eksklusif_l,
    total_balita_asi_dapat_eksklusif_p: input.total_balita_asi_dapat_eksklusif_p,
    total_ibu_hamil_resiko_kek: input.total_ibu_hamil_resiko_kek,
    keterangan: input.keterangan,
  };
}

function conditionalTotal(status: boolean | null, total: number | null) {
  if (status === null || total === null) return null;
  return status ? total : 0;
}

function conditionalGenderCount(
  status: boolean | null,
  count: { female: number; male: number; total: number },
) {
  if (status === null) return { female: null, male: null, total: null };
  return status ? count : { female: 0, male: 0, total: 0 };
}

function nullableGenderCount(male: number | null, female: number | null) {
  return {
    female,
    male,
    total: male === null && female === null ? null : (male ?? 0) + (female ?? 0),
  };
}

async function getWeighingActivities(
  posyanduId: string,
  month: number,
  year: number,
  hasKms: boolean | null,
) {
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));
  const previousMonthStart = new Date(Date.UTC(year, month - 2, 1));
  const referenceDate = new Date(Date.UTC(year, month, 0));
  const oldestBirthDate = new Date(Date.UTC(year, month - 1 - 60, 1)).toISOString().slice(0, 10);
  const childData = await queryRows<WeighingChild>(`select id, jenis_kelamin, tanggal_lahir from balita
    where posyandu_id = $1 and registered_at < $2::timestamptz and tanggal_lahir >= $3::date`,
    [posyanduId, periodEnd.toISOString(), oldestBirthDate]);
  const children = childData.filter((child) => {
    const age = getAgeInMonths(child.tanggal_lahir, referenceDate);
    return age !== null && age >= 0 && age <= 59 && (child.jenis_kelamin === "L" || child.jenis_kelamin === "P");
  });
  const childrenById = new Map(children.map((child) => [child.id, child]));
  const registeredChildren = countChildren(children, referenceDate);
  const reachedSixMonthsThisMonth = countChildren(
    children.filter((child) => reachesSixMonthsInPeriod(child.tanggal_lahir, periodStart)),
    referenceDate,
  ).total;
  const empty = createEmptyGroupedCount;
  if (children.length === 0) {
    return {
      registeredChildren,
      reachedSixMonthsThisMonth,
      childrenWithKms: hasKms === true ? registeredChildren : empty(),
      weighedChildren: empty(),
      nutritionGuide: { weightUp: empty(), weightNotUp: empty(), notWeighedLastMonth: empty(), firstWeighing: empty() },
      belowRedLine: empty(),
      belowRedLineReferred: empty(),
      aboveGreenLine: empty(),
      aboveGreenLineReferred: empty(),
      weightNotUpTwice: empty(),
      weightNotUpTwiceReferred: empty(),
    };
  }

  const measurementData = await queryRows<WeightMeasurement>(`select balita_id, periode_bulan,
    berat_badan::float8 as berat_badan from tumbuh_kembang_balita where posyandu_id = $1
    and balita_id = any($2::uuid[]) and periode_bulan < $3::date and berat_badan is not null
    order by periode_bulan desc`, [posyanduId, pgUuidArray(children.map((child) => child.id)), periodEnd.toISOString()]);

  const measurementsByChild = new Map<string, WeightMeasurement[]>();
  for (const measurement of measurementData) {
    const measurements = measurementsByChild.get(measurement.balita_id) ?? [];
    measurements.push(measurement);
    measurementsByChild.set(measurement.balita_id, measurements);
  }

  const weighedChildren: WeighingChild[] = [];
  const weightUp: WeighingChild[] = [];
  const weightNotUp: WeighingChild[] = [];
  const notWeighedLastMonth: WeighingChild[] = [];
  const firstWeighing: WeighingChild[] = [];
  const weightNotUpTwice: WeighingChild[] = [];

  for (const [childId, measurements] of measurementsByChild) {
    const child = childrenById.get(childId);
    if (!child) continue;
    const current = measurements.find((measurement) => isInPeriod(measurement.periode_bulan, periodStart, periodEnd));
    if (!current) continue;
    weighedChildren.push(child);
    const history = measurements.filter((measurement) => new Date(measurement.periode_bulan) < periodStart);
    const previous = history[0];
    if (!previous) {
      firstWeighing.push(child);
      notWeighedLastMonth.push(child);
      continue;
    }

    const currentWeight = toNumber(current.berat_badan);
    const previousWeight = toNumber(previous.berat_badan);
    if (currentWeight !== null && previousWeight !== null) {
      if (currentWeight > previousWeight) weightUp.push(child);
      else weightNotUp.push(child);
    }
    if (!isInPeriod(previous.periode_bulan, previousMonthStart, periodStart)) {
      notWeighedLastMonth.push(child);
    }

    const beforePrevious = history[1];
    const beforePreviousWeight = toNumber(beforePrevious?.berat_badan ?? null);
    if (
      currentWeight !== null &&
      previousWeight !== null &&
      beforePreviousWeight !== null &&
      currentWeight <= previousWeight &&
      previousWeight <= beforePreviousWeight
    ) {
      weightNotUpTwice.push(child);
    }
  }

  return {
    registeredChildren,
    reachedSixMonthsThisMonth,
    childrenWithKms: hasKms === true ? registeredChildren : empty(),
    weighedChildren: countChildren(weighedChildren, referenceDate),
    nutritionGuide: {
      weightUp: countChildren(weightUp, referenceDate),
      weightNotUp: countChildren(weightNotUp, referenceDate),
      notWeighedLastMonth: countChildren(notWeighedLastMonth, referenceDate),
      firstWeighing: countChildren(firstWeighing, referenceDate),
    },
    belowRedLine: empty(),
    belowRedLineReferred: empty(),
    aboveGreenLine: empty(),
    aboveGreenLineReferred: empty(),
    weightNotUpTwice: countChildren(weightNotUpTwice, referenceDate),
    weightNotUpTwiceReferred: empty(),
  };
}

function countChildren(children: WeighingChild[], referenceDate: Date) {
  const result = createEmptyGroupedCount();
  for (const child of children) {
    const age = getAgeInMonths(child.tanggal_lahir, referenceDate);
    if (age === null || child.jenis_kelamin === null) continue;
    const group = age <= 5
      ? result.age0To5Months
      : age <= 11
        ? result.age6To11Months
        : age <= 23
          ? result.age12To23Months
          : age <= 59
            ? result.age24To59Months
            : null;
    if (!group) continue;
    if (child.jenis_kelamin === "L") {
      group.male += 1;
      result.total.male += 1;
    } else {
      group.female += 1;
      result.total.female += 1;
    }
    group.total += 1;
    result.total.total += 1;
  }
  return result;
}

function createEmptyGroupedCount(): MonthlyResultsGroupedCount {
  return {
    age0To5Months: { female: 0, male: 0, total: 0 },
    age6To11Months: { female: 0, male: 0, total: 0 },
    age12To23Months: { female: 0, male: 0, total: 0 },
    age24To59Months: { female: 0, male: 0, total: 0 },
    total: { female: 0, male: 0, total: 0 },
  };
}

function getAgeInMonths(value: string | null, referenceDate: Date) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  return (referenceDate.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
    referenceDate.getUTCMonth() - birthDate.getUTCMonth() -
    (referenceDate.getUTCDate() < birthDate.getUTCDate() ? 1 : 0);
}

function reachesSixMonthsInPeriod(value: string | null, periodStart: Date) {
  if (!value) return false;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return false;
  const sixMonthDate = new Date(Date.UTC(
    birthDate.getUTCFullYear(),
    birthDate.getUTCMonth() + 6,
    1,
  ));
  return sixMonthDate.getUTCFullYear() === periodStart.getUTCFullYear() &&
    sixMonthDate.getUTCMonth() === periodStart.getUTCMonth();
}

function isInPeriod(value: string, start: Date, end: Date) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date < end;
}

function toNumber(value: number | string | null) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
