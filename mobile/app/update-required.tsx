import { View } from "react-native";
import { Text } from "@/src/components/text";
import { router } from "expo-router";
import { Button, Card, H1, Screen } from "@/src/components/ui";
import { CURRENT_APP_VERSION } from "@/src/services/version";
export default function UpdateRequired() {
  return (
    <Screen>
      <View style={{ height: 40 }} />
      <H1>Update required</H1>
      <Card>
        <Text style={{ fontWeight: "700" }}>
          This app version can no longer perform normal online work.
        </Text>
        <Text style={{ color: "#64748b" }}>
          Installed version: {CURRENT_APP_VERSION}
        </Text>
        <Text style={{ color: "#64748b" }}>
          Install the municipality-provided Android update. Your unsynced SQLite
          data is not deleted by this screen.
        </Text>
        <Button
          variant="outline"
          title="Re-check after updating"
          onPress={() => router.replace("/")}
        />
      </Card>
    </Screen>
  );
}
