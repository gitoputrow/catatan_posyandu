import { NextResponse } from "next/server";

import { withApiErrorHandling } from "@/app/api/_shared/response";
import { listPosyandu } from "@/lib/children/server";

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    const kelurahanId = new URL(request.url).searchParams.get("kelurahan_id") ?? undefined;
    const { data, error } = await listPosyandu(kelurahanId);
    if (error) throw error;
    return NextResponse.json(data);
  });
}
