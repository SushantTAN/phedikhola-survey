import { useCallback, useState } from "react";
import { View } from "react-native";
import { Text } from "@/src/components/text";
import { useFocusEffect, router } from "expo-router";
import { Card, Button, Hero, Screen, StatCard, StatusBadge } from "@/src/components/ui";
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
      <Hero
        eyebrow="PHEDIKHOLA FIELD APP"
        title="Data collection"
        subtitle="Offline-first citizen and service entry."
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard value={totalCitizens} label="Citizens on device" icon="people" />
        <StatCard value={services} label="Service records" icon="medkit" />
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
          icon="sync"
          onPress={() => router.push("/(tabs)/sync")}
        />
      </Card>
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 16 }}>Quick actions</Text>
        <Button
          title="Add citizen"
          icon="person-add"
          onPress={() => router.push("/citizens/new")}
        />
        <Button
          variant="outline"
          title="Browse citizens"
          icon="search"
          onPress={() => router.push("/(tabs)/citizens")}
        />
      </Card>
    </Screen>
  );
}
