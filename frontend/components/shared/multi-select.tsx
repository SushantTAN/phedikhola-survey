"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownEmpty, DropdownLoading } from "@/components/shared/dropdown-states";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string };

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  loading = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  useEffect(() => { if (!open) setTerm(""); }, [open]);

  const selected = options.filter((o) => value.includes(o.value));
  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [options, term]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-auto min-h-10 w-full justify-between px-3 font-normal">
          <span className="flex flex-wrap gap-1 text-left">
            {selected.length ? (
              selected.map((o) => (
                <span key={o.value} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{o.label}</span>
              ))
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </span>
          {loading ? <Loader2 className="ml-2 animate-spin opacity-60" /> : <ChevronsUpDown className="ml-2 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
        {(options.length > 5 || term) && (
          <div className="relative border-b border-slate-100">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search…"
              className="h-10 w-full rounded-t-xl bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        )}
        <div className="max-h-64 space-y-1 overflow-auto p-1" onWheel={(e) => e.stopPropagation()}>
          {loading && !options.length ? (
            <DropdownLoading />
          ) : visible.length ? (
            visible.map((o) => {
              const checked = value.includes(o.value);
              return (
                <Button
                  key={o.value}
                  type="button"
                  variant="ghost"
                  onClick={() => onChange(checked ? value.filter((x) => x !== o.value) : [...value, o.value])}
                  className={cn("h-auto w-full justify-start gap-2 rounded-lg px-2 py-2 text-left text-sm font-normal", checked && "bg-emerald-50 hover:bg-emerald-50")}
                >
                  <Checkbox checked={checked} />
                  <span className="flex-1">{o.label}</span>
                  {checked && <Check className="text-emerald-600" />}
                </Button>
              );
            })
          ) : (
            <DropdownEmpty searching={!!term.trim()} term={term.trim()} />
          )}
        </div>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange([])}
            className="h-auto w-full gap-1 rounded-t-none border-t py-2 text-xs text-slate-500 hover:text-slate-900"
          >
            <X size={13} />Clear selection
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
