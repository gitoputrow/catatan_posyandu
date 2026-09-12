import { badRequest, forbidden, withApiErrorHandling } from "@/app/api/_shared/response";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { deactivateChildById, reactivateChildById } from "@/lib/children/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();

    const { id } = await context.params;
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload status balita tidak valid.");
    }

    if (!payload || typeof payload !== "object") {
      return badRequest("Payload status balita tidak valid.");
    }

    const status = payload as {
      active?: unknown;
      inactive_at?: unknown;
      inactive_reason?: unknown;
    };

    if (status.active === true) {
      const { data, error } = await reactivateChildById(id);
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (status.active !== false) {
      return badRequest("Status aktif balita tidak valid.");
    }
    if (typeof status.inactive_at !== "string" || !isDateOnly(status.inactive_at)) {
      return badRequest("Tanggal mulai nonaktif wajib diisi dengan format yang valid.");
    }
    if (status.inactive_at > getTodayInJakarta()) {
      return badRequest("Tanggal mulai nonaktif tidak boleh melebihi hari ini.");
    }
    if (typeof status.inactive_reason !== "string" || !status.inactive_reason.trim()) {
      return badRequest("Alasan menonaktifkan balita wajib diisi.");
    }

    const { data, error } = await deactivateChildById(
      id,
      status.inactive_at,
      status.inactive_reason,
    );
    if (error) throw error;
    return NextResponse.json(data);
  });
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getTodayInJakarta() {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
