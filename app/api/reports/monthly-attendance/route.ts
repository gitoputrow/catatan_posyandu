import { NextResponse } from "next/server";

import { badRequest, forbidden, withApiErrorHandling } from "@/app/api/_shared/response";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import {
  createMonthlyAttendanceReport,
  getMonthlyAttendanceReport,
  MonthlyAttendanceReportExistsError,
  saveMonthlyAttendanceReport,
  type MonthlyAttendanceInput,
} from "@/lib/reports/monthly-attendance/server";

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

    return NextResponse.json(await getMonthlyAttendanceReport(month, year));
  });
}

export async function PUT(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload laporan tidak valid.");
    }
    if (!isMonthlyAttendanceInput(payload)) return badRequest("Data laporan belum lengkap atau tidak valid.");

    const { data, error, mode } = await saveMonthlyAttendanceReport(payload);
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
      return badRequest("Payload laporan tidak valid.");
    }
    if (!isMonthlyAttendanceInput(payload)) return badRequest("Data laporan belum lengkap atau tidak valid.");

    try {
      const { data, error } = await createMonthlyAttendanceReport(payload);
      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    } catch (error) {
      if (error instanceof MonthlyAttendanceReportExistsError) return badRequest(error.message);
      throw error;
    }
  });
}

function isMonthlyAttendanceInput(value: unknown): value is MonthlyAttendanceInput {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<MonthlyAttendanceInput>;
  const numericFields: Array<keyof MonthlyAttendanceInput> = [
    "total_pus", "total_wus", "total_ibu_hamil", "total_ibu_menyusui",
    "total_pria_plkb", "total_wanita_plkb", "total_pria_medis", "total_wanita_medis",
    "total_balita_meninggal", "total_balita_lahir",
  ];
  return typeof report.periode === "string" && /^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(report.periode) &&
    Array.isArray(report.id_petugas) && report.id_petugas.length > 0 && report.id_petugas.every((id) => typeof id === "string" && id.length > 0) &&
    numericFields.every((field) => typeof report[field] === "number" && Number.isInteger(report[field]) && Number(report[field]) >= 0);
}
