import { NextResponse } from "next/server";

import { withApiErrorHandling } from "@/app/api/_shared/response";
import { listKelurahan } from "@/lib/children/server";

export async function GET() {
  return withApiErrorHandling(async () => {
    const { data, error } = await listKelurahan();
    if (error) throw error;
    return NextResponse.json(data);
  });
}
