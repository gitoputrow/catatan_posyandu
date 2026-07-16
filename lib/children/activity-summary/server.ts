import "server-only";

import type { ChildActivitySummary } from "@/components/children/activity-summary-types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { getAuthenticatedPetugas } from "@/lib/user/server";

type ActivityChild = {
  id: string;
  jenis_kelamin: "L" | "P";
  registered_at: string;
  tanggal_lahir: string | null;
};

export async function getChildActivitySummary(month: number, year: number): Promise<ChildActivitySummary> {
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const referenceDate = new Date(Date.UTC(year, month, 0));
  const oldestBirthDate = getOldestDisplayedBirthDate(month, year);
  const { data, error } = await supabase
    .from("balita")
    .select("id, jenis_kelamin, tanggal_lahir, registered_at")
    .eq("posyandu_id", posyanduId)
    .lt("registered_at", monthEnd.toISOString());
  if (error) throw error;

  const children = (data ?? []) as ActivityChild[];
  const ageGroups = { infantMale: 0, infantFemale: 0, childMale: 0, childFemale: 0 };
  const monthlyRegistrations = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, count: 0 }));
  let newChildren = 0;
  let existingChildren = 0;
  let totalChildren = 0;

  for (const child of children) {
    const registeredAt = new Date(child.registered_at);
    if (!Number.isNaN(registeredAt.getTime())) {
      if (registeredAt.getUTCFullYear() === year && registeredAt.getUTCMonth() < month) {
        monthlyRegistrations[registeredAt.getUTCMonth()].count += 1;
      }
    }

    const isDisplayedAge = !child.tanggal_lahir || child.tanggal_lahir >= oldestBirthDate;
    if (!isDisplayedAge) continue;

    totalChildren += 1;
    if (!Number.isNaN(registeredAt.getTime())) {
      if (registeredAt >= monthStart && registeredAt < monthEnd) newChildren += 1;
      else if (registeredAt < monthStart) existingChildren += 1;
    }

    const age = getAgeInMonths(child.tanggal_lahir, referenceDate);
    if (age === null || age > 60) continue;
    if (age <= 12) {
      if (child.jenis_kelamin === "L") ageGroups.infantMale += 1;
      else ageGroups.infantFemale += 1;
    } else if (child.jenis_kelamin === "L") ageGroups.childMale += 1;
    else ageGroups.childFemale += 1;
  }

  return {
    ageGroups,
    existingChildren,
    generatedAt: new Date().toISOString(),
    month,
    monthlyRegistrations,
    newChildren,
    totalChildren,
    year,
  };
}

function getAgeInMonths(value: string | null, referenceDate: Date) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  return Math.max(0, (referenceDate.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 + referenceDate.getUTCMonth() - birthDate.getUTCMonth() - (referenceDate.getUTCDate() < birthDate.getUTCDate() ? 1 : 0));
}
