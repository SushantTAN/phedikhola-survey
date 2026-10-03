import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text, TextInput } from "./text";
import { colors } from "../constants/theme";
import { EmptyState, Label, LoadingRow, styles } from "./ui";

export type PickerMedicine = { id: string; label: string; unit: string };

const MAX_VISIBLE = 8;

/** Search for a medicine and tap it to add it straight away. Added medicines are marked and can't be added twice. */
export function MedicinePicker({
  medicines,
  selectedIds,
  loading,
  onAdd,
  onAddOther,
}: {
  medicines: PickerMedicine[];
  selectedIds: string[];
  loading?: boolean;
  onAdd: (m: PickerMedicine) => void;
  onAddOther: (name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const matches = useMemo(
    () => (term ? medicines.filter((m) => m.label.toLowerCase().includes(term)) : medicines),
    [medicines, term],
  );
  const shown = matches.slice(0, MAX_VISIBLE);

  return (
    <View style={{ gap: 8 }}>
      <Label>Search medicine, then tap it to add</Label>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="🔍 Search medicine…"
        placeholderTextColor="#94a3b8"
        autoCorrect={false}
        style={styles.input}
      />
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" }}>
        {loading && !medicines.length ? (
          <LoadingRow label="Loading medicines…" />
        ) : shown.length ? (
          shown.map((m) => {
            const added = selectedIds.includes(m.id);
            return (
              <Pressable
                key={m.id}
                disabled={added}
                onPress={() => {
                  onAdd(m);
                  setSearch("");
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 13,
                  paddingHorizontal: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  backgroundColor: added ? "#f8fafc" : "white",
                }}
              >
                <Text style={{ flex: 1, color: added ? "#94a3b8" : colors.text, fontWeight: "600" }}>{m.label}</Text>
                <Text style={{ color: added ? colors.green : colors.green, fontWeight: "700" }}>{added ? "✓ Added" : "＋ Add"}</Text>
              </Pressable>
            );
          })
        ) : (
          <EmptyState title="No medicine found" detail={term ? `Nothing matches “${search.trim()}”` : undefined} />
        )}
        {matches.length > shown.length ? (
          <Text style={{ padding: 10, color: colors.muted, fontSize: 12 }}>
            Showing {shown.length} of {matches.length}. Type more letters to narrow the list.
          </Text>
        ) : null}
        {term ? (
          <Pressable
            onPress={() => {
              onAddOther(search.trim());
              setSearch("");
            }}
            style={{ padding: 13 }}
          >
            <Text style={{ color: colors.green, fontWeight: "700" }}>＋ Add “{search.trim()}” as other medicine</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
