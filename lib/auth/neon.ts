import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.AUTH_SECRET;

if (!baseUrl) {
  throw new Error("NEON_AUTH_BASE_URL belum diatur di environment.");
}

if (!cookieSecret || cookieSecret.length < 32) {
  throw new Error("AUTH_SECRET untuk Neon Auth wajib memiliki minimal 32 karakter.");
}

export const neonAuth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
  },
});
