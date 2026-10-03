import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/theme";
import { TONES, type Status, type Tone } from "../lib/health";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{children}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}
export function ErrorText({ message }: { message?: string }) {
  return message ? <Text style={styles.error}>{message}</Text> : null;
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#94a3b8"
      {...props}
      style={[styles.input, props.style]}
    />
  );
}
export function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger";
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.buttonOutline,
        variant === "danger" && styles.buttonDanger,
        (disabled || pressed) && { opacity: 0.65 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "outline" && { color: colors.text },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const bg =
    status === "synced"
      ? "#dcfce7"
      : status === "failed"
        ? "#fee2e2"
        : status === "conflict"
          ? "#ffedd5"
          : "#fef3c7";
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 12, textTransform: "capitalize" }}>
        {status}
      </Text>
    </View>
  );
}

/** Small coloured pill, e.g. blood pressure stage or "Needs follow-up". */
export function Chip({ label, tone }: { label: string; tone: Tone }) {
  const c = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderWidth: 1, borderColor: c.border }]}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: c.text }}>{label}</Text>
    </View>
  );
}

/** Coloured result box shown under vitals once a reading is complete. */
export function StatusBanner({ status, reading }: { status: Status | "invalid" | null; reading?: string }) {
  if (!status) return null;
  if (status === "invalid") {
    return (
      <View style={[styles.banner, { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }]}>
        <Text style={{ color: "#475569", flex: 1 }}>⚠️ This reading looks unusual. Please check the values.</Text>
      </View>
    );
  }
  const c = TONES[status.tone];
  return (
    <View style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={[styles.bannerDot, { backgroundColor: c.solid }]} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "700", color: c.text }}>{status.title}</Text>
        <Text style={{ color: c.text, opacity: 0.8, fontSize: 12 }}>{status.hint}</Text>
      </View>
      {reading ? <Text style={{ fontWeight: "800", fontSize: 18, color: c.text }}>{reading}</Text> : null}
    </View>
  );
}

export function EmptyState({ title = "No results found", detail }: { title?: string; detail?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 28 }}>📭</Text>
      <Text style={{ fontWeight: "600", color: colors.text }}>{title}</Text>
      {detail ? <Text style={{ color: colors.muted, fontSize: 12 }}>{detail}</Text> : null}
    </View>
  );
}

export function LoadingRow({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.green} />
      <Text style={{ color: colors.muted }}>{label}</Text>
    </View>
  );
}

export function CheckRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable style={styles.checkRow} onPress={() => onChange(!value)}>
      <Text style={{ flex: 1, fontWeight: "600", color: colors.text }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.greenSoft, false: "#e2e8f0" }}
        thumbColor={value ? colors.green : "#f8fafc"}
      />
    </Pressable>
  );
}

const SEARCH_THRESHOLD = 6;

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="🔍 Search…"
      placeholderTextColor="#94a3b8"
      autoCorrect={false}
      style={[styles.input, { marginBottom: 8 }]}
    />
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  loading = false,
  clearLabel,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
  loading?: boolean;
  /** When set, adds an entry at the top that selects "" (no value). */
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);
  const selected = options.find((x) => x.value === value);
  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [options, term]);
  return (
    <View>
      <Label>{label}</Label>
      <Pressable style={[styles.input, styles.row]} onPress={() => setOpen(true)}>
        <Text style={{ flex: 1, color: selected ? colors.text : "#94a3b8" }}>{selected?.label ?? placeholder}</Text>
        {loading ? <ActivityIndicator size="small" color={colors.muted} /> : <Text style={{ color: colors.muted }}>▾</Text>}
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.length >= SEARCH_THRESHOLD && <SearchBox value={term} onChange={setTerm} />}
            <ScrollView keyboardShouldPersistTaps="handled">
              {clearLabel && !term && (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: colors.muted }}>{clearLabel}</Text>
                </Pressable>
              )}
              {loading && !options.length ? (
                <LoadingRow />
              ) : visible.length ? (
                visible.map((o) => (
                  <Pressable
                    key={o.value}
                    style={[styles.option, o.value === value && { backgroundColor: colors.greenSoft }]}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={o.value === value ? { fontWeight: "700" } : undefined}>{o.label}</Text>
                  </Pressable>
                ))
              ) : (
                <EmptyState
                  title={term ? "No results found" : "No options available"}
                  detail={term ? `Nothing matches “${term.trim()}”` : undefined}
                />
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function MultiSelect({
  label,
  items,
  selected,
  onToggle,
  loading = false,
}: {
  label: string;
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  loading?: boolean;
}) {
  const [term, setTerm] = useState("");
  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    return t ? items.filter((i) => i.label.toLowerCase().includes(t)) : items;
  }, [items, term]);
  return (
    <View>
      <Label>
        {label}
        {selected.length ? `  (${selected.length} selected)` : ""}
      </Label>
      {items.length > 8 && <SearchBox value={term} onChange={setTerm} />}
      {loading && !items.length ? (
        <LoadingRow />
      ) : visible.length ? (
        <View style={styles.chips}>
          {visible.map((i) => (
            <Pressable
              key={i.id}
              onPress={() => onToggle(i.id)}
              style={[styles.chip, selected.includes(i.id) && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected.includes(i.id) && { color: "white" },
                ]}
              >
                {i.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState
          title={term ? "No results found" : "No options available"}
          detail={term ? `Nothing matches “${term.trim()}”` : undefined}
        />
      )}
    </View>
  );
}
export const styles = StyleSheet.create({
  screen: {
    padding: 16,
    paddingBottom: 48,
    backgroundColor: colors.bg,
    minHeight: "100%",
    gap: 14,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  h1: { fontSize: 26, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  hint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  error: { color: colors.danger, fontSize: 12 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  button: {
    minHeight: 46,
    backgroundColor: colors.green,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonOutline: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonText: { color: "white", fontWeight: "700" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  bannerDot: { width: 14, height: 14, borderRadius: 7 },
  empty: { alignItems: "center", gap: 4, paddingVertical: 20 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "75%",
    backgroundColor: "white",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  option: {
    paddingVertical: 15,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "white",
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, color: colors.text },
});
