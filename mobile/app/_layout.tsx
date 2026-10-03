import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
  NotoSansDevanagari_800ExtraBold,
} from "@expo-google-fonts/noto-sans-devanagari";
import { initDb } from "@/src/db";
export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
    NotoSansDevanagari_800ExtraBold,
  });
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
  // If a font fails to load the app still starts, with the system font.
  if (!dbReady || (!fontsLoaded && !fontError))
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  return (
    <QueryClientProvider client={client}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
