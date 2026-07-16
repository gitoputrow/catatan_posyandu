import Link from "next/link";

export function BackLink({ href }: { href: string }) {
  return (
    <Link className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-bold text-text-secondary transition hover:bg-background hover:text-primary" href={href}>
      <span aria-hidden="true">←</span>
      Kembali
    </Link>
  );
}
