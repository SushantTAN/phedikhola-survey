import React from "react";
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

// Same typefaces as the web app: Manrope for Latin, Noto Sans Devanagari for Nepali.
const LATIN: Record<string, string> = {
  "400": "Manrope_400Regular",
  "500": "Manrope_500Medium",
  "600": "Manrope_600SemiBold",
  "700": "Manrope_700Bold",
  "800": "Manrope_800ExtraBold",
};
const DEVANAGARI: Record<string, string> = {
  "400": "NotoSansDevanagari_400Regular",
  "500": "NotoSansDevanagari_500Medium",
  "600": "NotoSansDevanagari_600SemiBold",
  "700": "NotoSansDevanagari_700Bold",
  "800": "NotoSansDevanagari_800ExtraBold",
};
const HAS_DEVANAGARI = /[\u0900-\u097F]/;

function weightKey(weight: TextStyle["fontWeight"]) {
  if (weight === "bold") return "700";
  if (weight === undefined || weight === "normal") return "400";
  const n = Math.min(800, Math.max(400, Math.round(Number(weight) / 100) * 100));
  return String(n);
}

function containsDevanagari(node: React.ReactNode): boolean {
  if (typeof node === "string") return HAS_DEVANAGARI.test(node);
  if (Array.isArray(node)) return node.some(containsDevanagari);
  return false;
}

function withFont(style: TextProps["style"], devanagari: boolean) {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  const family = (devanagari ? DEVANAGARI : LATIN)[weightKey(flat.fontWeight)];
  // Custom fonts ship one file per weight, so the weight itself must not be applied again.
  return [style, { fontFamily: family, fontWeight: undefined }];
}

export function Text({ style, children, ...rest }: TextProps) {
  return (
    <RNText {...rest} style={withFont(style, containsDevanagari(children))}>
      {children}
    </RNText>
  );
}

export function TextInput({ style, value, ...rest }: TextInputProps) {
  return (
    <RNTextInput
      {...rest}
      value={value}
      style={withFont(style, containsDevanagari(value))}
    />
  );
}
