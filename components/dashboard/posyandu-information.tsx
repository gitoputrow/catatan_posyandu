import type { DashboardData } from "@/components/dashboard/types";

type PosyanduInformationProps = {
  data: DashboardData["posyandu"] | null | undefined;
  isLoading: boolean;
};

export function PosyanduInformation({ data, isLoading }: PosyanduInformationProps) {
  const items = [
    { label: "Nama Posyandu", value: data?.name },
    { label: "RT", value: data?.rt },
    { label: "RW", value: data?.rw },
    { label: "Kelurahan", value: data?.village },
    { label: "Kecamatan", value: data?.district },
    { label: "Jumlah Kader", value: data?.cadreCount },
  ];

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-bold text-text-primary">Informasi Posyandu</h2>
      </div>
      <dl className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div className="bg-surface px-5 py-4" key={item.label}>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{item.label}</dt>
            <dd className="mt-1 text-sm font-semibold text-text-primary">
              {isLoading ? "Memuat..." : item.value === null || item.value === undefined || item.value === "" ? "-" : item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
