import { getMeta } from "../db";
export const CURRENT_APP_VERSION = "1.0.0";
export function compareVersions(a: string, b: string) {
  const pa = a.split(".").map(Number),
    pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0,
      y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}
export async function getVersionState() {
  const raw = await getMeta("app_version");
  if (!raw) return { required: false, optional: false, info: null as any };
  const info = JSON.parse(raw);
  return {
    required: compareVersions(CURRENT_APP_VERSION, info.minimumVersion) < 0,
    optional: compareVersions(CURRENT_APP_VERSION, info.latestVersion) < 0,
    info,
  };
}
