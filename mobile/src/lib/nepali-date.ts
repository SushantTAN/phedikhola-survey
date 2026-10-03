import { nepaliCalendarData } from "./nepali-calendar-data";

/**
 * Bikram Sambat (BS) <-> English (AD) conversion for the field app.
 * Dates are stored and synced as English "YYYY-MM-DD" strings; BS is only used for display and input.
 * All arithmetic is done in UTC so the device time zone can never shift a date by a day.
 */

export const NP_MONTHS = ["बैशाख", "जेठ", "असार", "श्रावण", "भदौ", "आश्विन", "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र"];
export const EN_MONTHS = ["Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
export const NP_WEEKDAYS = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];

export type BsDate = { year: number; month: number; day: number };

const DAY_MS = 86_400_000;
const NP_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
const AD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const pad = (n: number) => String(n).padStart(2, "0");

const YEARS = Object.keys(nepaliCalendarData.years).map(Number).sort((a, b) => a - b);
export const FIRST_BS_YEAR = YEARS[0]!;
export const LAST_BS_YEAR = YEARS[YEARS.length - 1]!;

// Days from 1 Baisakh of the first supported year to 1 Baisakh of each year.
const yearStart = new Map<number, number>();
let totalDays = 0;
for (const y of YEARS) {
  yearStart.set(y, totalDays);
  totalDays += nepaliCalendarData.years[y]!.reduce((a, b) => a + b, 0);
}

export const monthDays = (year: number, month: number) => nepaliCalendarData.years[year]?.[month - 1] ?? 0;

function ordinalOf({ year, month, day }: BsDate) {
  const months = nepaliCalendarData.years[year];
  if (!months || month < 1 || month > 12 || day < 1 || day > months[month - 1]!) return null;
  let n = yearStart.get(year)!;
  for (let m = 0; m < month - 1; m++) n += months[m]!;
  return n + day - 1;
}

const utcMs = (key: string) => {
  const m = AD_PATTERN.exec(key);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
};
const keyOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const [refBsYear, refBsMonth, refBsDay] = nepaliCalendarData.ref_bs.split("-").map(Number) as [number, number, number];
const refOrdinal = ordinalOf({ year: refBsYear, month: refBsMonth, day: refBsDay })!;
const refAdMs = utcMs(nepaliCalendarData.ref_ad);

/** English "YYYY-MM-DD" -> BS date, or null when outside the supported range (1976-2090 BS). */
export function adToBs(adKey?: string | null): BsDate | null {
  const ms = adKey ? utcMs(adKey) : NaN;
  if (Number.isNaN(ms)) return null;
  const ordinal = refOrdinal + Math.round((ms - refAdMs) / DAY_MS);
  if (ordinal < 0 || ordinal >= totalDays) return null;
  let year = FIRST_BS_YEAR;
  for (const y of YEARS) {
    if (yearStart.get(y)! <= ordinal) year = y;
    else break;
  }
  let rest = ordinal - yearStart.get(year)!;
  const months = nepaliCalendarData.years[year]!;
  for (let m = 0; m < 12; m++) {
    if (rest < months[m]!) return { year, month: m + 1, day: rest + 1 };
    rest -= months[m]!;
  }
  return null;
}

/** BS date -> English "YYYY-MM-DD", or null when invalid. */
export function bsToAd(bs: BsDate): string | null {
  const ordinal = ordinalOf(bs);
  return ordinal == null ? null : keyOf(refAdMs + (ordinal - refOrdinal) * DAY_MS);
}

/** 0 = Sunday ... 6 = Saturday, for a BS date. */
export function weekdayOfBs(bs: BsDate) {
  const ad = bsToAd(bs);
  return ad ? new Date(utcMs(ad)).getUTCDay() : 0;
}

export function toNepaliNumber(value: string | number) {
  return String(value).replace(/[0-9]/g, (d) => NP_DIGITS[Number(d)]!);
}

/** Today's English date in the device's local time zone, as "YYYY-MM-DD". */
export function todayAd() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

export const adDay = (value?: string | null) => (value ? String(value).slice(0, 10) : "");

/** "१६ आश्विन २०८२", or the plain English date when it cannot be converted. */
export function formatBs(adKey?: string | null) {
  const key = adDay(adKey);
  if (!key) return "—";
  const bs = adToBs(key);
  return bs ? `${toNepaliNumber(bs.day)} ${NP_MONTHS[bs.month - 1]} ${toNepaliNumber(bs.year)}` : key;
}

/** Nepali date followed by the English date, e.g. "१६ आश्विन २०८२ (2025-10-02)". */
export function formatBsWithAd(adKey?: string | null) {
  const key = adDay(adKey);
  if (!key) return "—";
  return adToBs(key) ? `${formatBs(key)} (${key})` : key;
}
