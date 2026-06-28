export function PageLoading() {
  return (
    <main className="grid min-h-[50vh] place-items-center px-5 py-10">
      <div className="flex items-center gap-3 text-sm font-semibold text-text-secondary">
        <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Memuat halaman...
      </div>
    </main>
  );
}
