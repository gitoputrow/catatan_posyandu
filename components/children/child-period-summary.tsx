import type { ChildActivitySummary } from "@/components/children/activity-summary-types";

export function ChildPeriodSummary({ data, isLoading, periodLabel }: { data: ChildActivitySummary | null; isLoading: boolean; periodLabel: string }) {
  return (
    <section className="mt-6">
      <h2 className="text-xl font-extrabold text-text-primary">Balita Baru dan Lama · {periodLabel}</h2>
      <p className="mt-1 text-sm text-text-secondary">Usia 0–5 tahun</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Balita Baru" loading={isLoading} value={data?.newChildren ?? 0} />
        <SummaryCard label="Balita Lama" loading={isLoading} value={data?.existingChildren ?? 0} />
      </div>
    </section>
  );
}

function SummaryCard({ label, loading, value }: { label: string; loading: boolean; value: number }) {
  return <article className="rounded-xl border border-border bg-surface p-5 shadow-sm"><p className="text-sm font-bold text-text-primary">{label}</p><p className="mt-4 text-4xl font-extrabold text-primary">{loading ? "…" : value}</p></article>;
}
