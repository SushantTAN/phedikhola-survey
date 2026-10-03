import { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/src/components/text";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/constants/theme";
import {
  Button,
  Card,
  EmptyState,
  H1,
  Input,
  Screen,
  StatusBadge,
} from "@/src/components/ui";
import { listCitizens, type LocalCitizen } from "@/src/db";
const avatarStyle = {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: colors.greenTint,
  alignItems: "center",
  justifyContent: "center",
} as const;

export default function Citizens() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<LocalCitizen[]>([]);
  const latest = useRef(0);
  // Only the newest search may update the list, so a slow older query cannot overwrite it.
  const load = useCallback(async () => {
    const ticket = ++latest.current;
    const rows = await listCitizens(q);
    if (ticket === latest.current) setItems(rows);
  }, [q]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <H1>Citizens</H1>
        <View style={{ width: 110 }}>
          <Button
            title="Add"
            icon="add"
            onPress={() => router.push("/citizens/new")}
          />
        </View>
      </View>
      <Input
        placeholder="Search name, citizen ID or phone"
        value={q}
        onChangeText={setQ}
      />
      {items.length === 0 && (
        <EmptyState
          title={q ? "No results found" : "No citizens on this device"}
          detail={q ? `Nothing matches “${q}”` : "Add a citizen, or sync to download existing records."}
        />
      )}
      {items.map((c) => (
        <Pressable
          key={c.client_uuid}
          onPress={() =>
            router.push({
              pathname: "/citizens/[id]",
              params: { id: c.client_uuid },
            })
          }
        >
          <Card>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={avatarStyle}>
                <Text style={{ color: colors.green, fontWeight: "800", fontSize: 16 }}>
                  {c.full_name.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 16 }}>
                  {c.full_name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {c.public_id || "ID assigned after sync"} ·{" "}
                  {c.phone || "No phone"}
                  {c.guardian_phone ? ` · Guardian ${c.guardian_phone}` : ""}
                </Text>
              </View>
              <StatusBadge status={c.sync_status} />
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
