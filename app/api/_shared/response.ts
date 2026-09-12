import { NextResponse } from "next/server";

import { AuthenticationError } from "@/lib/auth/errors";
import { neonAuth } from "@/lib/auth/neon";
import { withDatabaseRequestContext } from "@/lib/neon/request-context";
import { DatabaseNotFoundError } from "@/lib/neon/query";
import { AuthorizationError } from "@/lib/user/server";

type DatabaseError = {
  code?: string;
  constraint?: string;
  message?: string;
  table?: string;
};

export function apiError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export const badRequest = (message: string) => apiError(message, 400);
export const conflict = (message: string) => apiError(message, 409);
export const forbidden = () => apiError("Origin request tidak diizinkan.", 403);
export const notFound = (message = "Data tidak ditemukan.") => apiError(message, 404);
export const unauthorized = (message = "Sesi tidak valid. Silakan login kembali.") => apiError(message, 401);

export function handleApiError(error: unknown) {
  if (error instanceof AuthenticationError) return unauthorized(error.message);
  if (error instanceof AuthorizationError) return apiError(error.message, 403);
  if (error instanceof DatabaseNotFoundError) return notFound(error.message);

  const databaseError = error as DatabaseError;
  if (databaseError?.code === "PGRST116") return notFound();
  if (databaseError?.code === "22007") return badRequest("Format tanggal tidak valid.");
  if (databaseError?.code === "22003") return badRequest("Nilai angka terlalu besar atau berada di luar batas yang diperbolehkan.");
  if (databaseError?.code === "23505") {
    if (databaseError.constraint === "balita_nik_anak_key") {
      return conflict("NIK balita sudah terdaftar.");
    }
    return conflict("Data yang sama sudah terdaftar.");
  }

  console.error("API error:", error);
  return apiError("Terjadi kesalahan pada server. Silakan coba lagi.", 500);
}

export async function withApiErrorHandling(
  handler: () => Promise<NextResponse>,
) {
  try {
    const { data: session } = await neonAuth.getSession();

    return await withDatabaseRequestContext(session?.user?.id ?? null, async () => {
      return await handler();
    });
  } catch (error) {
    return handleApiError(error);
  }
}
