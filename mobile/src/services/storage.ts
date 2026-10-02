import { createClient } from "@supabase/supabase-js";
import { api } from "../api/client";
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "dev-anon-key",
  { auth: { persistSession: false, autoRefreshToken: false } },
);
export async function uploadLocalImage(
  uri: string,
  kind: "citizen" | "service",
  ownerId: string,
) {
  const signed = await api<any>("/storage/signed-upload", {
    method: "POST",
    body: JSON.stringify({ kind, ownerId, contentType: "image/webp" }),
  });
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const { path, token, bucket, publicUrl } = signed.data;
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, bytes, { contentType: "image/webp" });
  if (error) throw error;
  return publicUrl as string;
}
