const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type ApiResponse<T> = { success: boolean; data: T; meta?: Record<string, unknown>; message?: string; code?: string };

export function getAccessToken() { return typeof window === "undefined" ? null : localStorage.getItem("accessToken"); }
export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}
export function clearTokens() { localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); }

export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  const body = await response.json().catch(() => ({ success: false, code: "INVALID_RESPONSE", message: response.statusText }));
  if (!response.ok) throw new Error(body.message ?? body.code ?? "Request failed");
  return body;
}

export { API_URL };
