import { authStore } from "../services/auth";
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000/api/v1";
export async function api<T>(path: string, init: RequestInit = {}) {
  const token = await authStore.access();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const r = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await r
    .json()
    .catch(() => ({ success: false, message: r.statusText }));
  if (!r.ok) throw new Error(body.message ?? body.code ?? "Request failed");
  return body as { success: boolean; data: T };
}
