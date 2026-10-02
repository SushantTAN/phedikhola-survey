"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  StaticNepaliCalendar,
  useNepaliDateUtils,
  type NepaliCalendarViewRenderProps,
  type NepaliDateValue,
} from "nepali-bs-calendar-react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Bikram Sambat date picker for forms and filters.
 * The value going in and out is always an ordinary English (AD) "YYYY-MM-DD" string, so the API and database
 * keep their current format; the BS conversion only happens inside this component.
 */

const NP_MONTHS = ["बैशाख", "जेठ", "असार", "श्रावण", "भदौ", "आश्विन", "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र"];
const NP_WEEKDAYS = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];
const AD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

type PickerContextValue = {
  todayBs: NepaliDateValue;
  defaultViewYearsAgo: number;
  clearable: boolean;
  onClear: () => void;
  onPickToday: (() => void) | null;
};
const PickerContext = createContext<PickerContextValue | null>(null);

/** The calendar UI, plugged into StaticNepaliCalendar through its `calendarComponent` prop. */
function CustomCalendar({
  value,
  viewYear,
  viewMonth,
  calendarCells,
  goToPreviousMonth,
  goToNextMonth,
  handleYearChange,
  handleMonthChange,
  handleDayChange,
  availableYears,
  validMonthsForYear,
  isDisabled,
  formatBSDate,
  toNepaliNumber,
  BS_MONTHS,
  minDate,
  maxDate,
}: NepaliCalendarViewRenderProps) {
  const ctx = useContext(PickerContext)!;
  const { bsStringToAd } = useNepaliDateUtils();

  // With no value the package opens on the first year it has data for; start somewhere useful instead.
  const seeded = useRef(false);
  useLayoutEffect(() => {
    if (seeded.current || value) return;
    seeded.current = true;
    let year = ctx.todayBs.year - ctx.defaultViewYearsAgo;
    const lo = minDate ? Number(minDate.slice(0, 4)) : availableYears[0]!;
    const hi = maxDate ? Number(maxDate.slice(0, 4)) : availableYears[availableYears.length - 1]!;
    year = Math.min(Math.max(year, lo, availableYears[0]!), hi, availableYears[availableYears.length - 1]!);
    handleYearChange(year);
    handleMonthChange(year === ctx.todayBs.year ? ctx.todayBs.month : 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const minYear = minDate ? Number(minDate.slice(0, 4)) : -Infinity;
  const maxYear = maxDate ? Number(maxDate.slice(0, 4)) : Infinity;
  const years = availableYears.filter((y) => y >= minYear && y <= maxYear).sort((a, b) => b - a);
  const today = formatBSDate(ctx.todayBs);

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center gap-1.5">
        <button type="button" onClick={goToPreviousMonth} aria-label="Previous month" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
          <ChevronLeft size={16} />
        </button>
        <select
          aria-label="Month"
          value={viewMonth}
          onChange={(e) => handleMonthChange(Number(e.target.value))}
          className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-1.5 text-sm font-medium outline-none focus:border-emerald-500"
        >
          {validMonthsForYear.map((m) => (
            <option key={m.month} value={m.month} disabled={m.disabled}>
              {NP_MONTHS[m.month - 1]} ({BS_MONTHS[m.month - 1]})
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={viewYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="h-8 w-[4.75rem] shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 text-sm font-medium outline-none focus:border-emerald-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>{toNepaliNumber(y)}</option>
          ))}
        </select>
        <button type="button" onClick={goToNextMonth} aria-label="Next month" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-slate-500">
        {NP_WEEKDAYS.map((d, i) => (
          <div key={d} className={cn("py-1", (i === 0 || i === 6) && "text-red-500")}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const bs = formatBSDate(date);
          const selected = value === bs;
          const disabled = isDisabled(date);
          const isToday = bs === today;
          const ad = bsStringToAd(bs);
          return (
            <button
              key={bs}
              type="button"
              disabled={disabled}
              onClick={() => handleDayChange(date.day)}
              title={ad ? `${ad} AD` : undefined}
              className={cn(
                "relative flex h-10 flex-col items-center justify-center rounded-lg text-sm leading-none transition",
                selected ? "bg-emerald-600 font-semibold text-white shadow-sm" : "hover:bg-emerald-50",
                !selected && isToday && "ring-1 ring-inset ring-emerald-500",
                !selected && (index % 7 === 0 || index % 7 === 6) && "text-red-500",
                disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
              )}
            >
              <span className="text-[15px]">{toNepaliNumber(date.day)}</span>
              {ad && <span className={cn("mt-0.5 text-[9px]", selected ? "text-emerald-100" : "text-slate-400")}>{Number(ad.slice(8, 10))}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
        <span className="text-slate-400"></span>
        <div className="flex items-center gap-3">
          {ctx.onPickToday && <button type="button" onClick={ctx.onPickToday} className="font-semibold text-emerald-700 hover:underline">आज / Today</button>}
          {ctx.clearable && value && <button type="button" onClick={ctx.onClear} className="font-medium text-slate-500 hover:text-red-600">Clear</button>}
        </div>
      </div>
    </div>
  );
}

export function NepaliDatePicker({
  value,
  onChange,
  placeholder = "मिति छान्नुहोस् / Select date",
  min,
  max,
  disabled,
  clearable = false,
  defaultViewYearsAgo = 0,
  className,
  id,
}: {
  /** English (AD) date, "YYYY-MM-DD". */
  value?: string | null;
  /** Called with an English (AD) "YYYY-MM-DD" string, or "" when cleared. */
  onChange: (ad: string) => void;
  placeholder?: string;
  /** Earliest / latest selectable English date. */
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  /** When empty, open the calendar this many years before today (handy for dates of birth). */
  defaultViewYearsAgo?: number;
  className?: string;
  id?: string;
}) {
  const utils = useNepaliDateUtils();
  const [open, setOpen] = useState(false);

  // AD range the calendar data can represent. Dates outside it cannot be converted reliably.
  const range = useMemo(() => {
    const years = utils.getAvailableYears();
    const first = utils.getFirstValidDate();
    const lastYear = years[years.length - 1]!;
    return {
      min: utils.bsStringToAd(utils.formatBSDate(first))!,
      max: utils.bsStringToAd(utils.formatBSDate({ year: lastYear, month: 12, day: utils.getMonthDays(lastYear, 12) }))!,
    };
  }, [utils]);

  const toBs = (ad?: string | null): string | null => {
    const m = ad ? AD_PATTERN.exec(ad) : null;
    if (!m) return null;
    const key = `${m[1]}-${m[2]}-${m[3]}`;
    if (key < range.min || key > range.max) return null;
    return utils.formatBSDate(utils.adToBs(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
  };

  const bsValue = toBs(value);
  const todayAd = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  })();
  const todayBs = utils.adToBs(new Date());
  const minBs = min && min >= range.min ? toBs(min) ?? undefined : undefined;
  const maxBs = max && max <= range.max ? toBs(max) ?? undefined : undefined;
  const todayAllowed = (!min || todayAd >= min) && (!max || todayAd <= max) && todayAd >= range.min && todayAd <= range.max;

  const pick = (ad: string) => { onChange(ad); setOpen(false); };

  const ctx: PickerContextValue = {
    todayBs,
    defaultViewYearsAgo,
    clearable,
    onClear: () => pick(""),
    onPickToday: todayAllowed ? () => pick(todayAd) : null,
  };

  const parsed = bsValue ? utils.parseBSDate(bsValue) : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          {parsed ? (
            <span className="min-w-0 truncate">
              <span className="font-medium">{utils.toNepaliNumber(parsed.day)} {NP_MONTHS[parsed.month - 1]} {utils.toNepaliNumber(parsed.year)}</span>
              <span className="ml-2 text-xs text-slate-400">{value}</span>
            </span>
          ) : value ? (
            <span className="min-w-0 truncate" title="Outside the supported Nepali calendar range">{value}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
          <CalendarDays size={16} className="shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[19.5rem] p-3">
        <PickerContext.Provider value={ctx}>
          <StaticNepaliCalendar
            value={bsValue}
            minDate={minBs}
            maxDate={maxBs}
            onChange={(bs) => {
              const ad = utils.bsStringToAd(bs);
              if (ad) pick(ad);
            }}
            calendarComponent={CustomCalendar}
          />
        </PickerContext.Provider>
      </PopoverContent>
    </Popover>
  );
}

