import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { Text } from "@/src/components/text";
import { router, useFocusEffect } from "expo-router";
import { Button, Card, H1, Screen } from "@/src/components/ui";
import { getMeta } from "@/src/db";
import { authStore } from "@/src/services/auth";
import { getLanguage, setLanguage, type Lang } from "@/src/i18n";
function compare(a: string, b: string) {
  const pa = a.split(".").map(Number),
    pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}
export default function Settings() {
  const [lang, setLang] = useState<Lang>(getLanguage());
  const [versionInfo, setVersionInfo] = useState<any>(null);
  useFocusEffect(
    useCallback(() => {
      getMeta("app_version").then((v) =>
        setVersionInfo(v ? JSON.parse(v) : null),
      );
    }, []),
  );
  const current = "1.0.0";
  const mandatory =
    versionInfo && compare(current, versionInfo.minimumVersion) < 0;
  return (
    <Screen>
      <H1>Settings</H1>
      <Card>
        <Text style={{ fontWeight: "700" }}>Language / भाषा</Text>
        <Button
          title={lang === "ne" ? "✓ नेपाली" : "नेपाली"}
          variant="outline"
          onPress={() => {
            setLanguage("ne");
            setLang("ne");
          }}
        />
        <Button
          title={lang === "en" ? "✓ English" : "English"}
          variant="outline"
          onPress={() => {
            setLanguage("en");
            setLang("en");
          }}
        />
      </Card>
      <Card>
        <Text style={{ fontWeight: "700" }}>App version</Text>
        <Text>Installed: {current}</Text>
        <Text>Latest: {versionInfo?.latestVersion ?? "Not checked"}</Text>
        <Text>
          Minimum supported: {versionInfo?.minimumVersion ?? "Not checked"}
        </Text>
        {mandatory && (
          <Text style={{ color: "#dc2626", fontWeight: "700" }}>
            This version is below the server minimum and should be updated
            before normal online operation.
          </Text>
        )}
      </Card>
      <Button
        variant="danger"
        icon="log-out-outline"
        title="Sign out"
        onPress={() =>
          Alert.alert(
            "Sign out",
            "Unsynced records remain on this device. Continue?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: async () => {
                  await authStore.clear();
                  router.replace("/login");
                },
              },
            ],
          )
        }
      />
    </Screen>
  );
}
