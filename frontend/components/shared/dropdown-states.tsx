import { Inbox, Loader2, SearchX } from "lucide-react";

export function DropdownLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-500"
    >
      <Loader2 size={16} className="animate-spin text-emerald-600" />
      {label}
    </div>
  );
}

/** Shown when a dropdown has nothing to list. `searching` switches the wording for "no match" vs "no data". */
export function DropdownEmpty({
  searching,
  term,
}: {
  searching?: boolean;
  term?: string;
}) {
  const Icon = searching ? SearchX : Inbox;
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center text-sm text-slate-500">
      <Icon size={26} className="text-slate-300" />
      <span className="font-medium text-slate-600">
        {searching ? "No results found" : "No options available"}
      </span>
      {searching && term ? (
        <span className="text-xs">Nothing matches “{term}”</span>
      ) : null}
    </div>
  );
}
