import type { SessionOptions } from "iron-session";

export type SessionData = {
  accessToken?: string;
  accessTokenExpiresAt?: number;
  refreshToken?: string;
};

const password = process.env.AUTH_SECRET;

if (!password) {
  throw new Error("AUTH_SECRET belum diatur di environment.");
}

export const sessionOptions: SessionOptions = {
  cookieName: "catatan_posyandu_session",
  password,
  cookieOptions: {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 28800),
  },
};
