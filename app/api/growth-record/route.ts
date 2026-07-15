import { NextResponse } from "next/server";

import { badRequest, forbidden, withApiErrorHandling } from "@/app/api/_shared/response";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { createGrowthRecord, listGrowthRecords, type GrowthRecordInput } from "@/lib/growth-record/server";

const defaultLimit = 10;
const maxLimit = 100;

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const requestedPage = Number(searchParams.get("page") ?? "1");
    const requestedLimit = Number(searchParams.get("limit") ?? String(defaultLimit));
    const now = new Date();
    const requestedMonth = Number(searchParams.get("month") ?? String(now.getMonth() + 1));
    const requestedYear = Number(searchParams.get("year") ?? String(now.getFullYear()));
    const search = searchParams.get("q")?.trim() || undefined;
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, maxLimit)
      : defaultLimit;
    const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1;
    const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : now.getFullYear();
    const { data, error, count, recordedCount, growthTrends } = await listGrowthRecords(page, limit, month, year, search);
    if (error) throw error;

    const total = count ?? 0;
    return NextResponse.json({
      data,
      page,
      limit,
      total,
      recordedCount,
      growthTrends,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      month,
      year,
    });
  });
}

function isGrowthRecordInput(value: unknown): value is GrowthRecordInput {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<GrowthRecordInput>;
  if ("id" in record || "created_by" in record || "created_at" in record || "updated_at" in record) return false;
  const validMetric = (metric: unknown) => metric === null || (typeof metric === "number" && Number.isFinite(metric));

  return (
    typeof record.balita_id === "string" &&
    record.balita_id.length > 0 &&
    typeof record.periode_bulan === "string" &&
    record.periode_bulan.length > 0 &&
    validMetric(record.berat_badan) &&
    validMetric(record.tinggi_badan) &&
    validMetric(record.lingkar_kepala) &&
    validMetric(record.lingkar_lengan) &&
    (record.tanggal_pengukuran === null || typeof record.tanggal_pengukuran === "string") &&
    (record.catatan === null || typeof record.catatan === "string")
  );
}

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload catatan pertumbuhan tidak valid.");
    }

    if (!isGrowthRecordInput(payload)) {
      return badRequest("Balita, periode, dan nilai pengukuran tidak valid.");
    }

    const { data, error } = await createGrowthRecord(payload);
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  });
}
