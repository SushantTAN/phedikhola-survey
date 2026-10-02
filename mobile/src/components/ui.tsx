import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../constants/theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
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
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((x) => x.value === value);
  return (
    <View>
      <Label>{label}</Label>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text>{selected?.label ?? placeholder}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  style={styles.option}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Text>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
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
}: {
  label: string;
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View>
      <Label>{label}</Label>
      <View style={styles.chips}>
        {items.map((i) => (
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
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: "white",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  option: {
    paddingVertical: 15,
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
