import "server-only";

import type {
  MonthlyAttendanceReport,
  MonthlyAttendanceRow,
  MonthlyPosyanduInformation,
  SavedMonthlyAttendanceReport,
} from "@/components/reports/monthly-attendance/types";
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
  total_balita_meninggal: number | null;
  total_balita_lahir: number | null;
  id_petugas: string[] | null;
};

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
  total_balita_meninggal: number;
  total_balita_lahir: number;
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
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const { data, error } = await supabase
    .from("petugas")
    .select("id, nama, jenis_kelamin")
    .eq("posyandu_id", posyanduId)
    .order("nama", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReportOfficer[];
}

export async function createMonthlyAttendanceReport(input: MonthlyAttendanceInput) {
  const { supabase, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const uniqueOfficerIds = [...new Set(input.id_petugas)];

  if (uniqueOfficerIds.length > 0) {
    const { data: officers, error: officerError } = await supabase
      .from("petugas")
      .select("id")
      .eq("posyandu_id", posyanduId)
      .in("id", uniqueOfficerIds);
    if (officerError) throw officerError;
    if ((officers ?? []).length !== uniqueOfficerIds.length) {
      throw new Error("Terdapat petugas yang tidak terdaftar di Posyandu Anda.");
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from("laporan_kehadiran_posyandu")
    .select("id")
    .eq("posyandu_id", posyanduId)
    .eq("periode", period)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new MonthlyAttendanceReportExistsError();

  return supabase
    .from("laporan_kehadiran_posyandu")
    .insert({ ...input, periode: period, id_petugas: uniqueOfficerIds, posyandu_id: posyanduId })
    .select("id, periode")
    .single();
}

export async function saveMonthlyAttendanceReport(input: MonthlyAttendanceInput) {
  const { supabase, posyanduId } = await getAuthenticatedPetugasForWrite();
  const period = normalizePeriod(input.periode);
  const uniqueOfficerIds = [...new Set(input.id_petugas)];
  await validateReportOfficers(supabase, posyanduId, uniqueOfficerIds);

  const { data: existing, error: existingError } = await supabase
    .from("laporan_kehadiran_posyandu")
    .select("id")
    .eq("posyandu_id", posyanduId)
    .eq("periode", period)
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = { ...input, periode: period, id_petugas: uniqueOfficerIds };
  if (existing) {
    const result = await supabase
      .from("laporan_kehadiran_posyandu")
      .update(payload)
      .eq("id", existing.id)
      .eq("posyandu_id", posyanduId)
      .select("id, periode")
      .single();
    return { ...result, mode: "updated" as const };
  }

  const result = await supabase
    .from("laporan_kehadiran_posyandu")
    .insert({ ...payload, posyandu_id: posyanduId })
    .select("id, periode")
    .single();
  return { ...result, mode: "created" as const };
}

export async function getMonthlyAttendanceReport(
  month: number,
  year: number,
): Promise<MonthlyAttendanceReport> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const referenceDate = new Date(Date.UTC(year, month, 0));
  const { supabase, posyanduId } = await getAuthenticatedPetugas();

  const informationPromise = getMonthlyPosyanduInformation(
    supabase,
    posyanduId,
    monthStart,
    monthEnd,
  );

  const { data: measurements, error: measurementError } = await supabase
    .from("tumbuh_kembang_balita")
    .select("balita_id")
    .eq("posyandu_id", posyanduId)
    .gte("periode_bulan", monthStart.toISOString())
    .lt("periode_bulan", monthEnd.toISOString())
    .not("berat_badan", "is", null);

  if (measurementError) throw measurementError;

  const childIds = [...new Set((measurements ?? []).map((record) => record.balita_id))];
  let children: AttendingChild[] = [];
  if (childIds.length > 0) {
    const { data, error: childrenError } = await supabase
      .from("balita")
      .select("id, jenis_kelamin, tanggal_lahir, registered_at")
      .eq("posyandu_id", posyanduId)
      .in("id", childIds);
    if (childrenError) throw childrenError;
    children = (data ?? []) as AttendingChild[];
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
  supabase: Awaited<ReturnType<typeof getAuthenticatedPetugas>>["supabase"],
  posyanduId: string,
  monthStart: Date,
  monthEnd: Date,
): Promise<{ information: MonthlyPosyanduInformation; savedReport: SavedMonthlyAttendanceReport | null }> {
  const { data, error } = await supabase
    .from("laporan_kehadiran_posyandu")
    .select("id, periode, total_pus, total_wus, total_ibu_hamil, total_ibu_menyusui, total_pria_plkb, total_wanita_plkb, total_pria_medis, total_wanita_medis, total_balita_meninggal, total_balita_lahir, id_petugas")
    .eq("posyandu_id", posyanduId)
    .gte("periode", formatDateOnly(monthStart))
    .lt("periode", formatDateOnly(monthEnd))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { information: emptyInformation(), savedReport: null };

  const report = data as AttendanceInformationRow;
  const reportOfficerIds = report.id_petugas ?? [];
  let selectedOfficers: Array<{ id: string; jenis_kelamin: string | null }> = [];
  if (reportOfficerIds.length > 0) {
    const { data: officers, error: officerError } = await supabase
      .from("petugas")
      .select("id, jenis_kelamin")
      .eq("posyandu_id", posyanduId)
      .in("id", reportOfficerIds);
    if (officerError) throw officerError;
    selectedOfficers = officers ?? [];
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
    total_balita_meninggal: report.total_balita_meninggal ?? 0,
    total_balita_lahir: report.total_balita_lahir ?? 0,
    id_petugas: reportOfficerIds,
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
      totalChildrenBorn: savedReport.total_balita_lahir,
      totalChildrenDied: savedReport.total_balita_meninggal,
    },
  };
}

async function validateReportOfficers(
  supabase: Awaited<ReturnType<typeof getAuthenticatedPetugas>>["supabase"],
  posyanduId: string,
  officerIds: string[],
) {
  if (officerIds.length === 0) return;
  const { data, error } = await supabase
    .from("petugas")
    .select("id")
    .eq("posyandu_id", posyanduId)
    .in("id", officerIds);
  if (error) throw error;
  if ((data ?? []).length !== officerIds.length) {
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
    totalChildrenBorn: 0,
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
