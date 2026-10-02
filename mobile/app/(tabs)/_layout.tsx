import { Tabs } from "expo-router";
import { colors } from "@/src/constants/theme";
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="citizens" options={{ title: "Citizens" }} />
      <Tabs.Screen name="sync" options={{ title: "Sync" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
