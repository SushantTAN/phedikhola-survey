"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownEmpty, DropdownLoading } from "@/components/shared/dropdown-states";
import { cn } from "@/lib/utils";

export type PickerMedicine = { id: string; name: string; strength?: string | null; dosageForm?: string | null };

const labelOf = (m: PickerMedicine) => `${m.name}${m.strength ? ` ${m.strength}` : ""}`;

/**
 * One-step medicine picker: type to search, click a medicine to add it straight away.
 * Medicines already added are ticked and can't be added twice.
 */
export function MedicinePicker({
  medicines,
  selectedIds,
  onAdd,
  onAddOther,
  loading = false,
}: {
  medicines: PickerMedicine[];
  selectedIds: string[];
  onAdd: (medicine: PickerMedicine) => void;
  onAddOther: (name: string) => void;
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const matches = useMemo(
    () => medicines.filter((m) => !term || `${labelOf(m)} ${m.dosageForm ?? ""}`.toLowerCase().includes(term)),
    [medicines, term],
  );

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="relative border-b border-slate-200">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicine by name… then click it to add"
          className="h-11 rounded-b-none rounded-t-xl border-0 pl-9 shadow-none focus:ring-0"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const first = matches.find((m) => !selectedIds.includes(m.id));
            if (first) { onAdd(first); setSearch(""); }
          }}
        />
      </div>
      <div className="max-h-56 overflow-auto p-1">
        {loading && !medicines.length && <DropdownLoading label="Loading medicines…" />}
        {matches.map((m) => {
          const added = selectedIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              disabled={added}
              onClick={() => onAdd(m)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
                added ? "cursor-default text-slate-400" : "hover:bg-emerald-50",
              )}
            >
              <span>
                <span className="font-medium text-slate-800">{labelOf(m)}</span>
                {m.dosageForm && <span className="ml-2 text-xs text-slate-400">{m.dosageForm}</span>}
              </span>
              {added ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><Check size={14} />Added</span>
              ) : (
                <Plus size={16} className="text-emerald-600" />
              )}
            </button>
          );
        })}
        {!loading && !matches.length && <DropdownEmpty searching={!!term} term={search.trim()} />}
        {term && (
          <button
            type="button"
            onClick={() => { onAddOther(search.trim()); setSearch(""); }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            <Plus size={16} />Add “{search.trim()}” as other medicine
          </button>
        )}
      </div>
    </div>
  );
}
