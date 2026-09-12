import {
  deleteChildById,
  findChildById,
  type ChildInput,
  updateChildById,
} from "@/lib/children/server";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { badRequest, forbidden, notFound, withApiErrorHandling } from "@/app/api/_shared/response";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return withApiErrorHandling(async () => {
    const { id } = await context.params;
    const { data, error } = await findChildById(id);
    if (error) throw error;
    return NextResponse.json(data);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();

    const { id } = await context.params;
    let payload: Partial<ChildInput>;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload balita tidak valid.");
    }

    if (!payload || typeof payload !== "object" || "id" in payload || "inactive_at" in payload || "inactive_reason" in payload || "created_by" in payload || "created_by_name" in payload || "created_at" in payload || "registered_at" in payload || "updated_at" in payload) {
      return badRequest("Payload balita tidak valid.");
    }
    if ("tanggal_lahir" in payload && (typeof payload.tanggal_lahir !== "string" || payload.tanggal_lahir.trim().length === 0)) {
      return badRequest("Tanggal lahir wajib diisi.");
    }
    if ("nama_anak" in payload && !hasText(payload.nama_anak)) {
      return badRequest("Nama anak wajib diisi.");
    }
    if ("nik_anak" in payload && !hasText(payload.nik_anak)) {
      return badRequest("NIK balita wajib diisi.");
    }
    if (("kelurahan_id" in payload && !hasText(payload.kelurahan_id)) || ("nama_kelurahan" in payload && !hasText(payload.nama_kelurahan))) {
      return badRequest("Kelurahan wajib dipilih.");
    }
    if (("posyandu_id" in payload && !hasText(payload.posyandu_id)) || ("nama_posyandu" in payload && !hasText(payload.nama_posyandu))) {
      return badRequest("Posyandu wajib dipilih.");
    }

    const { data, error } = await updateChildById(id, payload);
    if (error) throw error;
    return NextResponse.json(data);
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();

    const { id } = await context.params;
    const { data, error } = await deleteChildById(id);
    if (error) throw error;
    if (!data) return notFound("Data balita tidak ditemukan.");
    return NextResponse.json({ message: "Data balita berhasil dihapus." });
  });
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
