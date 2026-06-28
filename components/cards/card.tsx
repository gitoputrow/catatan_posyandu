import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
};

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow ${className}`}
      {...props}
    />
  );
}

export function CardHeader({
  action,
  className = "",
  description,
  title,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 border-b border-border px-5 py-4 ${className}`}
      {...props}
    >
      <div>
        <h2 className="font-bold text-text-primary">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ className = "", ...props }: CardProps) {
  return <div className={`p-5 ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`flex items-center gap-3 border-t border-border px-5 py-4 ${className}`}
      {...props}
    />
  );
}
