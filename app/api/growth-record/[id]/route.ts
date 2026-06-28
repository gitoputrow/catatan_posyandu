import { NextResponse } from "next/server";

import { badRequest, forbidden, notFound, withApiErrorHandling } from "@/app/api/_shared/response";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import {
  deleteGrowthRecordById,
  findGrowthRecordById,
  updateGrowthRecordById,
  type GrowthRecordUpdateInput,
} from "@/lib/growth-record/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return withApiErrorHandling(async () => {
    const { id } = await context.params;
    const { data, error } = await findGrowthRecordById(id);
    if (error) throw error;
    if (!data) return NextResponse.json({ message: "Data pertumbuhan tidak ditemukan." }, { status: 404 });
    return NextResponse.json(data);
  });
}

function isGrowthRecordUpdateInput(value: unknown): value is GrowthRecordUpdateInput {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<GrowthRecordUpdateInput> & Record<string, unknown>;
  const forbiddenFields = ["id", "balita_id", "posyandu_id", "periode_bulan", "created_at", "updated_at"];
  const validMetric = (metric: unknown) => metric === undefined || metric === null || (typeof metric === "number" && Number.isFinite(metric));

  return (
    forbiddenFields.every((field) => !(field in record)) &&
    validMetric(record.berat_badan) &&
    validMetric(record.tinggi_badan) &&
    validMetric(record.lingkar_kepala) &&
    validMetric(record.lingkar_lengan) &&
    (record.tanggal_pengukuran === undefined || record.tanggal_pengukuran === null || typeof record.tanggal_pengukuran === "string") &&
    (record.catatan === undefined || record.catatan === null || typeof record.catatan === "string")
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();

    const { id } = await context.params;
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload catatan pertumbuhan tidak valid.");
    }

    if (!isGrowthRecordUpdateInput(payload)) {
      return badRequest("Nilai pengukuran tidak valid.");
    }

    const { data, error } = await updateGrowthRecordById(id, payload);
    if (error) throw error;
    return NextResponse.json(data);
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();

    const { id } = await context.params;
    const { data, error } = await deleteGrowthRecordById(id);
    if (error) throw error;
    if (!data) return notFound("Data pertumbuhan tidak ditemukan.");
    return NextResponse.json({ message: "Catatan pertumbuhan berhasil dihapus." });
  });
}
