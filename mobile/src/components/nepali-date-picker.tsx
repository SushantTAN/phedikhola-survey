import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";
import {
  adDay,
  adToBs,
  bsToAd,
  EN_MONTHS,
  FIRST_BS_YEAR,
  formatBs,
  LAST_BS_YEAR,
  monthDays,
  NP_MONTHS,
  NP_WEEKDAYS,
  toNepaliNumber,
  todayAd,
  weekdayOfBs,
} from "../lib/nepali-date";
import { Label, styles as ui } from "./ui";

type Mode = "days" | "months" | "years";

/**
 * Bikram Sambat date picker. The value going in and out is an English (AD) "YYYY-MM-DD" string, so what is
 * stored in SQLite and synced to the server keeps its current format.
 */
export function NepaliDatePicker({
  label,
  value,
  onChange,
  min,
  max,
  defaultYearsAgo = 0,
  clearable = false,
  placeholder = "मिति छान्नुहोस् / Select date",
}: {
  label?: string;
  /** English date, "YYYY-MM-DD" (a full ISO timestamp is also accepted). */
  value?: string | null;
  /** Called with an English "YYYY-MM-DD" string, or "" when cleared. */
  onChange: (ad: string) => void;
  /** Earliest / latest selectable English date. */
  min?: string;
  max?: string;
  /** When empty, open this many years before today (handy for dates of birth). */
  defaultYearsAgo?: number;
  clearable?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("days");
  const [view, setView] = useState({ year: FIRST_BS_YEAR, month: 1 });

  const valueKey = adDay(value);
  const valueBs = adToBs(valueKey);
  const today = todayAd();
  const todayBs = adToBs(today);

  const minYear = (min && adToBs(min)?.year) || FIRST_BS_YEAR;
  const maxYear = (max && adToBs(max)?.year) || LAST_BS_YEAR;

  function openPicker() {
    let start = valueBs;
    if (!start) {
      const base = todayBs ?? { year: LAST_BS_YEAR, month: 1, day: 1 };
      start = { ...base, year: Math.min(Math.max(base.year - defaultYearsAgo, minYear), maxYear) };
    }
    setView({ year: start.year, month: start.month });
    setMode("days");
    setOpen(true);
  }
  function pick(ad: string) {
    onChange(ad);
    setOpen(false);
  }
  function shiftMonth(delta: number) {
    setView((v) => {
      let year = v.year;
      let month = v.month + delta;
      if (month < 1) { month = 12; year -= 1; }
      if (month > 12) { month = 1; year += 1; }
      return year < minYear || year > maxYear ? v : { year, month };
    });
  }

  const cells = useMemo(() => {
    const total = monthDays(view.year, view.month);
    const lead = weekdayOfBs({ year: view.year, month: view.month, day: 1 });
    return [...Array<null>(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }, [view]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [minYear, maxYear]);

  const todayAllowed = (!min || today >= min) && (!max || today <= max) && !!todayBs;

  return (
    <View>
      {label ? <Label>{label}</Label> : null}
      <Pressable style={[ui.input, ui.row]} onPress={openPicker}>
        <View style={{ flex: 1 }}>
          {valueKey ? (
            <Text style={{ color: colors.text }}>
              <Text style={{ fontWeight: "600" }}>{formatBs(valueKey)}</Text>
              {valueBs ? <Text style={{ color: "#94a3b8", fontSize: 12 }}>{"  "}{valueKey}</Text> : null}
            </Text>
          ) : (
            <Text style={{ color: "#94a3b8" }}>{placeholder}</Text>
          )}
        </View>
        <Text style={{ color: colors.muted }}>📅</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={s.card} onPress={() => {}}>
            <View style={s.header}>
              <Pressable style={s.nav} onPress={() => shiftMonth(-1)} disabled={mode !== "days"}>
                <Text style={s.navText}>‹</Text>
              </Pressable>
              <Pressable style={s.headerBtn} onPress={() => setMode(mode === "months" ? "days" : "months")}>
                <Text style={s.headerText}>
                  {NP_MONTHS[view.month - 1]} <Text style={s.headerSub}>({EN_MONTHS[view.month - 1]})</Text> ▾
                </Text>
              </Pressable>
              <Pressable style={s.headerBtn} onPress={() => setMode(mode === "years" ? "days" : "years")}>
                <Text style={s.headerText}>{toNepaliNumber(view.year)} ▾</Text>
              </Pressable>
              <Pressable style={s.nav} onPress={() => shiftMonth(1)} disabled={mode !== "days"}>
                <Text style={s.navText}>›</Text>
              </Pressable>
            </View>

            {mode === "days" && (
              <>
                <View style={s.week}>
                  {NP_WEEKDAYS.map((d, i) => (
                    <Text key={d} style={[s.weekday, (i === 0 || i === 6) && { color: "#ef4444" }]}>{d}</Text>
                  ))}
                </View>
                <View style={s.grid}>
                  {cells.map((day, index) => {
                    if (day == null) return <View key={`e${index}`} style={s.cell} />;
                    const ad = bsToAd({ year: view.year, month: view.month, day });
                    const disabled = !ad || (!!min && ad < min) || (!!max && ad > max);
                    const selected = !!ad && ad === valueKey;
                    const isToday = ad === today;
                    const weekend = index % 7 === 0 || index % 7 === 6;
                    return (
                      <Pressable
                        key={day}
                        style={s.cell}
                        disabled={disabled}
                        onPress={() => ad && pick(ad)}
                      >
                        <View style={[s.day, selected && s.daySelected, !selected && isToday && s.dayToday, disabled && { opacity: 0.3 }]}>
                          <Text style={[s.dayText, weekend && !selected && { color: "#ef4444" }, selected && { color: "white", fontWeight: "700" }]}>
                            {toNepaliNumber(day)}
                          </Text>
                          {ad ? <Text style={[s.adText, selected && { color: "#d1fae5" }]}>{Number(ad.slice(8, 10))}</Text> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={s.legend}>Small number = English date</Text>
              </>
            )}

            {mode === "months" && (
              <ScrollView style={s.list}>
                {NP_MONTHS.map((name, i) => (
                  <Pressable
                    key={name}
                    style={[s.listItem, view.month === i + 1 && s.listItemActive]}
                    onPress={() => { setView((v) => ({ ...v, month: i + 1 })); setMode("days"); }}
                  >
                    <Text style={view.month === i + 1 ? { fontWeight: "700" } : undefined}>{name} ({EN_MONTHS[i]})</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {mode === "years" && (
              <ScrollView style={s.list}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    style={[s.listItem, view.year === y && s.listItemActive]}
                    onPress={() => { setView((v) => ({ ...v, year: y })); setMode("days"); }}
                  >
                    <Text style={view.year === y ? { fontWeight: "700" } : undefined}>{toNepaliNumber(y)} ({y})</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={s.footer}>
              {todayAllowed && <Pressable onPress={() => pick(today)}><Text style={s.link}>आज / Today</Text></Pressable>}
              {clearable && !!valueKey && <Pressable onPress={() => pick("")}><Text style={[s.link, { color: "#dc2626" }]}>Clear</Text></Pressable>}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setOpen(false)}><Text style={[s.link, { color: colors.muted }]}>Close</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "center", padding: 16 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 14, maxHeight: "88%" },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  nav: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 20, color: colors.text },
  headerBtn: { flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  headerText: { fontWeight: "700", color: colors.text, fontSize: 13 },
  headerSub: { fontWeight: "400", color: colors.muted, fontSize: 11 },
  week: { flexDirection: "row", marginBottom: 4 },
  weekday: { width: "14.2857%", textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.muted, paddingVertical: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.2857%", aspectRatio: 1, padding: 2 },
  day: { flex: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: colors.green },
  dayToday: { borderWidth: 1, borderColor: colors.green },
  dayText: { fontSize: 15, color: colors.text },
  adText: { fontSize: 9, color: "#94a3b8", marginTop: 1 },
  legend: { fontSize: 11, color: "#94a3b8", marginTop: 6 },
  list: { maxHeight: 320 },
  listItem: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  listItemActive: { backgroundColor: colors.greenSoft },
  footer: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  link: { fontWeight: "700", color: colors.green, paddingVertical: 4 },
});
