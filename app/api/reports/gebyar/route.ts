import { NextResponse } from "next/server";

import { badRequest, forbidden, withApiErrorHandling } from "@/app/api/_shared/response";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { getGebyarReport, saveGebyarReport, type GebyarReportInput } from "@/lib/reports/gebyar/server";

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

    return NextResponse.json(await getGebyarReport(month, year));
  });
}

export async function PUT(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload laporan Gebyar tidak valid.");
    }
    if (!isGebyarReportInput(payload)) return badRequest("Data laporan Gebyar belum lengkap atau tidak valid.");

    const { data, error, mode } = await saveGebyarReport(payload);
    if (error) throw error;
    return NextResponse.json({ ...data, mode });
  });
}

function isGebyarReportInput(value: unknown): value is GebyarReportInput {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<GebyarReportInput>;
  const numericFields: Array<keyof GebyarReportInput> = [
    "program_tambahan_total_ppks", "program_tambahan_total_bkb", "program_tambahan_total_paud",
    "program_tambahan_total_gsi", "program_tambahan_total_psn", "program_tambahan_total_lainnya",
    "mitra_total_perusahaan", "mitra_total_bumn_bumd", "mitra_total_kantor_dinas", "mitra_total_lsm_lsom",
    "dana_sehat_total_keluarga_sasaran", "dana_sehat_total_sumbangan",
  ];
  return typeof report.periode === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(report.periode) &&
    (typeof report.pemberian_tambahan_makanan === "boolean" || report.pemberian_tambahan_makanan === null) &&
    numericFields.every((field) => report[field] === null || (typeof report[field] === "number" && Number.isInteger(report[field]) && report[field] >= 0));
}
