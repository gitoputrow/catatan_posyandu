import { NextResponse } from "next/server";

import { withApiErrorHandling } from "@/app/api/_shared/response";
import { getGrowthHistory } from "@/lib/growth-history/server";

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
    const childId = searchParams.get("childId")?.trim() || undefined;
    const includeAllChildren = searchParams.get("all") === "true";

    return NextResponse.json(
      await getGrowthHistory(month, year, childId, includeAllChildren),
    );
  });
}
