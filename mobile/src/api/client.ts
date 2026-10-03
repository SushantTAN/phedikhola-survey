import { authStore } from "../services/auth";
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000/api/v1";

const DEFAULT_TIMEOUT_MS = 30_000;

type ApiInit = RequestInit & { timeoutMs?: number };

/** fetch with a timeout, so a dead connection fails instead of leaving a sync "in progress" forever. */
async function request(path: string, init: ApiInit, token: string | null) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!(rest.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${API_URL}${path}`, { ...rest, headers, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new Error("The server took too long to respond");
    throw new Error("Cannot reach the server. Check your internet connection.");
  } finally {
    clearTimeout(timer);
  }
}

// One refresh at a time, even when several requests fail together.
let refreshing: Promise<string | null> | null = null;
function refreshAccessToken() {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await authStore.refresh();
      if (!refreshToken) return null;
      const r = await request("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }, null);
      if (!r.ok) return null;
      const body = await r.json().catch(() => null);
      const accessToken = body?.data?.accessToken as string | undefined;
      if (!accessToken) return null;
      await authStore.setAccess(accessToken);
      return accessToken;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function api<T>(path: string, init: ApiInit = {}) {
  const isAuthCall = path.startsWith("/auth/");
  let r = await request(path, init, await authStore.access());
  // The access token only lives for a short time; a field worker may be offline for hours, so renew it silently.
  if (r.status === 401 && !isAuthCall) {
    const fresh = await refreshAccessToken();
    if (fresh) r = await request(path, init, fresh);
  }
  const body = await r
    .json()
    .catch(() => ({ success: false, message: r.statusText }));
  if (!r.ok) {
    if (r.status === 401 && !isAuthCall)
      throw new Error("Your session has expired. Please sign out and sign in again.");
    throw new Error(body.message ?? body.code ?? "Request failed");
  }
  return body as { success: boolean; data: T };
}
