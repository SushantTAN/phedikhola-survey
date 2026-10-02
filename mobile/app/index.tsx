import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { authStore } from "@/src/services/auth";
import { getVersionState } from "@/src/services/version";
export default function Index() {
  const [state, setState] = useState<"loading" | "in" | "out" | "update">(
    "loading",
  );
  useEffect(() => {
    (async () => {
      const token = await authStore.access();
      if (!token) {
        setState("out");
        return;
      }
      const v = await getVersionState();
      if (v.required) {
        setState("update");
        return;
      }
      setState("in");
    })();
  }, []);
  if (state === "loading")
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  if (state === "update") return <Redirect href="/update-required" />;
  return <Redirect href={state === "in" ? "/(tabs)" : "/login"} />;
}
