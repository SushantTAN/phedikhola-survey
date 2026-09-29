"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export type SelectChoice = { value: string; label: string };

const actionValue = "__form_select_action__";

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

export function FormSelect({
  selected,
  options,
  onChange,
  placeholder = "Select",
  action,
}: {
  selected: SelectChoice | null;
  options: SelectChoice[];
  onChange: (choice: SelectChoice) => void;
  placeholder?: string;
  action?: { label: string; onSelect: () => void };
}) {
  return (
    <Select
      value={selected?.value ?? ""}
      onValueChange={(value) => {
        if (value === actionValue && action) {
          action.onSelect();
          return;
        }
        const choice = options.find((option) => option.value === value);
        if (choice) onChange(choice);
      }}
    >
      <SelectTrigger>
        <span
          className={cn(
            "min-w-0 truncate text-left",
            !selected && "text-slate-400",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        {action && (
          <SelectItem
            value={actionValue}
            className="border-t border-slate-200 font-medium text-emerald-700"
          >
            {action.label}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
