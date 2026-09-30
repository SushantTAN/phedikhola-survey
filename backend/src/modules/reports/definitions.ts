import { prisma } from "../../lib/prisma.js";
import { AGE_GROUPS, ageGroupOf, countBy, fetchCitizens, fetchServices, isoDate, monthKey } from "./data.js";
import type { FilterDef, ReportDef, ReportResult, Row } from "./types.js";

const select = (key: FilterDef["key"], label: string, options: FilterDef["options"]): FilterDef => ({ key, label, type: "select", options });
const F = {
  dateFrom: (label = "From date"): FilterDef => ({ key: "dateFrom", label, type: "date" }),
  dateTo: (label = "To date"): FilterDef => ({ key: "dateTo", label, type: "date" }),
  ward: select("wardId", "Ward", "wards"),
  gender: select("gender", "Gender", "gender"),
  ageGroup: select("ageGroup", "Age group", "ageGroup"),
  category: select("categoryId", "Citizen category", "categories"),
  condition: select("conditionId", "Health condition", "conditions"),
  medicine: select("medicineId", "Medicine", "medicines"),
  staff: select("staffId", "Staff", "staff"),
  followup: select("followup", "Needs follow-up", "followup"),
  search: (label = "Search citizen (name, ID, phone)"): FilterDef => ({ key: "q", label, type: "text" })
};

const sortDesc = (a: [string, number], b: [string, number]) => b[1] - a[1];
const num = (v: unknown) => (v == null ? 0 : Number(v));
const round2 = (n: number) => Math.round(n * 100) / 100;
const avg = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);
const wardLabel = (w: { nameEn: string; code: string }) => `${w.nameEn} (${w.code})`;
const conditionText = (s: { conditions: Array<{ condition: { nameEn: string } }>; otherHealthProblem: string | null }) =>
  [...s.conditions.map(x => x.condition.nameEn), ...(s.otherHealthProblem ? [`Other: ${s.otherHealthProblem}`] : [])].join(", ");

function bpCategory(sys: number, dia: number) {
  if (sys >= 140 || dia >= 90) return "High (Stage 2)";
  if (sys >= 130 || dia >= 80) return "High (Stage 1)";
  if (sys >= 120 && dia < 80) return "Elevated";
  if (sys < 90 || dia < 60) return "Low";
  return "Normal";
}
const BP_ORDER = ["Low", "Normal", "Elevated", "High (Stage 1)", "High (Stage 2)"];

const genderCols = [
  { key: "female", label: "Female", type: "number" as const },
  { key: "male", label: "Male", type: "number" as const },
  { key: "other", label: "Other", type: "number" as const },
  { key: "total", label: "Total", type: "number" as const }
];

export const reports: ReportDef[] = [
  // ---------------------------------------------------------------- Citizens
  {
    key: "citizen-register", group: "Citizens", title: "Citizen register",
    description: "Full list of registered citizens with demographic details.",
    filters: [F.ward, F.gender, F.ageGroup, F.category, F.dateFrom("Registered from"), F.dateTo("Registered to"), F.search()],
    async run(f): Promise<ReportResult> {
      const citizens = await fetchCitizens(f);
      const rows: Row[] = citizens.map(c => ({
        citizenId: c.publicId, name: c.fullName, age: c.age ?? "", gender: c.gender, phone: c.phone ?? "",
        category: c.categories.map(x => x.category.nameEn).join(", "), wards: c.wards.map(x => x.ward.nameEn).join(", "),
        caste: c.casteGroupCode ?? "", maritalStatus: c.maritalStatusCode ?? "", occupation: c.occupationCode ?? "",
        livingStatus: c.livingStatusCode ?? "",
        foreignEmployment: c.householdForeignEmployment == null ? "" : c.householdForeignEmployment ? "Yes" : "No",
        registeredOn: isoDate(c.createdAt)
      }));
      const gender = countBy(citizens, c => c.gender);
      const ages = countBy(citizens, c => ageGroupOf(c.age));
      return {
        columns: [
          { key: "citizenId", label: "Citizen ID" }, { key: "name", label: "Name" }, { key: "age", label: "Age", type: "number" },
          { key: "gender", label: "Gender" }, { key: "phone", label: "Phone" }, { key: "category", label: "Category" },
          { key: "wards", label: "Wards" }, { key: "caste", label: "Caste group" }, { key: "maritalStatus", label: "Marital status" },
          { key: "occupation", label: "Occupation" }, { key: "livingStatus", label: "Living status" },
          { key: "foreignEmployment", label: "Household foreign employment" }, { key: "registeredOn", label: "Registered on", type: "date" }
        ],
        rows,
        summary: [{ label: "Total citizens", value: citizens.length }],
        charts: [
          { id: "gender", title: "Gender distribution", type: "pie", series: [{ key: "count", label: "Citizens" }], data: [...gender].map(([name, count]) => ({ name, count })) },
          { id: "age", title: "Age groups", type: "bar", series: [{ key: "count", label: "Citizens" }], data: AGE_GROUPS.map(g => ({ name: g.label, count: ages.get(g.value) ?? 0 })) }
        ]
      };
    }
  },
  {
    key: "citizens-by-category", group: "Citizens", title: "Citizens by category",
    description: "Number of citizens in each category, split by gender.",
    filters: [F.ward, F.gender, F.ageGroup, F.dateFrom("Registered from"), F.dateTo("Registered to")],
    async run(f) {
      const citizens = await fetchCitizens(f);
      const map = new Map<string, { female: number; male: number; other: number }>();
      for (const c of citizens) {
        const names = c.categories.length ? c.categories.map(x => x.category.nameEn) : ["Uncategorised"];
        for (const n of names) {
          const e = map.get(n) ?? { female: 0, male: 0, other: 0 };
          if (c.gender === "FEMALE") e.female++; else if (c.gender === "MALE") e.male++; else e.other++;
          map.set(n, e);
        }
      }
      const rows = [...map].map(([category, v]) => ({ category, ...v, total: v.female + v.male + v.other })).sort((a, b) => b.total - a.total);
      return {
        columns: [{ key: "category", label: "Category" }, ...genderCols],
        rows,
        summary: [{ label: "Citizens", value: citizens.length }, { label: "Categories", value: rows.length }],
        charts: [{ id: "cat", title: "Citizens by category and gender", type: "stackedBar",
          series: [{ key: "female", label: "Female" }, { key: "male", label: "Male" }, { key: "other", label: "Other" }],
          data: rows.map(r => ({ name: r.category, female: r.female, male: r.male, other: r.other })) }]
      };
    }
  },
  {
    key: "citizens-by-ward", group: "Citizens", title: "Citizens by ward",
    description: "Number of citizens assigned to each ward, split by gender.",
    filters: [F.ward, F.gender, F.ageGroup, F.category],
    async run(f) {
      const [citizens, wards] = await Promise.all([fetchCitizens(f), prisma.ward.findMany({ orderBy: { sortOrder: "asc" } })]);
      const rows = wards.filter(w => !f.wardId || w.id === f.wardId).map(w => {
        const list = citizens.filter(c => c.wards.some(x => x.wardId === w.id));
        const female = list.filter(c => c.gender === "FEMALE").length;
        const male = list.filter(c => c.gender === "MALE").length;
        return { ward: wardLabel(w), female, male, other: list.length - female - male, total: list.length };
      });
      return {
        columns: [{ key: "ward", label: "Ward" }, ...genderCols],
        rows,
        summary: [{ label: "Citizens", value: citizens.length }],
        charts: [{ id: "ward", title: "Citizens by ward", type: "stackedBar",
          series: [{ key: "female", label: "Female" }, { key: "male", label: "Male" }, { key: "other", label: "Other" }],
          data: rows.map(r => ({ name: r.ward, female: r.female, male: r.male, other: r.other })) }]
      };
    }
  },

  // ---------------------------------------------------------------- Service delivery
  {
    key: "service-register", group: "Service delivery", title: "Service visit register",
    description: "Every service visit with vitals, conditions, medicines and follow-up status.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.staff, F.gender, F.ageGroup, F.condition, F.medicine, F.followup, F.search()],
    async run(f) {
      const services = await fetchServices(f);
      const months = countBy(services, s => monthKey(s.serviceDate));
      return {
        columns: [
          { key: "date", label: "Date", type: "date" }, { key: "citizenId", label: "Citizen ID" }, { key: "citizen", label: "Citizen" },
          { key: "ward", label: "Ward" }, { key: "bp", label: "Blood pressure" }, { key: "pulse", label: "Pulse", type: "number" },
          { key: "temperature", label: "Temp (°F)", type: "number" }, { key: "conditions", label: "Health conditions" },
          { key: "medicines", label: "Medicines" }, { key: "followup", label: "Needs follow-up" }, { key: "staff", label: "Staff" }
        ],
        rows: services.map(s => ({
          date: isoDate(s.serviceDate), citizenId: s.citizen.publicId, citizen: s.citizen.fullName, ward: s.ward.nameEn,
          bp: s.systolic != null && s.diastolic != null ? `${s.systolic}/${s.diastolic}` : "", pulse: s.pulseRate ?? "",
          temperature: s.temperatureF == null ? "" : num(s.temperatureF),
          conditions: conditionText(s),
          medicines: s.medicines.map(m => `${m.medicine?.name ?? m.otherMedicineName} (${num(m.quantity)} ${m.unit})`).join(", "),
          followup: s.needsFollowup ? "Yes" : "No", staff: s.createdBy?.name ?? ""
        })),
        summary: [
          { label: "Visits", value: services.length },
          { label: "Unique citizens", value: new Set(services.map(s => s.citizenId)).size },
          { label: "Need follow-up", value: services.filter(s => s.needsFollowup).length }
        ],
        charts: [{ id: "month", title: "Visits per month", type: "bar", series: [{ key: "count", label: "Visits" }], data: [...months].sort().map(([name, count]) => ({ name, count })) }]
      };
    }
  },
  {
    key: "service-monthly-trend", group: "Service delivery", title: "Monthly service trend",
    description: "Visits and unique citizens served each month.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.staff, F.gender, F.ageGroup],
    async run(f) {
      const services = await fetchServices(f);
      const map = new Map<string, { visits: number; citizens: Set<string>; followups: number }>();
      for (const s of services) {
        const k = monthKey(s.serviceDate);
        const e = map.get(k) ?? { visits: 0, citizens: new Set<string>(), followups: 0 };
        e.visits++; e.citizens.add(s.citizenId); if (s.needsFollowup) e.followups++;
        map.set(k, e);
      }
      const rows = [...map].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, visits: v.visits, citizens: v.citizens.size, followups: v.followups }));
      return {
        columns: [{ key: "month", label: "Month" }, { key: "visits", label: "Visits", type: "number" }, { key: "citizens", label: "Unique citizens", type: "number" }, { key: "followups", label: "Follow-ups needed", type: "number" }],
        rows,
        summary: [{ label: "Visits", value: services.length }],
        charts: [{ id: "trend", title: "Visits and citizens served", type: "line", series: [{ key: "visits", label: "Visits" }, { key: "citizens", label: "Unique citizens" }], data: rows.map(r => ({ name: r.month, visits: r.visits, citizens: r.citizens })) }]
      };
    }
  },
  {
    key: "service-by-ward", group: "Service delivery", title: "Services by ward",
    description: "Visit volume, unique citizens and follow-ups for each ward.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.staff, F.gender, F.ageGroup],
    async run(f) {
      const [services, wards] = await Promise.all([fetchServices(f), prisma.ward.findMany({ orderBy: { sortOrder: "asc" } })]);
      const rows = wards.filter(w => !f.wardId || w.id === f.wardId).map(w => {
        const list = services.filter(s => s.wardId === w.id);
        return { ward: wardLabel(w), visits: list.length, citizens: new Set(list.map(s => s.citizenId)).size, followups: list.filter(s => s.needsFollowup).length };
      });
      return {
        columns: [{ key: "ward", label: "Ward" }, { key: "visits", label: "Visits", type: "number" }, { key: "citizens", label: "Unique citizens", type: "number" }, { key: "followups", label: "Follow-ups needed", type: "number" }],
        rows,
        summary: [{ label: "Visits", value: services.length }],
        charts: [{ id: "ward", title: "Visits by ward", type: "bar", series: [{ key: "visits", label: "Visits" }, { key: "citizens", label: "Unique citizens" }], data: rows.map(r => ({ name: r.ward, visits: r.visits, citizens: r.citizens })) }]
      };
    }
  },
  {
    key: "followup-required", group: "Service delivery", title: "Follow-up required",
    description: "Visits flagged as needing follow-up, most recent first.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.staff, F.condition, F.gender, F.ageGroup, F.search()],
    async run(f) {
      const services = await fetchServices({ ...f, followup: "yes" });
      return {
        columns: [
          { key: "date", label: "Visit date", type: "date" }, { key: "citizenId", label: "Citizen ID" }, { key: "citizen", label: "Citizen" },
          { key: "phone", label: "Phone" }, { key: "ward", label: "Ward" }, { key: "conditions", label: "Health conditions" },
          { key: "notes", label: "Notes" }, { key: "staff", label: "Staff" }
        ],
        rows: services.map(s => ({
          date: isoDate(s.serviceDate), citizenId: s.citizen.publicId, citizen: s.citizen.fullName, phone: s.citizen.phone ?? "", ward: s.ward.nameEn,
          conditions: conditionText(s), notes: s.notes ?? "", staff: s.createdBy?.name ?? ""
        })),
        summary: [{ label: "Follow-ups pending", value: services.length }, { label: "Citizens", value: new Set(services.map(s => s.citizenId)).size }],
        charts: [{ id: "ward", title: "Follow-ups by ward", type: "bar", series: [{ key: "count", label: "Follow-ups" }], data: [...countBy(services, s => s.ward.nameEn)].sort(sortDesc).map(([name, count]) => ({ name, count })) }]
      };
    }
  },

  // ---------------------------------------------------------------- Health
  {
    key: "health-conditions", group: "Health", title: "Health conditions summary",
    description: "How often each health condition was recorded during visits.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.gender, F.ageGroup],
    async run(f) {
      const services = await fetchServices(f);
      const visits = new Map<string, number>();
      const citizens = new Map<string, Set<string>>();
      for (const s of services) for (const c of s.conditions) {
        const n = c.condition.nameEn;
        visits.set(n, (visits.get(n) ?? 0) + 1);
        citizens.set(n, (citizens.get(n) ?? new Set<string>()).add(s.citizenId));
      }
      const entries = [...visits].sort(sortDesc);
      return {
        columns: [{ key: "condition", label: "Health condition" }, { key: "visits", label: "Visits recorded", type: "number" }, { key: "citizens", label: "Unique citizens", type: "number" }, { key: "share", label: "% of visits", type: "number" }],
        rows: entries.map(([condition, count]) => ({ condition, visits: count, citizens: citizens.get(condition)?.size ?? 0, share: services.length ? Math.round((count / services.length) * 1000) / 10 : 0 })),
        summary: [{ label: "Visits analysed", value: services.length }],
        charts: [{ id: "cond", title: "Most common conditions", type: "bar", series: [{ key: "visits", label: "Visits" }], data: entries.slice(0, 12).map(([name, count]) => ({ name, visits: count })) }]
      };
    }
  },
  {
    key: "blood-pressure", group: "Health", title: "Blood pressure classification",
    description: "Visits grouped by blood pressure category, with average readings.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.gender, F.ageGroup],
    async run(f) {
      const services = (await fetchServices(f)).filter(s => s.systolic != null && s.diastolic != null);
      const groups = new Map<string, typeof services>();
      for (const s of services) {
        const k = bpCategory(s.systolic!, s.diastolic!);
        groups.set(k, [...(groups.get(k) ?? []), s]);
      }
      const rows = BP_ORDER.filter(k => groups.has(k)).map(k => {
        const list = groups.get(k)!;
        return { category: k, visits: list.length, citizens: new Set(list.map(s => s.citizenId)).size, avgSystolic: avg(list.map(s => s.systolic!)) ?? "", avgDiastolic: avg(list.map(s => s.diastolic!)) ?? "" };
      });
      return {
        columns: [{ key: "category", label: "Category" }, { key: "visits", label: "Visits", type: "number" }, { key: "citizens", label: "Unique citizens", type: "number" }, { key: "avgSystolic", label: "Avg systolic", type: "number" }, { key: "avgDiastolic", label: "Avg diastolic", type: "number" }],
        rows,
        summary: [
          { label: "Visits with BP", value: services.length },
          { label: "Average BP", value: services.length ? `${avg(services.map(s => s.systolic!))}/${avg(services.map(s => s.diastolic!))}` : "—" }
        ],
        charts: [{ id: "bp", title: "Blood pressure categories", type: "pie", series: [{ key: "visits", label: "Visits" }], data: rows.map(r => ({ name: r.category, visits: r.visits })) }]
      };
    }
  },
  {
    key: "vitals-by-ward", group: "Health", title: "Average vitals by ward",
    description: "Average blood pressure, pulse and temperature per ward.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.gender, F.ageGroup],
    async run(f) {
      const [services, wards] = await Promise.all([fetchServices(f), prisma.ward.findMany({ orderBy: { sortOrder: "asc" } })]);
      const rows = wards.filter(w => !f.wardId || w.id === f.wardId).map(w => {
        const list = services.filter(s => s.wardId === w.id);
        const pick = (fn: (s: (typeof list)[number]) => number | null) => avg(list.flatMap(s => { const v = fn(s); return v == null ? [] : [v]; })) ?? "";
        return {
          ward: wardLabel(w), visits: list.length,
          avgSystolic: pick(s => s.systolic), avgDiastolic: pick(s => s.diastolic),
          avgPulse: pick(s => s.pulseRate), avgTemperature: pick(s => (s.temperatureF == null ? null : num(s.temperatureF)))
        };
      });
      return {
        columns: [{ key: "ward", label: "Ward" }, { key: "visits", label: "Visits", type: "number" }, { key: "avgSystolic", label: "Avg systolic", type: "number" }, { key: "avgDiastolic", label: "Avg diastolic", type: "number" }, { key: "avgPulse", label: "Avg pulse", type: "number" }, { key: "avgTemperature", label: "Avg temp (°F)", type: "number" }],
        rows,
        charts: [{ id: "bp", title: "Average blood pressure by ward", type: "bar", series: [{ key: "systolic", label: "Systolic" }, { key: "diastolic", label: "Diastolic" }], data: rows.map(r => ({ name: r.ward, systolic: Number(r.avgSystolic) || 0, diastolic: Number(r.avgDiastolic) || 0 })) }]
      };
    }
  },

  // ---------------------------------------------------------------- Medicines
  {
    key: "medicine-distribution", group: "Medicines", title: "Medicine distribution",
    description: "Total quantity of each medicine distributed.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.medicine, F.staff, F.gender, F.ageGroup],
    async run(f) {
      const services = await fetchServices(f);
      const map = new Map<string, { medicine: string; unit: string; quantity: number; visits: number; citizens: Set<string> }>();
      for (const s of services) for (const m of s.medicines) {
        if (f.medicineId && m.medicineId !== f.medicineId) continue;
        const name = m.medicine?.name ?? m.otherMedicineName ?? "Other";
        const k = `${name}|${m.unit}`;
        const e = map.get(k) ?? { medicine: name, unit: m.unit, quantity: 0, visits: 0, citizens: new Set<string>() };
        e.quantity += num(m.quantity); e.visits++; e.citizens.add(s.citizenId);
        map.set(k, e);
      }
      const rows = [...map.values()].map(v => ({ medicine: v.medicine, unit: v.unit, quantity: round2(v.quantity), visits: v.visits, citizens: v.citizens.size })).sort((a, b) => b.quantity - a.quantity);
      return {
        columns: [{ key: "medicine", label: "Medicine" }, { key: "unit", label: "Unit" }, { key: "quantity", label: "Total quantity", type: "number" }, { key: "visits", label: "Visits", type: "number" }, { key: "citizens", label: "Unique citizens", type: "number" }],
        rows,
        summary: [{ label: "Medicines", value: rows.length }, { label: "Visits with medicine", value: services.filter(s => s.medicines.length).length }],
        charts: [{ id: "med", title: "Top medicines by quantity", type: "bar", series: [{ key: "quantity", label: "Quantity" }], data: rows.slice(0, 12).map(r => ({ name: r.medicine, quantity: r.quantity })) }]
      };
    }
  },
  {
    key: "medicine-by-ward", group: "Medicines", title: "Medicine by ward",
    description: "Quantity of each medicine distributed in each ward.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.medicine, F.staff],
    async run(f) {
      const services = await fetchServices(f);
      const map = new Map<string, { ward: string; medicine: string; unit: string; quantity: number; visits: number }>();
      for (const s of services) for (const m of s.medicines) {
        if (f.medicineId && m.medicineId !== f.medicineId) continue;
        const name = m.medicine?.name ?? m.otherMedicineName ?? "Other";
        const k = `${s.wardId}|${name}|${m.unit}`;
        const e = map.get(k) ?? { ward: s.ward.nameEn, medicine: name, unit: m.unit, quantity: 0, visits: 0 };
        e.quantity += num(m.quantity); e.visits++;
        map.set(k, e);
      }
      const rows = [...map.values()].map(r => ({ ...r, quantity: round2(r.quantity) })).sort((a, b) => a.ward.localeCompare(b.ward) || b.quantity - a.quantity);
      const byWard = new Map<string, number>();
      for (const r of rows) byWard.set(r.ward, (byWard.get(r.ward) ?? 0) + r.quantity);
      return {
        columns: [{ key: "ward", label: "Ward" }, { key: "medicine", label: "Medicine" }, { key: "unit", label: "Unit" }, { key: "quantity", label: "Total quantity", type: "number" }, { key: "visits", label: "Visits", type: "number" }],
        rows,
        charts: [{ id: "ward", title: "Total quantity distributed by ward", type: "bar", series: [{ key: "quantity", label: "Quantity" }], data: [...byWard].map(([name, quantity]) => ({ name, quantity: round2(quantity) })) }]
      };
    }
  },

  // ---------------------------------------------------------------- Staff
  {
    key: "staff-activity", group: "Staff", title: "Staff activity",
    description: "Citizens registered and service visits entered by each staff member.",
    filters: [F.dateFrom(), F.dateTo(), F.ward, F.staff],
    async run(f) {
      const range = { ...(f.dateFrom ? { gte: f.dateFrom } : {}), ...(f.dateTo ? { lte: f.dateTo } : {}) };
      const hasRange = Boolean(f.dateFrom || f.dateTo);
      const users = await prisma.user.findMany({ where: { role: "STAFF", ...(f.staffId ? { id: f.staffId } : {}) }, orderBy: { name: "asc" } });
      const ids = users.map(u => u.id);
      const [services, citizens] = await Promise.all([
        prisma.citizenServiceRecord.findMany({ where: { deletedAt: null, createdById: { in: ids }, ...(hasRange ? { serviceDate: range } : {}), ...(f.wardId ? { wardId: f.wardId } : {}) }, select: { createdById: true, serviceDate: true, citizenId: true } }),
        prisma.citizen.findMany({ where: { deletedAt: null, createdById: { in: ids }, ...(hasRange ? { createdAt: range } : {}), ...(f.wardId ? { wards: { some: { wardId: f.wardId } } } : {}) }, select: { createdById: true } })
      ]);
      const rows = users.map(u => {
        const mine = services.filter(s => s.createdById === u.id);
        const last = mine.reduce<Date | null>((a, s) => (!a || s.serviceDate > a ? s.serviceDate : a), null);
        return { staff: u.name, email: u.email, status: u.isActive ? "Active" : "Inactive", citizens: citizens.filter(c => c.createdById === u.id).length, visits: mine.length, uniqueCitizens: new Set(mine.map(s => s.citizenId)).size, lastVisit: isoDate(last) };
      });
      return {
        columns: [{ key: "staff", label: "Staff" }, { key: "email", label: "Email" }, { key: "status", label: "Status" }, { key: "citizens", label: "Citizens registered", type: "number" }, { key: "visits", label: "Visits entered", type: "number" }, { key: "uniqueCitizens", label: "Unique citizens served", type: "number" }, { key: "lastVisit", label: "Last visit", type: "date" }],
        rows,
        summary: [{ label: "Staff", value: rows.length }, { label: "Visits entered", value: services.length }],
        charts: [{ id: "staff", title: "Registrations and visits by staff", type: "bar", series: [{ key: "citizens", label: "Citizens registered" }, { key: "visits", label: "Visits entered" }], data: rows.map(r => ({ name: r.staff, citizens: r.citizens, visits: r.visits })) }]
      };
    }
  }
];

export const reportRegistry = new Map(reports.map(r => [r.key, r]));
