import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { NextResponse, type NextRequest } from "next/server";

import { neonAuth } from "@/lib/auth/neon";

const protectRoute = neonAuth.middleware({ loginUrl: "/login" });

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(NEON_AUTH_SESSION_COOKIE_NAME);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSessionCookie ? "/dashboard" : "/login", request.url),
    );
  }

  if (pathname === "/login") {
    if (!hasSessionCookie) return NextResponse.next();
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return protectRoute(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
