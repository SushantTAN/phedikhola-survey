import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { initDb } from "@/src/db";
export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  // Screens query SQLite straight away, so nothing renders until the tables exist / are upgraded.
  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((e) => setDbError(e instanceof Error ? e.message : "Unable to open the local database"));
  }, []);
  if (dbError)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>Local database error</Text>
        <Text style={{ color: "#64748b", textAlign: "center" }}>{dbError}</Text>
      </View>
    );
  if (!dbReady)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
