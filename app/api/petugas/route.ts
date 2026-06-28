import { NextResponse } from "next/server";

import { notFound, withApiErrorHandling } from "@/app/api/_shared/response";
import { getUser } from "@/lib/user/server";

export async function GET() {
  return withApiErrorHandling(async () => {
    const { data, error } = await getUser();
    if (error) throw error;
    if (!data) return notFound("Data petugas tidak ditemukan.");
    return NextResponse.json(data);
  });
}
