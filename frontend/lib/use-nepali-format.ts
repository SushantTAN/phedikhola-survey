"use client";

import { useMemo } from "react";
import { useNepaliDateUtils } from "nepali-bs-calendar-react";

export const NP_MONTHS = [
  "बैशाख",
  "जेठ",
  "असार",
  "श्रावण",
  "भदौ",
  "आश्विन",
  "कार्तिक",
  "मंसिर",
  "पौष",
  "माघ",
  "फाल्गुन",
  "चैत्र",
];

const AD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const pad = (n: number) => String(n).padStart(2, "0");
const localKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Parts = { bs: string; ad: string };

/**
 * Display helpers that show stored English (AD) dates in Nepali (BS), e.g. "१६ आश्विन २०८२".
 * Uses the calendar data from NepaliCalendarProvider (the extended range). Dates the calendar cannot
 * convert fall back to the plain English date, so nothing ever shows a wrong Nepali date.
 */
export function useNepaliFormat() {
  const utils = useNepaliDateUtils();

  return useMemo(() => {
    const years = utils.getAvailableYears();
    const lastYear = years[years.length - 1]!;
    const rangeMin = utils.bsStringToAd(
      utils.formatBSDate(utils.getFirstValidDate()),
    )!;
    const rangeMax = utils.bsStringToAd(
      utils.formatBSDate({
        year: lastYear,
        month: 12,
        day: utils.getMonthDays(lastYear, 12),
      }),
    )!;

    /** Nepali label for an English "YYYY-MM-DD" key, or "" when out of range. */
    const label = (key: string) => {
      const m = AD_PATTERN.exec(key);
      if (!m || key < rangeMin || key > rangeMax) return "";
      const bs = utils.adToBs(
        new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
      );
      return `${utils.toNepaliNumber(bs.day)} ${NP_MONTHS[bs.month - 1]} ${utils.toNepaliNumber(bs.year)}`;
    };

    /** Date-only values (date of birth, service date). Uses the stored calendar day, like the forms do. */
    const parts = (value?: string | Date | null): Parts => {
      if (!value) return { bs: "—", ad: "" };
      const key =
        value instanceof Date ? localKey(value) : String(value).slice(0, 10);
      const bs = label(key);
      return { bs: bs || key, ad: bs ? key : "" };
    };

    const date = (value?: string | Date | null) => {
      const p = parts(value);
      return p.ad ? `${p.bs} (${p.ad})` : p.bs;
    };

    /** Timestamps (last login, last sync). Shown in the viewer's local time. */
    const dateTime = (value?: string | Date | null) => {
      if (!value) return "—";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "—";
      const key = localKey(d);
      const bs = label(key);
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return bs ? `${bs}, ${time} (${key})` : `${key} ${time}`;
    };

    return { parts, date, dateTime };
  }, [utils]);
}
