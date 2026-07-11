type UserRoleLike = {
  jenis_petugas?: string | null;
  role?: string | null;
};

export function isKaderRole(value?: string | null) {
  return value?.toLowerCase().includes("kader") ?? false;
}

export function canWriteAsKader(user?: UserRoleLike | null) {
  if (!user) return false;
  return isKaderRole(user.role) || isKaderRole(user.jenis_petugas);
}
