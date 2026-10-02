import { createClient } from "@supabase/supabase-js";
import { api } from "@/lib/api";
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "dev-anon-key";
const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export async function uploadImage(
  file: File,
  kind: "citizen" | "service",
  ownerId?: string,
) {
  const sign = await api<any>("/storage/signed-upload", {
    method: "POST",
    body: JSON.stringify({
      kind,
      ownerId: ownerId || "new",
      contentType: file.type || "image/webp",
    }),
  });
  const { path, token, bucket, publicUrl } = sign.data;
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || "image/webp",
    });
  if (error) throw error;
  return publicUrl as string;
}
