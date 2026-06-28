"use client";

import { useEffect, useRef, useState } from "react";

export type MultiSelectOption = {
  description?: string;
  disabled?: boolean;
  label: string;
  value: string;
};

type MultiSelectProps = {
  disabled?: boolean;
  emptyMessage?: string;
  onValueChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  selectedLabel?: string;
  value: string[];
};

export function MultiSelect({ disabled = false, emptyMessage = "Data tidak ditemukan", onValueChange, options, placeholder = "Pilih data", searchPlaceholder = "Cari...", selectedLabel = "data", value }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = new Set(value);
  const filteredOptions = options.filter((option) => `${option.label} ${option.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function toggleValue(optionValue: string) {
    onValueChange(selected.has(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue]);
  }

  return <div className="relative" ref={wrapperRef}>
    <button aria-expanded={isOpen} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} onClick={() => { setIsOpen((current) => !current); setQuery(""); }} type="button"><span className={value.length ? "font-medium" : "text-text-disabled"}>{value.length ? `${value.length} ${selectedLabel} dipilih` : placeholder}</span><svg aria-hidden="true" className={`size-4 shrink-0 text-text-secondary transition ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg></button>

    {value.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{value.map((selectedValue) => {
      const option = options.find((item) => item.value === selectedValue);
      if (!option) return null;
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary" key={selectedValue}>{option.label}<button aria-label={`Hapus ${option.label}`} className="text-sm leading-none" onClick={() => toggleValue(selectedValue)} type="button">×</button></span>;
    })}</div>}

    {isOpen && !disabled && <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"><div className="border-b border-border p-2"><input autoFocus className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} value={query} /></div><div className="max-h-64 space-y-1 overflow-y-auto p-1">{filteredOptions.length ? filteredOptions.map((option) => <button className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 ${selected.has(option.value) ? "bg-primary/10" : ""}`} disabled={option.disabled} key={option.value} onClick={() => toggleValue(option.value)} type="button"><span className={`grid size-5 shrink-0 place-items-center rounded border ${selected.has(option.value) ? "border-primary bg-primary text-white" : "border-border bg-surface"}`}>{selected.has(option.value) ? "✓" : ""}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-text-primary">{option.label}</span>{option.description && <span className="text-xs text-text-secondary">{option.description}</span>}</span></button>) : <p className="px-3 py-4 text-center text-sm text-text-secondary">{emptyMessage}</p>}</div></div>}
  </div>;
}
