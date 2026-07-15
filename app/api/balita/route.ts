import { createChild, listChildren, type ChildInput } from "@/lib/children/server";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { badRequest, forbidden, withApiErrorHandling } from "@/app/api/_shared/response";
import { NextResponse } from "next/server";

const defaultLimit = 10;
const maxLimit = 100;

function isChildInput(value: unknown): value is ChildInput {
  if (!value || typeof value !== "object") return false;

  const child = value as Partial<ChildInput>;
  if ("id" in child || "created_by" in child || "created_by_name" in child || "created_at" in child || "registered_at" in child || "updated_at" in child) return false;
  return (
    typeof child.nik_anak === "string" &&
    child.nik_anak.trim().length > 0
  );
}

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const pageValue = Number(searchParams.get("page") ?? "1");
    const limitValue = Number(searchParams.get("limit") ?? String(defaultLimit));
    const search = searchParams.get("q") ?? undefined;
    const now = new Date();
    const requestedMonth = Number(searchParams.get("month") ?? String(now.getMonth() + 1));
    const requestedYear = Number(searchParams.get("year") ?? String(now.getFullYear()));
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, maxLimit) : defaultLimit;
    const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1;
    const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : now.getFullYear();
    const { data, error, count } = await listChildren(page, limit, search, month, year);
    if (error) throw error;

    const total = count ?? 0;
    return NextResponse.json({
      data,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      month,
      year,
    });
  });
}

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload balita tidak valid.");
    }

    if (!isChildInput(payload)) {
      return badRequest("NIK balita wajib diisi.");
    }

    const { data, error } = await createChild(payload);
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  });
}
