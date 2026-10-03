// Same thresholds as the web app (bp-status.tsx / temperature-status.tsx) and the blood pressure report.

export type Tone = "blue" | "cyan" | "green" | "amber" | "orange" | "red";
export type Status = { title: string; chip: string; hint: string; tone: Tone };

const toNumber = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function bloodPressureStatus(systolic: unknown, diastolic: unknown): Status | "invalid" | null {
  const sys = toNumber(systolic);
  const dia = toNumber(diastolic);
  if (sys == null || dia == null || sys <= 0 || dia <= 0) return null;
  if (dia >= sys) return "invalid";
  if (sys >= 140 || dia >= 90) return { title: "High blood pressure (Stage 2)", chip: "High · Stage 2", hint: "Seriously raised. Refer for medical care and mark for follow-up.", tone: "red" };
  if (sys >= 130 || dia >= 80) return { title: "High blood pressure (Stage 1)", chip: "High · Stage 1", hint: "Needs attention. Recommend a follow-up and monitoring.", tone: "orange" };
  if (sys >= 120 && dia < 80) return { title: "Slightly high blood pressure", chip: "Slightly high", hint: "Above normal. Advise lifestyle changes and recheck soon.", tone: "amber" };
  if (sys < 90 || dia < 60) return { title: "Low blood pressure", chip: "Low", hint: "Below the usual range. Check for dizziness or weakness and consider medical advice.", tone: "blue" };
  return { title: "Normal blood pressure", chip: "Normal", hint: "Within the healthy range.", tone: "green" };
}

/** Body temperature in °F. Anything outside 80-115 is treated as a typing slip. */
export function temperatureStatus(value: unknown): Status | "invalid" | null {
  const t = toNumber(value);
  if (t == null || t <= 0) return null;
  if (t < 80 || t > 115) return "invalid";
  if (t < 95) return { title: "Low body temperature", chip: "Low", hint: "Well below normal. Keep the person warm and seek medical advice.", tone: "blue" };
  if (t < 97) return { title: "Slightly low body temperature", chip: "Slightly low", hint: "A little below normal. Recheck the reading and keep the person warm.", tone: "cyan" };
  if (t <= 99) return { title: "Normal body temperature", chip: "Normal", hint: "Within the healthy range.", tone: "green" };
  if (t < 100.4) return { title: "Slightly raised temperature", chip: "Slightly raised", hint: "Just above normal. Recheck later and watch for other symptoms.", tone: "amber" };
  if (t < 103) return { title: "Fever", chip: "Fever", hint: "Raised temperature. Advise rest and fluids, and consider a follow-up.", tone: "orange" };
  return { title: "High fever", chip: "High fever", hint: "Very high temperature. Refer for medical care and mark for follow-up.", tone: "red" };
}

export const TONES: Record<Tone, { bg: string; border: string; text: string; solid: string }> = {
  blue: { bg: "#e0f2fe", border: "#bae6fd", text: "#075985", solid: "#0284c7" },
  cyan: { bg: "#cffafe", border: "#a5f3fc", text: "#155e75", solid: "#0891b2" },
  green: { bg: "#d1fae5", border: "#a7f3d0", text: "#065f46", solid: "#059669" },
  amber: { bg: "#fef3c7", border: "#fde68a", text: "#92400e", solid: "#f59e0b" },
  orange: { bg: "#ffedd5", border: "#fed7aa", text: "#9a3412", solid: "#f97316" },
  red: { bg: "#fee2e2", border: "#fecaca", text: "#991b1b", solid: "#dc2626" },
};
