import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Card, H1, Button, Screen, StatusBadge } from "@/src/components/ui";
import { countCitizens, countServices, syncCounts } from "@/src/db";
import { getVersionState } from "@/src/services/version";

export default function Home() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalCitizens, setTotalCitizens] = useState(0);
  const [services, setServices] = useState(0);
  const [update, setUpdate] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setCounts(await syncCounts());
    setTotalCitizens(await countCitizens());
    setServices(await countServices());
    setUpdate(await getVersionState());
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }
  return (
    <Screen>
      <View>
        <Text
          style={{ color: "#047857", fontWeight: "700", letterSpacing: 1.5 }}
        >
          PHEDIKHOLA FIELD APP
        </Text>
        <H1>Data collection</H1>
        <Text style={{ color: "#64748b" }}>
          Offline-first citizen and service entry.
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>
            {totalCitizens}
          </Text>
          <Text style={{ color: "#64748b" }}>Citizens on device</Text>
        </Card>
        <Card>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>{services}</Text>
          <Text style={{ color: "#64748b" }}>Service records</Text>
        </Card>
      </View>
      {update?.optional && (
        <Card>
          <Text style={{ fontWeight: "700", fontSize: 16 }}>
            App update available
          </Text>
          <Text style={{ color: "#64748b" }}>
            Latest version: {update.info?.latestVersion}. You may continue using
            this version until the configured minimum changes.
          </Text>
        </Card>
      )}
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 16 }}>Sync status</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(counts).map(([s, n]) => (
            <View
              key={s}
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <StatusBadge status={s} />
              <Text>{n}</Text>
            </View>
          ))}
        </View>
        <Button
          title="Open sync center"
          onPress={() => router.push("/(tabs)/sync")}
        />
      </Card>
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 16 }}>Quick actions</Text>
        <Button
          title="Add citizen"
          onPress={() => router.push("/citizens/new")}
        />
        <Button
          variant="outline"
          title="Browse citizens"
          onPress={() => router.push("/(tabs)/citizens")}
        />
      </Card>
    </Screen>
  );
}
