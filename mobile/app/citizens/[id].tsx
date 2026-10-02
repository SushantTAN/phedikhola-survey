import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button, Card, H1, Screen, StatusBadge } from "@/src/components/ui";
import {
  getCitizen,
  listServices,
  type LocalCitizen,
  type LocalService,
} from "@/src/db";
export default function CitizenDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [c, setC] = useState<LocalCitizen | null>(null);
  const [services, setServices] = useState<LocalService[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getCitizen(id).then((x) => setC(x ?? null));
      listServices(id).then(setServices);
    }, [id]),
  );
  if (!c)
    return (
      <Screen>
        <Text>Citizen not found.</Text>
      </Screen>
    );
  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#047857", fontWeight: "700" }}>
            {c.public_id || "Pending public ID"}
          </Text>
          <H1>{c.full_name}</H1>
        </View>
        <StatusBadge status={c.sync_status} />
      </View>
      <Card>
        <Text>Gender: {c.gender}</Text>
        <Text>Age: {c.approximate_age ?? "—"}</Text>
        <Text>Phone: {c.phone || "—"}</Text>
        <Text>
          Category: {JSON.parse(c.category_ids || "[]")[0] ? "Assigned" : "—"}
        </Text>
        <Text>Ward count: {JSON.parse(c.ward_ids || "[]").length}</Text>
      </Card>
      <Button
        title="Add service record"
        onPress={() =>
          router.push({
            pathname: "/service/new",
            params: { citizen: c.client_uuid },
          })
        }
      />
      <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 8 }}>
        Service history
      </Text>
      {services.length === 0 && (
        <Text style={{ color: "#64748b" }}>
          No service records on this device.
        </Text>
      )}
      {services.map((s) => (
        <Card key={s.client_uuid}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontWeight: "700" }}>
              {new Date(s.service_date).toLocaleDateString()}
            </Text>
            <StatusBadge status={s.sync_status} />
          </View>
          <Text>
            BP:{" "}
            {s.systolic && s.diastolic ? `${s.systolic}/${s.diastolic}` : "—"} ·
            Pulse: {s.pulse_rate ?? "—"}
          </Text>
          <Text>Temperature: {s.temperature_f ?? "—"} °F</Text>
          <Text style={{ color: "#64748b" }}>
            Conditions: {JSON.parse(s.condition_ids || "[]").length} ·
            Medicines: {JSON.parse(s.medicines || "[]").length}
          </Text>
          {s.sync_error && (
            <Text style={{ color: "#dc2626" }}>{s.sync_error}</Text>
          )}
        </Card>
      ))}
    </Screen>
  );
}
