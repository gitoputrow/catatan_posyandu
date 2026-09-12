import "server-only";

import type {
  MonthlyAttendanceReport,
  MonthlyAttendanceRow,
  MonthlyPosyanduInformation,
  SavedMonthlyAttendanceReport,
} from "@/components/reports/monthly-attendance/types";
import { databaseResult, insertRow, pgUuidArray, queryOne, queryRows, updateRow } from "@/lib/neon/query";
import { getAuthenticatedPetugas, getAuthenticatedPetugasForWrite } from "@/lib/user/server";

type AttendingChild = {
  id: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string | null;
  registered_at: string | null;
};

type AttendanceInformationRow = {
  id: string;
  periode: string;
  total_pus: number | null;
  total_wus: number | null;
  total_ibu_hamil: number | null;
  total_ibu_menyusui: number | null;
  total_pria_plkb: number | null;
  total_wanita_plkb: number | null;
  total_pria_medis: number | null;
  total_wanita_medis: number | null;
  total_balita_pria_meninggal: number | null;
  total_balita_wanita_meninggal: number | null;
  total_balita_pria_lahir: number | null;
  total_balita_wanita_lahir: number | null;
  id_petugas: string[] | null;
  created_by: string | null;
};

const attendanceColumns = [
  "periode", "total_pus", "total_wus", "total_ibu_hamil", "total_ibu_menyusui",
  "total_pria_plkb", "total_wanita_plkb", "total_pria_medis", "total_wanita_medis",
  "total_balita_pria_meninggal", "total_balita_wanita_meninggal",
  "total_balita_pria_lahir", "total_balita_wanita_lahir", "id_petugas", "posyandu_id", "created_by",
] as const;

export type MonthlyAttendanceInput = {
  periode: string;
  total_pus: number;
  total_wus: number;
  total_ibu_hamil: number;
  total_ibu_menyusui: number;
  total_pria_plkb: number;
  total_wanita_plkb: number;
  total_pria_medis: number;
  total_wanita_medis: number;
  total_balita_pria_meninggal: number;
  total_balita_wanita_meninggal: number;
  total_balita_pria_lahir: number;
  total_balita_wanita_lahir: number;
  id_petugas: string[];
};

export type ReportOfficer = {
  id: string;
  nama: string;
  jenis_kelamin: "L" | "P" | null;
};

export class MonthlyAttendanceReportExistsError extends Error {
  constructor() {
    super("Laporan pada periode tersebut sudah tersedia.");
    this.name = "MonthlyAttendanceReportExistsError";
  }
}

export async function listReportOfficers(): Promise<ReportOfficer[]> {
  const { posyanduId } = await getAuthenticatedPetugas();
  return queryRows<ReportOfficer>(
    "select id, nama, jenis_kelamin from petugas where posyandu_id = $1 and is_active = true order by nama",
    [posyanduId],
  );
}

export async function createMonthlyAttendanceReport(input: MonthlyAttendanceInput) {
  const { petugasId, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const uniqueOfficerIds = [...new Set(input.id_petugas)];
  const reportPayload = toReportPayload(input);

  await validateReportOfficers(posyanduId, uniqueOfficerIds);
  const existing = await queryOne<{ id: string }>(
    "select id from laporan_kehadiran_posyandu where posyandu_id = $1 and periode = $2::date limit 1",
    [posyanduId, period],
  );
  if (existing) throw new MonthlyAttendanceReportExistsError();
  const data = await insertRow<{ id: string; periode: string }>("laporan_kehadiran_posyandu", {
    ...reportPayload, periode: period, id_petugas: pgUuidArray(uniqueOfficerIds), posyandu_id: posyanduId, created_by: petugasId,
  }, attendanceColumns);
  return databaseResult(data);
}

export async function saveMonthlyAttendanceReport(input: MonthlyAttendanceInput) {
  const { petugasId, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const uniqueOfficerIds = [...new Set(input.id_petugas)];
  const reportPayload = toReportPayload(input);
  await validateReportOfficers(posyanduId, uniqueOfficerIds);

  const existing = await queryOne<{ id: string }>(
    "select id from laporan_kehadiran_posyandu where posyandu_id = $1 and periode = $2::date limit 1",
    [posyanduId, period],
  );

  const payload = { ...reportPayload, periode: period, id_petugas: pgUuidArray(uniqueOfficerIds) };
  if (existing) {
    const data = await updateRow<{ id: string; periode: string }>("laporan_kehadiran_posyandu", payload, attendanceColumns, { id: existing.id, posyandu_id: posyanduId });
    return { ...databaseResult(data), mode: "updated" as const };
  }

  const data = await insertRow<{ id: string; periode: string }>("laporan_kehadiran_posyandu", { ...payload, posyandu_id: posyanduId, created_by: petugasId }, attendanceColumns);
  return { ...databaseResult(data), mode: "created" as const };
}

export async function getMonthlyAttendanceReport(
  month: number,
  year: number,
): Promise<MonthlyAttendanceReport> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const referenceDate = new Date(Date.UTC(year, month, 0));
  const { posyanduId } = await getAuthenticatedPetugas();

  const informationPromise = getMonthlyPosyanduInformation(
    posyanduId,
    monthStart,
    monthEnd,
  );

  const measurements = await queryRows<{ balita_id: string }>(
    `select balita_id from tumbuh_kembang_balita where posyandu_id = $1
     and periode_bulan >= $2::date and periode_bulan < $3::date and berat_badan is not null`,
    [posyanduId, monthStart.toISOString(), monthEnd.toISOString()],
  );

  const childIds = [...new Set(measurements.map((record) => record.balita_id))];
  let children: AttendingChild[] = [];
  if (childIds.length > 0) {
    children = await queryRows<AttendingChild>(
      "select id, jenis_kelamin, tanggal_lahir, registered_at from balita where posyandu_id = $1 and id = any($2::uuid[])",
      [posyanduId, pgUuidArray(childIds)],
    );
  }

  const counters = new Map<string, { newChildren: number; existingChildren: number }>();
  let totalNew = 0;
  let totalExisting = 0;
  let unclassified = 0;

  for (const child of children) {
    const isNew = isRegisteredInPeriod(child.registered_at, monthStart, monthEnd);
    if (isNew) totalNew += 1;
    else totalExisting += 1;

    const ageInMonths = getAgeInMonths(child.tanggal_lahir, referenceDate);
    const ageGroup = ageInMonths !== null && ageInMonths <= 12
      ? "0-12-months"
      : ageInMonths !== null && ageInMonths <= 60
        ? "1-5-years"
        : null;
    if (!ageGroup) {
      unclassified += 1;
      continue;
    }

    const key = `${ageGroup}-${child.jenis_kelamin}`;
    const counter = counters.get(key) ?? { newChildren: 0, existingChildren: 0 };
    if (isNew) counter.newChildren += 1;
    else counter.existingChildren += 1;
    counters.set(key, counter);
  }

  const reportInformation = await informationPromise;
  return {
    month,
    year,
    totalAttended: children.length,
    totalNew,
    totalExisting,
    unclassified,
    rows: createRows(counters),
    information: reportInformation.information,
    savedReport: reportInformation.savedReport,
  };
}

function createRows(counters: Map<string, { newChildren: number; existingChildren: number }>): MonthlyAttendanceRow[] {
  return ([
    ["0-12-months", "0–12 bulan", "L", "Laki-laki"],
    ["0-12-months", "0–12 bulan", "P", "Perempuan"],
    ["1-5-years", "1–5 tahun", "L", "Laki-laki"],
    ["1-5-years", "1–5 tahun", "P", "Perempuan"],
  ] as const).map(([ageGroup, ageLabel, gender, genderLabel]) => {
    const count = counters.get(`${ageGroup}-${gender}`) ?? { newChildren: 0, existingChildren: 0 };
    return { ageGroup, ageLabel, gender, genderLabel, ...count, total: count.newChildren + count.existingChildren };
  });
}

async function getMonthlyPosyanduInformation(
  posyanduId: string,
  monthStart: Date,
  monthEnd: Date,
): Promise<{ information: MonthlyPosyanduInformation; savedReport: SavedMonthlyAttendanceReport | null }> {
  const data = await queryOne<AttendanceInformationRow>(`select id, periode, total_pus, total_wus,
    total_ibu_hamil, total_ibu_menyusui, total_pria_plkb, total_wanita_plkb, total_pria_medis,
    total_wanita_medis, total_balita_pria_meninggal, total_balita_wanita_meninggal,
    total_balita_pria_lahir, total_balita_wanita_lahir, id_petugas, created_by
    from laporan_kehadiran_posyandu where posyandu_id = $1 and periode >= $2::date and periode < $3::date
    order by created_at desc nulls last limit 1`, [posyanduId, formatDateOnly(monthStart), formatDateOnly(monthEnd)]);
  if (!data) return { information: emptyInformation(), savedReport: null };

  const report = data as AttendanceInformationRow;
  const reportOfficerIds = report.id_petugas ?? [];
  let selectedOfficers: Array<{ id: string; jenis_kelamin: string | null }> = [];
  if (reportOfficerIds.length > 0) {
    selectedOfficers = await queryRows<{ id: string; jenis_kelamin: string | null }>(
      "select id, jenis_kelamin from petugas where posyandu_id = $1 and id = any($2::uuid[])",
      [posyanduId, pgUuidArray(reportOfficerIds)],
    );
  }
  let creatorName: string | null = null;
  if (report.created_by) {
    const creator = await queryOne<{ nama: string }>("select nama from petugas where id = $1 and posyandu_id = $2", [report.created_by, posyanduId]);
    creatorName = creator?.nama ?? null;
  }

  const savedReport: SavedMonthlyAttendanceReport = {
    id: report.id,
    periode: report.periode,
    total_pus: report.total_pus ?? 0,
    total_wus: report.total_wus ?? 0,
    total_ibu_hamil: report.total_ibu_hamil ?? 0,
    total_ibu_menyusui: report.total_ibu_menyusui ?? 0,
    total_pria_plkb: report.total_pria_plkb ?? 0,
    total_wanita_plkb: report.total_wanita_plkb ?? 0,
    total_pria_medis: report.total_pria_medis ?? 0,
    total_wanita_medis: report.total_wanita_medis ?? 0,
    total_balita_pria_meninggal: report.total_balita_pria_meninggal ?? 0,
    total_balita_wanita_meninggal: report.total_balita_wanita_meninggal ?? 0,
    total_balita_pria_lahir: report.total_balita_pria_lahir ?? 0,
    total_balita_wanita_lahir: report.total_balita_wanita_lahir ?? 0,
    id_petugas: reportOfficerIds,
    created_by: report.created_by,
    created_by_name: creatorName,
  };

  return {
    savedReport,
    information: {
      totalPus: savedReport.total_pus,
      totalWus: savedReport.total_wus,
      totalPregnantWomen: savedReport.total_ibu_hamil,
      totalBreastfeedingMothers: savedReport.total_ibu_menyusui,
      totalMaleCadres: selectedOfficers.filter((officer) => officer.jenis_kelamin === "L").length,
      totalFemaleCadres: selectedOfficers.filter((officer) => officer.jenis_kelamin === "P").length,
      totalMalePlkb: savedReport.total_pria_plkb,
      totalFemalePlkb: savedReport.total_wanita_plkb,
      totalMaleMedicalStaff: savedReport.total_pria_medis,
      totalFemaleMedicalStaff: savedReport.total_wanita_medis,
      totalMaleChildrenBorn: savedReport.total_balita_pria_lahir,
      totalFemaleChildrenBorn: savedReport.total_balita_wanita_lahir,
      totalChildrenBorn: savedReport.total_balita_pria_lahir + savedReport.total_balita_wanita_lahir,
      totalMaleChildrenDied: savedReport.total_balita_pria_meninggal,
      totalFemaleChildrenDied: savedReport.total_balita_wanita_meninggal,
      totalChildrenDied: savedReport.total_balita_pria_meninggal + savedReport.total_balita_wanita_meninggal,
    },
  };
}

async function validateReportOfficers(
  posyanduId: string,
  officerIds: string[],
) {
  if (officerIds.length === 0) return;
  const data = await queryRows<{ id: string }>("select id from petugas where posyandu_id = $1 and id = any($2::uuid[])", [posyanduId, pgUuidArray(officerIds)]);
  if (data.length !== officerIds.length) {
    throw new Error("Terdapat petugas yang tidak terdaftar di Posyandu Anda.");
  }
}

function emptyInformation(): MonthlyPosyanduInformation {
  return {
    totalPus: 0,
    totalWus: 0,
    totalPregnantWomen: 0,
    totalBreastfeedingMothers: 0,
    totalMaleCadres: 0,
    totalFemaleCadres: 0,
    totalMalePlkb: 0,
    totalFemalePlkb: 0,
    totalMaleMedicalStaff: 0,
    totalFemaleMedicalStaff: 0,
    totalMaleChildrenBorn: 0,
    totalFemaleChildrenBorn: 0,
    totalChildrenBorn: 0,
    totalMaleChildrenDied: 0,
    totalFemaleChildrenDied: 0,
    totalChildrenDied: 0,
  };
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizePeriod(value: string) {
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  if (!match) throw new Error("Periode laporan tidak valid.");
  return `${match[1]}-${match[2]}-01`;
}

function toReportPayload(input: MonthlyAttendanceInput) {
  return {
    total_pus: input.total_pus,
    total_wus: input.total_wus,
    total_ibu_hamil: input.total_ibu_hamil,
    total_ibu_menyusui: input.total_ibu_menyusui,
    total_pria_plkb: input.total_pria_plkb,
    total_wanita_plkb: input.total_wanita_plkb,
    total_pria_medis: input.total_pria_medis,
    total_wanita_medis: input.total_wanita_medis,
    total_balita_pria_meninggal: input.total_balita_pria_meninggal,
    total_balita_wanita_meninggal: input.total_balita_wanita_meninggal,
    total_balita_pria_lahir: input.total_balita_pria_lahir,
    total_balita_wanita_lahir: input.total_balita_wanita_lahir,
  };
}

function isRegisteredInPeriod(value: string | null, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date < end;
}

function getAgeInMonths(value: string | null, referenceDate: Date) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  return Math.max(
    0,
    (referenceDate.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
      referenceDate.getUTCMonth() -
      birthDate.getUTCMonth() -
      (referenceDate.getUTCDate() < birthDate.getUTCDate() ? 1 : 0),
  );
}
