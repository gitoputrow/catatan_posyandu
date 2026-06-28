import { NextResponse } from "next/server";

import { badRequest, forbidden, unauthorized, withApiErrorHandling } from "@/app/api/_shared/response";
import { signInWithEmailAndPassword } from "@/lib/auth/login";
import { isSameOriginRequest } from "@/lib/auth/csrf";
import { getSession } from "@/lib/auth/session";

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

    const { data, error } = await signInWithEmailAndPassword(
      payload.email.trim(),
      payload.password,
    );
    if (error || !data.session || !data.user) return unauthorized("Email atau password tidak valid.");

    const session = await getSession();
    session.accessToken = data.session.access_token;
    session.accessTokenExpiresAt = data.session.expires_at;
    session.refreshToken = data.session.refresh_token;
    await session.save();
    return NextResponse.json({ message: "Login berhasil." }, { status: 200 });
  });
}
