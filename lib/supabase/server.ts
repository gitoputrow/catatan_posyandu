import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSession } from "@/lib/auth/session";

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Konfigurasi Supabase belum lengkap.");
}

export class AuthenticationError extends Error {
  constructor(message = "Sesi tidak valid. Silakan login kembali.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function createSupabaseServerClient(accessToken?: string) {
  return createClient(supabaseUrl!, supabasePublishableKey!, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export async function getAuthenticatedSupabaseServerClient() {
  const session = await getSession();
  let accessToken = session.accessToken;

  if (!accessToken) {
    throw new AuthenticationError();
  }

  if (
    session.refreshToken &&
    session.accessTokenExpiresAt &&
    session.accessTokenExpiresAt * 1_000 <= Date.now() + 60_000
  ) {
    const refreshClient = createSupabaseServerClient();
    const { data, error } = await refreshClient.auth.refreshSession({
      refresh_token: session.refreshToken,
    });

    if (error || !data.session) {
      throw new AuthenticationError("Sesi Anda sudah berakhir. Silakan login kembali.");
    }

    session.accessToken = data.session.access_token;
    session.accessTokenExpiresAt = data.session.expires_at;
    session.refreshToken = data.session.refresh_token;
    await session.save();
    accessToken = data.session.access_token;
  }

  return createSupabaseServerClient(accessToken);
}

export const supabaseServer = createSupabaseServerClient();
