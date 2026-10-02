import { ArrowDown, ArrowUp, CheckCircle2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Level = "low" | "normal" | "elevated" | "high1" | "high2";

const LEVELS: Record<
  Level,
  {
    title: string;
    hint: string;
    icon: typeof CheckCircle2;
    box: string;
    badge: string;
  }
> = {
  low: {
    title: "Low blood pressure",
    hint: "Below the usual range. Check for dizziness or weakness and consider medical advice.",
    icon: ArrowDown,
    box: "border-sky-200 bg-sky-50 text-sky-900",
    badge: "bg-sky-600",
  },
  normal: {
    title: "Normal blood pressure",
    hint: "Within the healthy range.",
    icon: CheckCircle2,
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
    badge: "bg-emerald-600",
  },
  elevated: {
    title: "Slightly high blood pressure",
    hint: "Above normal. Advise lifestyle changes and recheck soon.",
    icon: ArrowUp,
    box: "border-amber-200 bg-amber-50 text-amber-900",
    badge: "bg-amber-500",
  },
  high1: {
    title: "High blood pressure (Stage 1)",
    hint: "Needs attention. Recommend a follow-up and monitoring.",
    icon: TriangleAlert,
    box: "border-orange-200 bg-orange-50 text-orange-900",
    badge: "bg-orange-500",
  },
  high2: {
    title: "High blood pressure (Stage 2)",
    hint: "Seriously raised. Refer for medical care and mark for follow-up.",
    icon: TriangleAlert,
    box: "border-red-200 bg-red-50 text-red-900",
    badge: "bg-red-600",
  },
};

// Same thresholds as the "Blood pressure classification" report.
export function classifyBloodPressure(
  systolic: number,
  diastolic: number,
): Level {
  if (systolic >= 140 || diastolic >= 90) return "high2";
  if (systolic >= 130 || diastolic >= 80) return "high1";
  if (systolic >= 120 && diastolic < 80) return "elevated";
  if (systolic < 90 || diastolic < 60) return "low";
  return "normal";
}

const toNumber = (v: unknown) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? null
    : Number(v);

/** Shows a colour-coded reading once both values are entered. Renders nothing otherwise. */
export function BloodPressureStatus({
  systolic,
  diastolic,
}: {
  systolic: unknown;
  diastolic: unknown;
}) {
  const sys = toNumber(systolic);
  const dia = toNumber(diastolic);
  if (sys == null || dia == null || sys <= 0 || dia <= 0) return null;

  if (dia >= sys) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
      >
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          The lower (diastolic) value is not lower than the upper (systolic)
          value. Please check the readings.
        </span>
      </div>
    );
  }

  const level = LEVELS[classifyBloodPressure(sys, dia)];
  const Icon = level.icon;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-colors",
        level.box,
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
          {sys}/{dia}
        </p>
        <p className="mt-1 text-xs opacity-70">mmHg</p>
      </div>
    </div>
  );
}

const CHIPS: Record<Level, { label: string; classes: string }> = {
  low: { label: "Low", classes: "bg-sky-100 text-sky-800 ring-sky-200" },
  normal: {
    label: "Normal",
    classes: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  elevated: {
    label: "Slightly high",
    classes: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  high1: {
    label: "High · Stage 1",
    classes: "bg-orange-100 text-orange-800 ring-orange-200",
  },
  high2: {
    label: "High · Stage 2",
    classes: "bg-red-100 text-red-800 ring-red-200",
  },
};

/** Small inline chip with the blood pressure stage. Renders nothing for missing or invalid readings. */
export function BloodPressureChip({
  systolic,
  diastolic,
  className,
}: {
  systolic: unknown;
  diastolic: unknown;
  className?: string;
}) {
  const sys = toNumber(systolic);
  const dia = toNumber(diastolic);
  if (sys == null || dia == null || sys <= 0 || dia <= 0 || dia >= sys)
    return null;
  const chip = CHIPS[classifyBloodPressure(sys, dia)];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        chip.classes,
        className,
      )}
    >
      {chip.label}
    </span>
  );
}
