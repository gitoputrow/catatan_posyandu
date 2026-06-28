import type { ReactNode } from "react";

type InformationGroupProps = {
  className?: string;
  description: string;
  icon: ReactNode;
  isLoading: boolean;
  items: Array<[string, number]>;
  title: string;
  variant: "primary" | "secondary" | "accent";
};

export function InformationGroup({
  className = "",
  description,
  icon,
  isLoading,
  items,
  title,
  variant,
}: InformationGroupProps) {
  const variants = {
    primary: {
      icon: "bg-primary/10 text-primary",
      tile: "bg-primary/5",
      value: "text-primary",
    },
    secondary: {
      icon: "bg-secondary/15 text-secondary",
      tile: "bg-secondary/10",
      value: "text-secondary",
    },
    accent: {
      icon: "bg-accent/10 text-accent",
      tile: "bg-accent/5",
      value: "text-accent",
    },
  }[variant];
  const itemGrid = items.length === 2
    ? "grid-cols-2 lg:grid-cols-1"
    : "grid-cols-2";

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm ${className}`}
    >
      <div className="flex min-h-24 items-center gap-3 border-b border-border px-4 py-4">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${variants.icon}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-text-primary">{title}</h3>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            {description}
          </p>
        </div>
      </div>
      <div className={`grid flex-1 auto-rows-fr gap-2 p-3 sm:p-4 ${itemGrid}`}>
        {items.map(([label, value]) => (
          <div
            className={`flex min-h-24 flex-col justify-between rounded-xl p-3.5 ${variants.tile}`}
            key={label}
          >
            <p className="text-[10px] font-bold uppercase leading-4 tracking-wide text-text-secondary">
              {label}
            </p>
            <p className={`mt-3 text-2xl font-extrabold ${variants.value}`}>
              {isLoading ? "…" : value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
