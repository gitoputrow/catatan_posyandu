type DashboardStatCardProps = {
  color: string;
  detail: string;
  featured?: boolean;
  generatedAt?: string;
  isLoading: boolean;
  label: string;
  value: number;
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function DashboardStatCard({
  color,
  detail,
  featured = false,
  generatedAt,
  isLoading,
  label,
  value,
}: DashboardStatCardProps) {
  return (
    <article
      className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${
        featured ? "sm:col-span-2 xl:col-span-4" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-text-primary">{label}</p>
          <p className="mt-1 text-xs font-medium text-text-secondary">{detail}</p>
        </div>

        {featured ? (
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Data terbaru</p>
            <p className="mt-1 text-xs font-medium text-text-secondary">
              {isLoading || !generatedAt ? "Memuat..." : formatDateTime(generatedAt)}
            </p>
          </div>
        ) : (
          <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}>
            <ChildIcon />
          </div>
        )}
      </div>

      <p className="mt-5 text-3xl font-extrabold tracking-tight text-text-primary">
        {isLoading ? "…" : value}
      </p>
      <p className="mt-1 text-xs font-semibold text-text-secondary">balita</p>
    </article>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : `${dateTimeFormatter.format(date)} WIB`;
}

function ChildIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c.6-3.5 2.5-5.2 5.5-5.2s4.9 1.7 5.5 5.2M16 5.5a2.5 2.5 0 010 5M17.5 14.8c1.7.7 2.7 2.4 3 5.2" />
    </svg>
  );
}
