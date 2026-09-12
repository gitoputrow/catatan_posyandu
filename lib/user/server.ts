import { AuthenticationError } from "@/lib/auth/errors";
import { neonAuth } from "@/lib/auth/neon";
import { databaseResult, queryOne } from "@/lib/neon/query";
import { getDatabaseRequestAuthUserId } from "@/lib/neon/request-context";
import { canWriteAsKader } from "@/lib/user/permissions";

export class AuthorizationError extends Error {
  constructor(message = "Akun petugas belum terhubung ke Posyandu.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getAuthenticatedPetugas() {
  const contextAuthUserId = getDatabaseRequestAuthUserId();
  let authUserId = contextAuthUserId;

  if (authUserId === undefined) {
    const { data: session, error } = await neonAuth.getSession();
    if (error || !session?.user) throw new AuthenticationError();
    authUserId = session.user.id;
  }
  if (!authUserId) throw new AuthenticationError();

  const petugas = await queryOne<{
    id: string;
    posyandu_id: string | null;
    jenis_petugas: string;
  }>(
    `select id, posyandu_id, jenis_petugas
     from petugas
     where auth_user_id = $1
       and is_active = true
     limit 1`,
    [authUserId],
  );

  if (!petugas) throw new AuthorizationError("Akun belum terhubung dengan data petugas aktif.");
  if (!petugas?.posyandu_id) throw new AuthorizationError();

  return {
    petugasId: petugas.id as string,
    posyanduId: petugas.posyandu_id as string,
    role: String(petugas.jenis_petugas ?? ""),
  };
}

export async function getAuthenticatedPetugasForWrite() {
  const petugas = await getAuthenticatedPetugas();
  if (!canWriteAsKader(petugas)) {
    throw new AuthorizationError("Hanya kader yang dapat menambah, mengubah, atau menghapus data.");
  }
  return petugas;
}

export async function getUser() {
  const contextAuthUserId = getDatabaseRequestAuthUserId();
  let authUserId = contextAuthUserId;

  if (authUserId === undefined) {
    const { data: session, error } = await neonAuth.getSession();
    if (error || !session?.user) throw new AuthenticationError();
    authUserId = session.user.id;
  }
  if (!authUserId) throw new AuthenticationError();

  const data = await queryOne<Record<string, unknown>>(
    `select id, auth_user_id, posyandu_id, kelurahan_id, nama, jenis_petugas,
            is_active, nama_kelurahan, nama_posyandu
     from petugas
     where auth_user_id = $1 and is_active = true
     limit 1`,
    [authUserId],
  );
  if (!data) throw new AuthorizationError("Akun belum terhubung dengan data petugas aktif.");
  return databaseResult(data);
}
