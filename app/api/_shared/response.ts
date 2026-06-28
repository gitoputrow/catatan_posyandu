import { NextResponse } from "next/server";

import { AuthenticationError } from "@/lib/supabase/server";
import { AuthorizationError } from "@/lib/user/server";

type PostgrestError = {
  code?: string;
  message?: string;
};

export function apiError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export const badRequest = (message: string) => apiError(message, 400);
export const forbidden = () => apiError("Origin request tidak diizinkan.", 403);
export const notFound = (message = "Data tidak ditemukan.") => apiError(message, 404);
export const unauthorized = (message = "Sesi tidak valid. Silakan login kembali.") => apiError(message, 401);

export function handleApiError(error: unknown) {
  if (error instanceof AuthenticationError) return unauthorized(error.message);
  if (error instanceof AuthorizationError) return apiError(error.message, 403);

  const databaseError = error as PostgrestError;
  if (databaseError?.code === "PGRST116") return notFound();

  console.error("API error:", error);
  return apiError("Terjadi kesalahan pada server. Silakan coba lagi.", 500);
}

export async function withApiErrorHandling(
  handler: () => Promise<NextResponse>,
) {
  try {
    return await handler();
  } catch (error) {
    return handleApiError(error);
  }
}
