import { NextResponse } from "next/server";

import { withApiErrorHandling } from "@/app/api/_shared/response";
import { getChildActivitySummary } from "@/lib/children/activity-summary/server";

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const requestedMonth = Number(searchParams.get("month") ?? now.getMonth() + 1);
    const requestedYear = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : now.getMonth() + 1;
    const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : now.getFullYear();
    return NextResponse.json(await getChildActivitySummary(month, year));
  });
}
