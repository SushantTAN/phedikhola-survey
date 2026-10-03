import { prisma } from "../../lib/prisma.js";
import type { ReportFilters } from "./types.js";

export const AGE_GROUPS = [
  { value: "under18", label: "Under 18" },
  { value: "18to60", label: "18 to 60" },
  { value: "over60", label: "Over 60" },
  { value: "unknown", label: "Unknown" },
] as const;

export const CASTE_LABELS: Record<string, string> = {
  DALIT: "Dalit",
  BRAHMIN_CHHETRI: "Brahmin / Chhetri",
  JANAJATI: "Janajati",
  MADHESI: "Madhesi",
  MUSLIM: "Muslim",
  OTHER: "Other",
};

export function ageOf(
  c: { dateOfBirth: Date | null; approximateAge: number | null },
  now = new Date(),
) {
  if (c.dateOfBirth) {
    const dob = c.dateOfBirth;
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    if (
      now <
      new Date(
        Date.UTC(now.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()),
      )
    )
      age--;
    return Math.max(0, age);
  }
  return c.approximateAge;
}

export function ageGroupOf(age: number | null | undefined) {
  if (age == null) return "unknown";
  if (age < 18) return "under18";
  return age <= 60 ? "18to60" : "over60";
}

function dateRange(f: ReportFilters) {
  if (!f.dateFrom && !f.dateTo) return undefined;
  return {
    ...(f.dateFrom ? { gte: f.dateFrom } : {}),
    ...(f.dateTo ? { lte: f.dateTo } : {}),
  };
}

const citizenSearch = (q: string) => ({
  OR: [
    { fullName: { contains: q, mode: "insensitive" as const } },
    { publicId: { contains: q, mode: "insensitive" as const } },
    { phone: { contains: q } },
  ],
});

/** Citizen-level conditions shared by citizen reports and (through the citizen relation) service reports. */
function citizenFilters(f: ReportFilters) {
  return {
    ...(f.gender ? { gender: f.gender as any } : {}),
    ...(f.toleId ? { toleId: f.toleId } : {}),
    ...(f.casteGroupCode ? { casteGroupCode: f.casteGroupCode } : {}),
    ...(f.foreignEmployment
      ? {
          householdForeignEmployment:
            f.foreignEmployment === "yes"
              ? true
              : f.foreignEmployment === "no"
                ? false
                : null,
        }
      : {}),
    ...(f.categoryId
      ? { categories: { some: { categoryId: f.categoryId } } }
      : {}),
  };
}

export async function fetchCitizens(f: ReportFilters) {
  const range = dateRange(f);
  const rows = await prisma.citizen.findMany({
    where: {
      deletedAt: null,
      ...citizenFilters(f),
      ...(f.staffId ? { createdById: f.staffId } : {}),
      ...(f.wardId ? { wardId: f.wardId } : {}),
      ...(range ? { createdAt: range } : {}),
      ...(f.q ? citizenSearch(f.q) : {}),
    },
    include: {
      categories: { include: { category: true } },
      ward: true,
    },
    orderBy: { fullName: "asc" },
  });
  return rows
    .map((c) => ({ ...c, age: ageOf(c) }))
    .filter((c) => !f.ageGroup || ageGroupOf(c.age) === f.ageGroup);
}

export async function fetchServices(f: ReportFilters) {
  const range = dateRange(f);
  const rows = await prisma.citizenServiceRecord.findMany({
    where: {
      deletedAt: null,
      ...(range ? { serviceDate: range } : {}),
      ...(f.wardId ? { wardId: f.wardId } : {}),
      ...(f.staffId ? { createdById: f.staffId } : {}),
      ...(f.followup ? { needsFollowup: f.followup === "yes" } : {}),
      ...(f.conditionId
        ? { conditions: { some: { conditionId: f.conditionId } } }
        : {}),
      ...(f.medicineId
        ? { medicines: { some: { medicineId: f.medicineId } } }
        : {}),
      citizen: {
        ...citizenFilters(f),
        ...(f.q ? citizenSearch(f.q) : {}),
      },
    },
    include: {
      citizen: true,
      ward: true,
      createdBy: { select: { id: true, name: true } },
      conditions: { include: { condition: true } },
      medicines: { include: { medicine: true } },
    },
    orderBy: { serviceDate: "desc" },
  });
  return rows
    .map((s) => ({ ...s, citizenAge: ageOf(s.citizen) }))
    .filter((s) => !f.ageGroup || ageGroupOf(s.citizenAge) === f.ageGroup);
}

export const isoDate = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";
export const monthKey = (d: Date) => d.toISOString().slice(0, 7);

export function countBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}
