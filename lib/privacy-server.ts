import "server-only";

import type { Child } from "@/components/children/types";
import type { GrowthHistoryChild } from "@/components/growth-history/types";
import type { GrowthRecordViewModel } from "@/components/growth-record/types";
import { isKaderRole } from "@/lib/user/permissions";

export function canViewSensitiveData(role?: string | null) {
  return isKaderRole(role);
}

export function redactChildSensitiveData(child: Child, role?: string | null): Child {
  if (canViewSensitiveData(role)) return child;

  return {
    ...child,
    hp_ortu: "",
    nik_anak: "",
    nik_ortu: "",
    no_hp_ayah: "",
    no_hp_ibu: "",
    nomor_kk: "",
  };
}

export function redactGrowthRecordSensitiveData(
  record: GrowthRecordViewModel,
  role?: string | null,
): GrowthRecordViewModel {
  if (canViewSensitiveData(role)) return record;
  return { ...record, nik_anak: null, nik_ortu: null };
}

export function redactGrowthHistoryChildSensitiveData(
  child: GrowthHistoryChild,
  role?: string | null,
): GrowthHistoryChild {
  if (canViewSensitiveData(role)) return child;
  return { ...child, nik_anak: null, nik_ortu: null };
}
