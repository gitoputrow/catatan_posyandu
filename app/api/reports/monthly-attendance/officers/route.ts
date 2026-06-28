import { NextResponse } from "next/server";

import { withApiErrorHandling } from "@/app/api/_shared/response";
import { listReportOfficers } from "@/lib/reports/monthly-attendance/server";

export async function GET() {
  return withApiErrorHandling(async () => NextResponse.json(await listReportOfficers()));
}
