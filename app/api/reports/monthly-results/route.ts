import { NextResponse } from "next/server";

import { badRequest, forbidden, withApiErrorHandling } from "@/app/api/_shared/response";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { getMonthlyResultsReport, saveMonthlyResultsReport, type MonthlyResultsInput } from "@/lib/reports/monthly-results/server";

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

    return NextResponse.json(await getMonthlyResultsReport(month, year));
  });
}

export async function PUT(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload kegiatan penimbangan tidak valid.");
    }
    if (!isMonthlyResultsInput(payload)) return badRequest("Data kegiatan penimbangan belum lengkap atau tidak valid.");
    const { data, error, mode } = await saveMonthlyResultsReport(payload);
    if (error) throw error;
    return NextResponse.json({ ...data, mode });
  });
}

function isMonthlyResultsInput(value: unknown): value is MonthlyResultsInput {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<MonthlyResultsInput>;
  const numericFields: Array<keyof MonthlyResultsInput> = [
    "total_ibu_nifas",
    "total_balita_diberi_asi_proses_l", "total_balita_diberi_asi_proses_p",
    "total_balita_diberi_makan_minum_l", "total_balita_diberi_makan_minum_p",
    "total_balita_timbang_tidak_terdaftar_asi_l", "total_balita_timbang_tidak_terdaftar_asi_p",
    "total_balita_asi_dapat_eksklusif_l", "total_balita_asi_dapat_eksklusif_p",
    "total_ibu_hamil_resiko_kek",
  ];
  return typeof report.periode === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(report.periode) &&
    numericFields.every((field) => isNullableNonNegativeInteger(report[field])) &&
    (typeof report.dapat_vit_a_merah === "boolean" || report.dapat_vit_a_merah === null) &&
    (typeof report.keterangan === "string" || report.keterangan === null);
}

function isNullableNonNegativeInteger(value: unknown) {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}
