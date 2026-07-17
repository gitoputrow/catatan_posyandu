"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

const inputClassName = "h-11 w-full rounded-lg border border-border bg-surface px-3 font-normal text-text-primary outline-none placeholder:text-text-disabled focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

export type SearchableSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type SearchableSelectProps = {
  action?: {
    label: string;
    onClick: () => void;
  };
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  required?: boolean;
  value: string | number;
};

export function Form({ children, className = "", ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={className} {...props}>{children}</form>;
}

export function FormField({ label, className = "", onValueChange, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; onValueChange?: (name: string, value: string) => void }) {
  return <label className={`block text-sm font-semibold text-text-primary ${className}`}>{label}<input className={`mt-2 ${inputClassName}`} {...props} onChange={(event) => { props.onChange?.(event); onValueChange?.(event.target.name, event.target.value); }} /></label>;
}

export function FormSelect({ children, className = "", label, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode; label: string }) {
  const options = useMemo(() => getOptionsFromChildren(children), [children]);
  const value = Array.isArray(props.value) ? props.value[0] ?? "" : props.value ?? "";

  return (
    <label className={`block text-sm font-semibold text-text-primary ${className}`}>
      {label}
      <SearchableSelect
        ariaLabel={props["aria-label"] ?? label}
        className="mt-2"
        disabled={props.disabled}
        name={props.name}
        onValueChange={(value) => {
          props.onChange?.({
            target: { name: props.name, value },
          } as ChangeEvent<HTMLSelectElement>);
        }}
        options={options}
        required={props.required}
        value={value}
      />
    </label>
  );
}

export function SearchableSelect({
  action,
  ariaLabel,
  className = "",
  disabled = false,
  name,
  onValueChange,
  options,
  placeholder = "Pilih data",
  required,
  value,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedValue = String(value ?? "");
  const selectedOption = options.find((option) => option.value === selectedValue);
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
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

  useLayoutEffect(() => {
    if (!isOpen) return;

    function updateMenuPosition() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const estimatedHeight = 320;
      const openAbove = spaceBelow < Math.min(240, estimatedHeight) && spaceAbove > spaceBelow;
      setMenuPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: openAbove ? Math.max(8, rect.top - Math.min(estimatedHeight, spaceAbove)) : rect.bottom + 8,
        width: rect.width,
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {name && <input name={name} required={required} type="hidden" value={selectedValue} />}
      <button
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`${inputClassName} flex items-center justify-between gap-3 pr-3 text-left disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={disabled}
        ref={buttonRef}
        onClick={() => {
          setIsOpen((current) => !current);
          setQuery("");
        }}
        type="button"
      >
        <span className={selectedOption ? "truncate text-sm sm:text-base" : "truncate text-text-disabled"}>
          {selectedOption?.label || placeholder}
        </span>
        <svg aria-hidden="true" className={`size-4 shrink-0 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {isOpen && !disabled && createPortal(
        <div
          className="fixed z-[100] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
          onWheel={(event) => event.stopPropagation()}
          ref={menuRef}
          style={menuPosition}
        >
          <div className="border-b border-border p-2">
            <input
              autoFocus
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal text-text-primary outline-none placeholder:text-text-disabled focus:border-primary focus:ring-4 focus:ring-primary/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari..."
              value={query}
            />
          </div>
          <div className="max-h-60 space-y-1 overflow-y-auto overscroll-contain p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 ${option.value === selectedValue ? "bg-primary/10 text-primary" : "text-text-primary"}`}
                  disabled={option.disabled}
                  key={`${option.value}-${option.label}`}
                  onClick={() => {
                    onValueChange(option.value);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm font-medium text-text-secondary">Tidak ada pilihan</p>
            )}
          </div>
          {action && (
            <div className="border-t border-border p-1">
              <button
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-primary transition hover:bg-primary/10"
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                  action.onClick();
                }}
                type="button"
              >
                {action.label}
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

export function FormTextarea({ label, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label className={`block text-sm font-semibold text-text-primary ${className}`}>{label}<textarea className="mt-2 min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 font-normal text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60" {...props} /></label>;
}

function getOptionsFromChildren(children: ReactNode): SearchableSelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const option = child as ReactElement<{
      children?: ReactNode;
      disabled?: boolean;
      value?: string | number;
    }>;
    const label = Children.toArray(option.props.children).join("");
    const value = option.props.value ?? label;

    return [{
      disabled: option.props.disabled,
      label,
      value: String(value),
    }];
  });
}
