"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownEmpty,
  DropdownLoading,
} from "@/components/shared/dropdown-states";

export type SelectChoice = { value: string; label: string };

export function selectChoice(
  value: string | null | undefined,
  options: SelectChoice[],
  fallbackLabel?: string,
): SelectChoice | null {
  if (!value) return null;
  return (
    options.find((option) => option.value === value) ?? {
      value,
      label: fallbackLabel || value,
    }
  );
}

const SEARCH_THRESHOLD = 6;

/**
 * Single-select dropdown with search, a loading state and an empty state.
 * - `loading`: options are still being fetched.
 * - `searchable`: show the search box (defaults to on when there are more than a handful of options).
 * - `onSearchChange`: switch to server-side search; the parent supplies already-filtered options.
 */
export function FormSelect({
  selected,
  options,
  onChange,
  placeholder = "Select",
  action,
  loading = false,
  searchable,
  onSearchChange,
  disabled,
}: {
  selected: SelectChoice | null;
  options: SelectChoice[];
  onChange: (choice: SelectChoice) => void;
  placeholder?: string;
  action?: { label: string; onSelect: () => void };
  loading?: boolean;
  searchable?: boolean;
  onSearchChange?: (term: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const remote = !!onSearchChange;
  const showSearch =
    searchable ?? (remote || options.length >= SEARCH_THRESHOLD);

  useEffect(() => {
    if (!open && term) {
      setTerm("");
      onSearchChange?.("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    return remote || !t
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(t));
  }, [options, term, remote]);

  function pick(choice: SelectChoice) {
    onChange(choice);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            className={cn(
              "min-w-0 truncate text-left",
              !selected && "text-slate-400",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          {loading ? (
            <Loader2
              size={16}
              className="shrink-0 animate-spin text-slate-400"
            />
          ) : (
            <ChevronDown size={16} className="shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
      >
        {showSearch && (
          <div className="relative border-b border-slate-100">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              autoFocus
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (visible[0]) pick(visible[0]);
                }
              }}
              placeholder="Search…"
              className="h-10 w-full rounded-t-xl bg-transparent pl-9 pr-9 text-sm outline-none placeholder:text-slate-400"
            />
            {loading && options.length > 0 && (
              <Loader2
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
              />
            )}
          </div>
        )}
        <div
          role="listbox"
          className="max-h-64 overflow-auto p-1"
          onWheel={(e) => e.stopPropagation()}
        >
          {loading && !options.length ? (
            <DropdownLoading />
          ) : visible.length ? (
            visible.map((option) => {
              const active = option.value === selected?.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(option)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-emerald-50",
                    active && "bg-emerald-50 font-medium text-emerald-800",
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active && (
                    <Check size={15} className="shrink-0 text-emerald-600" />
                  )}
                </button>
              );
            })
          ) : (
            <DropdownEmpty searching={!!term.trim()} term={term.trim()} />
          )}
          {action && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className="mt-1 w-full rounded-lg border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              {action.label}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
