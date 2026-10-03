import { useState } from "react";
import { Alert } from "react-native";
import { Text } from "@/src/components/text";
import { router } from "expo-router";
import { api } from "@/src/api/client";
import { Button, Card, H1, Input, Label, Screen } from "@/src/components/ui";
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  async function request() {
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStep(2);
      Alert.alert(
        "OTP requested",
        "If the account exists, an OTP was sent to the staff email.",
      );
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Unable to request OTP",
      );
    }
  }
  async function reset() {
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, password }),
      });
      Alert.alert(
        "Password changed",
        "You can now sign in with the new password.",
      );
      router.replace("/login");
    } catch (e) {
      Alert.alert(
        "Reset failed",
        e instanceof Error ? e.message : "Unable to reset password",
      );
    }
  }
  return (
    <Screen>
      <H1>Forgot password</H1>
      <Text style={{ color: "#64748b" }}>
        This flow requires internet access.
      </Text>
      <Card>
        <Label>Email</Label>
        <Input
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />
        {step === 1 ? (
          <Button title="Send OTP" onPress={request} disabled={!email} />
        ) : (
          <>
            <Label>OTP</Label>
            <Input
              value={otp}
              keyboardType="number-pad"
              onChangeText={setOtp}
            />
            <Label>New password</Label>
            <Input
              value={password}
              secureTextEntry
              onChangeText={setPassword}
            />
            <Button
              title="Reset password"
              onPress={reset}
              disabled={!otp || password.length < 8}
            />
          </>
        )}
      </Card>
      <Button
        variant="outline"
        title="Back to login"
        onPress={() => router.replace("/login")}
      />
    </Screen>
  );
}
