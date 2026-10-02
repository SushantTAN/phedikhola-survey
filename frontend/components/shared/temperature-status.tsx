import {
  ArrowDown,
  CheckCircle2,
  Flame,
  Thermometer,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Level =
  "low" | "slightlyLow" | "normal" | "raised" | "fever" | "highFever";

const LEVELS: Record<
  Level,
  {
    title: string;
    chip: string;
    hint: string;
    icon: typeof CheckCircle2;
    box: string;
    badge: string;
    chipClasses: string;
  }
> = {
  low: {
    title: "Low body temperature",
    chip: "Low",
    hint: "Well below normal. Keep the person warm and seek medical advice.",
    icon: ArrowDown,
    box: "border-sky-200 bg-sky-50 text-sky-900",
    badge: "bg-sky-600",
    chipClasses: "bg-sky-100 text-sky-800 ring-sky-200",
  },
  slightlyLow: {
    title: "Slightly low body temperature",
    chip: "Slightly low",
    hint: "A little below normal. Recheck the reading and keep the person warm.",
    icon: Thermometer,
    box: "border-cyan-200 bg-cyan-50 text-cyan-900",
    badge: "bg-cyan-600",
    chipClasses: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  },
  normal: {
    title: "Normal body temperature",
    chip: "Normal",
    hint: "Within the healthy range.",
    icon: CheckCircle2,
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
    badge: "bg-emerald-600",
    chipClasses: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  raised: {
    title: "Slightly raised temperature",
    chip: "Slightly raised",
    hint: "Just above normal. Recheck later and watch for other symptoms.",
    icon: Thermometer,
    box: "border-amber-200 bg-amber-50 text-amber-900",
    badge: "bg-amber-500",
    chipClasses: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  fever: {
    title: "Fever",
    chip: "Fever",
    hint: "Raised temperature. Advise rest and fluids, and consider a follow-up.",
    icon: Flame,
    box: "border-orange-200 bg-orange-50 text-orange-900",
    badge: "bg-orange-500",
    chipClasses: "bg-orange-100 text-orange-800 ring-orange-200",
  },
  highFever: {
    title: "High fever",
    chip: "High fever",
    hint: "Very high temperature. Refer for medical care and mark for follow-up.",
    icon: TriangleAlert,
    box: "border-red-200 bg-red-50 text-red-900",
    badge: "bg-red-600",
    chipClasses: "bg-red-100 text-red-800 ring-red-200",
  },
};

/** Body temperature in °F (oral/axillary readings). */
export function classifyTemperature(f: number): Level {
  if (f < 95) return "low";
  if (f < 97) return "slightlyLow";
  if (f <= 99) return "normal";
  if (f < 100.4) return "raised";
  if (f < 103) return "fever";
  return "highFever";
}

// Anything outside this window is almost certainly a typing slip, not a reading.
const plausible = (f: number) => f >= 80 && f <= 115;
const toNumber = (v: unknown) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? null
    : Number(v);

/** Colour-coded banner shown once a temperature is entered. */
export function TemperatureStatus({
  value,
  className,
}: {
  value: unknown;
  className?: string;
}) {
  const t = toNumber(value);
  if (t == null || t <= 0) return null;

  if (!plausible(t)) {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700",
          className,
        )}
      >
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          This temperature looks unusual for °F. Please check the reading.
        </span>
      </div>
    );
  }

  const level = LEVELS[classifyTemperature(t)];
  const Icon = level.icon;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-colors",
        level.box,
        className,
      )}
    >
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-sm",
          level.badge,
        )}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{level.title}</p>
        <p className="text-sm opacity-80">{level.hint}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-2xl font-extrabold leading-none tracking-tight">
          {t}°F
        </p>
        <p className="mt-1 text-xs opacity-70">
          {(((t - 32) * 5) / 9).toFixed(1)}°C
        </p>
      </div>
    </div>
  );
}

/** Small inline chip with the temperature status. Renders nothing for missing or implausible readings. */
export function TemperatureChip({
  value,
  className,
}: {
  value: unknown;
  className?: string;
}) {
  const t = toNumber(value);
  if (t == null || !plausible(t)) return null;
  const level = LEVELS[classifyTemperature(t)];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        level.chipClasses,
        className,
      )}
    >
      {level.chip}
    </span>
  );
}
