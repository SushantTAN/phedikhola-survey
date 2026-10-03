import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Filled icon when the tab is active, outline when it is not.
const tab = (title: string, active: IconName, inactive: IconName) => ({
  title,
  tabBarIcon: ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color} />
  ),
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      }}
    >
      <Tabs.Screen name="index" options={tab("Home", "home", "home-outline")} />
      <Tabs.Screen
        name="citizens"
        options={tab("Citizens", "people", "people-outline")}
      />
      <Tabs.Screen
        name="sync"
        options={tab("Sync", "cloud-upload", "cloud-upload-outline")}
      />
      <Tabs.Screen
        name="settings"
        options={tab("Settings", "settings", "settings-outline")}
      />
    </Tabs>
  );
}
