import { NextResponse } from "next/server";

import { withApiErrorHandling } from "@/app/api/_shared/response";
import { getDashboardData } from "@/lib/dashboard/server";

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    const requestedYear = Number(new URL(request.url).searchParams.get("year") ?? new Date().getFullYear());
    const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : new Date().getFullYear();
    return NextResponse.json(await getDashboardData(year));
  });
}
