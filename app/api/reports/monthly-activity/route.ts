import { NextResponse } from "next/server";

import { badRequest, forbidden, withApiErrorHandling } from "@/app/api/_shared/response";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import {
  createMonthlyActivityReport,
  getMonthlyActivityReport,
  MonthlyActivityReportExistsError,
  saveMonthlyActivityReport,
  type MonthlyActivityInput,
} from "@/lib/reports/monthly-activity/server";

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const requestedMonth = Number(searchParams.get("month") ?? now.getMonth() + 1);
    const requestedYear = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1;
    const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : now.getFullYear();

    return NextResponse.json(await getMonthlyActivityReport(month, year));
  });
}

export async function PUT(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload laporan kegiatan tidak valid.");
    }
    if (!isMonthlyActivityInput(payload)) return badRequest("Data laporan kegiatan belum lengkap atau tidak valid.");

    const { data, error, mode } = await saveMonthlyActivityReport(payload);
    if (error) throw error;
    return NextResponse.json({ ...data, mode });
  });
}

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload laporan kegiatan tidak valid.");
    }
    if (!isMonthlyActivityInput(payload)) return badRequest("Data laporan kegiatan belum lengkap atau tidak valid.");

    try {
      const { data, error } = await createMonthlyActivityReport(payload);
      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    } catch (error) {
      if (error instanceof MonthlyActivityReportExistsError) return badRequest(error.message);
      throw error;
    }
  });
}

function isMonthlyActivityInput(value: unknown): value is MonthlyActivityInput {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<MonthlyActivityInput>;
  const numericFields: Array<keyof MonthlyActivityInput> = [
    "total_kb_kondom", "total_kb_pil", "total_kb_implant", "total_kb_mop", "total_kb_mow", "total_kb_iud", "total_kb_suntik", "total_kb_lainnya",
    "total_bcg_l", "total_bcg_p",
    "total_dpt_1_l", "total_dpt_1_p", "total_dpt_2_l", "total_dpt_2_p", "total_dpt_3_l", "total_dpt_3_p",
    "total_polio_1_l", "total_polio_1_p", "total_polio_2_l", "total_polio_2_p", "total_polio_3_l", "total_polio_3_p", "total_polio_4_l", "total_polio_4_p",
    "total_hepatitis_b_1_l", "total_hepatitis_b_1_p", "total_hepatitis_b_2_l", "total_hepatitis_b_2_p", "total_hepatitis_b_3_l", "total_hepatitis_b_3_p",
    "total_campak_l", "total_campak_p",
    "total_balita_diare_l", "total_balita_diare_p", "total_oralit_l", "total_oralit_p",
  ];
  const booleanFields: Array<keyof MonthlyActivityInput> = [
    "fe_tab_tablet_besi", "balita_kmsk", "dapat_vit_a", "dapat_pmt", "imunisasi_tt_1", "imunisasi_tt_2", "periksa_bumil",
  ];

  return typeof report.periode === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(report.periode) &&
    numericFields.every((field) => isNullableNonNegativeInteger(report[field])) &&
    booleanFields.every((field) => typeof report[field] === "boolean" || report[field] === null) &&
    (typeof report.keterangan === "string" || report.keterangan === null);
}

function isNullableNonNegativeInteger(value: unknown) {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}
