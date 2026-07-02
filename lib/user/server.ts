import { AuthenticationError, getAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

const tableName = "petugas";

export class AuthorizationError extends Error {
  constructor(message = "Akun petugas belum terhubung ke Posyandu.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getAuthenticatedPetugas() {
  const supabase = await getAuthenticatedSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new AuthenticationError();

  const { data: petugas, error: petugasError } = await supabase
    .from(tableName)
    .select("posyandu_id, jenis_petugas")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (petugasError) throw petugasError;
  if (!petugas?.posyandu_id) throw new AuthorizationError();

  return {
    supabase,
    posyanduId: petugas.posyandu_id as string,
    role: String(petugas.jenis_petugas ?? ""),
  };
}

export async function getAuthenticatedPetugasForWrite() {
  const petugas = await getAuthenticatedPetugas();
  if (petugas.role.toLowerCase() === "viewer") {
    throw new AuthorizationError("Akun viewer hanya dapat melihat dan mengekspor data.");
  }
  return petugas;
}

export async function getUser() {
  const supabase = await getAuthenticatedSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new AuthenticationError();

  return supabase.from(tableName).select("*").eq("auth_user_id", data.user.id).single();
}
