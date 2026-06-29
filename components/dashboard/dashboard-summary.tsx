import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import type { DashboardData } from "@/components/dashboard/types";

type DashboardSummaryProps = {
  data: DashboardData | null;
  isLoading: boolean;
};

export function DashboardSummary({ data, isLoading }: DashboardSummaryProps) {
  const ageGroups = data?.ageGroups;
  const total = ageGroups
    ? ageGroups.infantMale + ageGroups.infantFemale + ageGroups.childMale + ageGroups.childFemale
    : 0;
  const cards = [
    {
      label: "Total Balita",
      detail: "Usia 0–5 tahun",
      value: total,
      color: "bg-text-primary/10 text-text-primary",
      featured: true,
    },
    {
      label: "Usia 0–12 Bulan",
      detail: "Laki-laki",
      value: ageGroups?.infantMale ?? 0,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Usia 0–12 Bulan",
      detail: "Perempuan",
      value: ageGroups?.infantFemale ?? 0,
      color: "bg-secondary/15 text-secondary",
    },
    {
      label: "Usia 1–5 Tahun",
      detail: "Laki-laki",
      value: ageGroups?.childMale ?? 0,
      color: "bg-success/15 text-[#5E8D2B]",
    },
    {
      label: "Usia 1–5 Tahun",
      detail: "Perempuan",
      value: ageGroups?.childFemale ?? 0,
      color: "bg-accent/10 text-accent",
    },
  ];

  return (
    <section
      aria-label="Jumlah balita berdasarkan usia dan jenis kelamin"
      className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <DashboardStatCard
          {...card}
          generatedAt={card.featured ? data?.generatedAt : undefined}
          isLoading={isLoading}
          key={`${card.label}-${card.detail}`}
        />
      ))}
    </section>
  );
}
