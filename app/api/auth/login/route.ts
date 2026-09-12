import { NextResponse } from "next/server";

import { badRequest, forbidden, unauthorized, withApiErrorHandling } from "@/app/api/_shared/response";
import { signInWithEmailAndPassword } from "@/lib/auth/login";
import { isSameOriginRequest } from "@/lib/auth/csrf";

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    if (!isSameOriginRequest(request)) return forbidden();

    let payload: LoginPayload;
    try {
      payload = await request.json();
    } catch {
      return badRequest("Payload login tidak valid.");
    }

    if (
      typeof payload.email !== "string" ||
      typeof payload.password !== "string" ||
      !payload.email.trim() ||
      !payload.password
    ) {
      return badRequest("Email dan password wajib diisi.");
    }

    const { error } = await signInWithEmailAndPassword(
      payload.email.trim(),
      payload.password,
    );
    if (error) return unauthorized("Email atau password tidak valid.");
    return NextResponse.json({ message: "Login berhasil." }, { status: 200 });
  });
}
