import { NextResponse } from "next/server";

import { forbidden, withApiErrorHandling } from "@/app/api/_shared/response";
import { signOut } from "@/lib/auth/logout";
import { isSameOriginRequest } from "@/lib/auth/csrf";

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();
    await signOut();
    return NextResponse.json({ message: "Anda berhasil keluar." });
  });
}
