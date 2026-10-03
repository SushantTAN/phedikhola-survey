import { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
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
        <View style={{ width: 130 }}>
          <Button
            title="+ Add citizen"
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
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 16 }}>
                  {c.full_name}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  {c.public_id || "ID assigned after sync"} ·{" "}
                  {c.phone || "No phone"}
                  {c.guardian_phone ? ` · Guardian ${c.guardian_phone}` : ""}
                </Text>
              </View>
              <StatusBadge status={c.sync_status} />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
