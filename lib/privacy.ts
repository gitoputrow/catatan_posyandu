export const hiddenSensitiveValue = "Tersembunyi";

export function sensitiveValue<T extends string | null | undefined>(
  value: T,
  canViewSensitiveData: boolean,
) {
  if (!canViewSensitiveData) return hiddenSensitiveValue;
  return value || "-";
}

export function exportSensitiveValue<T extends string | null | undefined>(
  value: T,
  canViewSensitiveData: boolean,
) {
  if (!canViewSensitiveData) return "";
  return value ?? "";
}
