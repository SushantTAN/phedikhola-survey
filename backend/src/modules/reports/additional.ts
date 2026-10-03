import { prisma } from "../../lib/prisma.js";
import {
  CASTE_LABELS,
  countBy,
  fetchCitizens,
  fetchServices,
} from "./data.js";
import { F as BaseFilters, genderCols } from "./definitions.js";
import type { FilterDef, ReportDef } from "./types.js";

const select = (
  key: FilterDef["key"],
  label: string,
  options: FilterDef["options"],
): FilterDef => ({ key, label, type: "select", options });
const F = {
  ...BaseFilters,
  tole: select("toleId", "Tole", "toles"),
  caste: select("casteGroupCode", "Caste / group", "castes"),
};

type GenderCount = { female: number; male: number; other: number };
const emptyGender = (): GenderCount => ({ female: 0, male: 0, other: 0 });
const addGender = (e: GenderCount, gender: string) => {
  if (gender === "FEMALE") e.female++;
  else if (gender === "MALE") e.male++;
  else e.other++;
};
const genderSeries = [
  { key: "female", label: "Female" },
  { key: "male", label: "Male" },
  { key: "other", label: "Other" },
];

/** Counts each citizen once per group, however many times they appear. */
function uniqueCitizensByGroup(
  entries: Array<{ group: string; citizenId: string; gender: string }>,
) {
  const groups = new Map<string, Map<string, string>>();
  for (const e of entries) {
    const m = groups.get(e.group) ?? new Map<string, string>();
    m.set(e.citizenId, e.gender);
    groups.set(e.group, m);
  }
  return [...groups]
    .map(([group, citizens]) => {
      const g = emptyGender();
      for (const gender of citizens.values()) addGender(g, gender);
      return { group, ...g, total: citizens.size };
    })
    .sort((a, b) => b.total - a.total);
}

export const additionalReports: ReportDef[] = [
  {
    key: "staff-services-citizens",
    group: "Staff",
    title: "Staff: service records vs citizens",
    description:
      "For each staff member: citizens registered, service records entered and unique citizens served.",
    filters: [
      F.dateFrom(),
      F.dateTo(),
      F.ward,
      F.staff,
      F.gender,
      F.ageGroup,
      F.category,
      F.caste,
    ],
    async run(f) {
      const [users, services, citizens] = await Promise.all([
        prisma.user.findMany({
          where: { role: "STAFF", ...(f.staffId ? { id: f.staffId } : {}) },
          orderBy: { name: "asc" },
        }),
        fetchServices(f),
        fetchCitizens(f),
      ]);
      const rows = users
        .map((u) => {
          const mine = services.filter((s) => s.createdById === u.id);
          const registered = citizens.filter((c) => c.createdById === u.id);
          const served = new Set(mine.map((s) => s.citizenId)).size;
          return {
            staff: u.name,
            citizensRegistered: registered.length,
            serviceRecords: mine.length,
            citizensServed: served,
            perCitizen: served
              ? Math.round((mine.length / served) * 10) / 10
              : 0,
            followups: mine.filter((s) => s.needsFollowup).length,
          };
        })
        .sort((a, b) => b.serviceRecords - a.serviceRecords);
      return {
        columns: [
          { key: "staff", label: "Staff" },
          {
            key: "citizensRegistered",
            label: "Citizens registered",
            type: "number",
          },
          { key: "serviceRecords", label: "Service records", type: "number" },
          {
            key: "citizensServed",
            label: "Unique citizens served",
            type: "number",
          },
          { key: "perCitizen", label: "Records per citizen", type: "number" },
          { key: "followups", label: "Follow-ups flagged", type: "number" },
        ],
        rows,
        summary: [
          { label: "Staff", value: rows.length },
          {
            label: "Service records",
            value: rows.reduce((a, r) => a + r.serviceRecords, 0),
          },
          {
            label: "Citizens registered",
            value: rows.reduce((a, r) => a + r.citizensRegistered, 0),
          },
        ],
        charts: [
          {
            id: "staff",
            title: "Service records and citizens by staff",
            type: "bar",
            series: [
              { key: "serviceRecords", label: "Service records" },
              { key: "citizensServed", label: "Citizens served" },
              { key: "citizensRegistered", label: "Citizens registered" },
            ],
            data: rows.map((r) => ({
              name: r.staff,
              serviceRecords: r.serviceRecords,
              citizensServed: r.citizensServed,
              citizensRegistered: r.citizensRegistered,
            })),
          },
        ],
      };
    },
  },
  {
    key: "citizens-by-tole",
    group: "Citizens",
    title: "Citizens by tole",
    description:
      "Number of citizens in each tole. Pick a ward to see only that ward's toles.",
    filters: [
      F.ward,
      F.gender,
      F.ageGroup,
      F.category,
      F.caste,
      F.dateFrom("Registered from"),
      F.dateTo("Registered to"),
    ],
    async run(f) {
      const [citizens, toles] = await Promise.all([
        fetchCitizens(f),
        prisma.tole.findMany({
          where: { active: true, ...(f.wardId ? { wardId: f.wardId } : {}) },
          include: { ward: true },
          orderBy: [{ ward: { sortOrder: "asc" } }, { name: "asc" }],
        }),
      ]);
      const rows = toles.map((t) => {
        const g = emptyGender();
        const list = citizens.filter((c) => c.toleId === t.id);
        for (const c of list) addGender(g, c.gender);
        return { ward: t.ward.nameEn, tole: t.name, ...g, total: list.length };
      });
      const knownToles = new Set(toles.map((t) => t.id));
      // With a ward selected, only that ward's toles are listed, so a citizen in another tole is not "unassigned".
      const unassigned = citizens.filter(
        (c) => !c.toleId || (!f.wardId && !knownToles.has(c.toleId)),
      );
      if (unassigned.length) {
        const g = emptyGender();
        for (const c of unassigned) addGender(g, c.gender);
        rows.push({
          ward: "—",
          tole: "No tole assigned",
          ...g,
          total: unassigned.length,
        });
      }
      rows.sort((a, b) => b.total - a.total);
      return {
        columns: [
          { key: "ward", label: "Ward" },
          { key: "tole", label: "Tole" },
          ...genderCols,
        ],
        rows,
        summary: [
          { label: "Citizens", value: citizens.length },
          { label: "Toles", value: toles.length },
          { label: "Without a tole", value: unassigned.length },
        ],
        charts: [
          {
            id: "tole",
            title: "Citizens per tole",
            type: "stackedBar",
            series: genderSeries,
            data: rows.slice(0, 25).map((r) => ({
              name: r.tole,
              female: r.female,
              male: r.male,
              other: r.other,
            })),
          },
        ],
      };
    },
  },
  {
    key: "citizens-by-caste",
    group: "Citizens",
    title: "Citizens by caste / group",
    description:
      "Number of citizens in each caste or ethnic group, split by gender.",
    filters: [
      F.ward,
      F.tole,
      F.gender,
      F.ageGroup,
      F.category,
      F.dateFrom("Registered from"),
      F.dateTo("Registered to"),
    ],
    async run(f) {
      const citizens = await fetchCitizens(f);
      const map = new Map<string, GenderCount & { total: number }>();
      for (const c of citizens) {
        const name = c.casteGroupCode
          ? (CASTE_LABELS[c.casteGroupCode] ?? c.casteGroupCode)
          : "Not recorded";
        const e = map.get(name) ?? { ...emptyGender(), total: 0 };
        addGender(e, c.gender);
        e.total++;
        map.set(name, e);
      }
      const rows = [...map]
        .map(([group, v]) => ({ group, ...v }))
        .sort((a, b) => b.total - a.total);
      return {
        columns: [{ key: "group", label: "Caste / group" }, ...genderCols],
        rows,
        summary: [{ label: "Citizens", value: citizens.length }],
        charts: [
          {
            id: "caste-pie",
            title: "Share by caste / group",
            type: "pie",
            series: [{ key: "total", label: "Citizens" }],
            data: rows.map((r) => ({ name: r.group, total: r.total })),
          },
          {
            id: "caste-bar",
            title: "Caste / group by gender",
            type: "stackedBar",
            series: genderSeries,
            data: rows.map((r) => ({
              name: r.group,
              female: r.female,
              male: r.male,
              other: r.other,
            })),
          },
        ],
      };
    },
  },
  {
    key: "foreign-employment",
    group: "Citizens",
    title: "Household member abroad for employment",
    description:
      "घरको कुनै सदस्य वैदेशिक रोजगारमा गएको — Yes vs No (and not recorded), split by gender.",
    filters: [
      F.ward,
      F.tole,
      F.gender,
      F.ageGroup,
      F.category,
      F.caste,
      F.dateFrom("Registered from"),
      F.dateTo("Registered to"),
    ],
    async run(f) {
      const citizens = await fetchCitizens(f);
      const labels = ["Yes", "No", "Not recorded"] as const;
      const counts = Object.fromEntries(
        labels.map((l) => [l, { ...emptyGender(), total: 0 }]),
      ) as Record<(typeof labels)[number], GenderCount & { total: number }>;
      for (const c of citizens) {
        const label =
          c.householdForeignEmployment == null
            ? "Not recorded"
            : c.householdForeignEmployment
              ? "Yes"
              : "No";
        addGender(counts[label], c.gender);
        counts[label].total++;
      }
      const rows = labels.map((answer) => ({ answer, ...counts[answer] }));
      const answered = counts.Yes.total + counts.No.total;
      return {
        columns: [
          { key: "answer", label: "Member abroad for employment" },
          ...genderCols,
        ],
        rows,
        summary: [
          { label: "Yes", value: counts.Yes.total },
          { label: "No", value: counts.No.total },
          { label: "Not recorded", value: counts["Not recorded"].total },
          {
            label: "% Yes (of answered)",
            value: answered
              ? `${Math.round((counts.Yes.total / answered) * 1000) / 10}%`
              : "—",
          },
        ],
        charts: [
          {
            id: "fe-pie",
            title: "Yes vs No",
            type: "pie",
            series: [{ key: "total", label: "Citizens" }],
            data: rows.map((r) => ({ name: r.answer, total: r.total })),
          },
          {
            id: "fe-bar",
            title: "By gender",
            type: "stackedBar",
            series: genderSeries,
            data: rows.map((r) => ({
              name: r.answer,
              female: r.female,
              male: r.male,
              other: r.other,
            })),
          },
        ],
      };
    },
  },
  {
    key: "conditions-by-citizens",
    group: "Health",
    title: "Health conditions vs citizens",
    description:
      "Number of unique citizens recorded with each health condition, split by gender.",
    filters: [
      F.dateFrom(),
      F.dateTo(),
      F.ward,
      F.tole,
      F.condition,
      F.gender,
      F.ageGroup,
      F.category,
      F.caste,
    ],
    async run(f) {
      const services = await fetchServices(f);
      const entries = services.flatMap((s) =>
        s.conditions
          .filter((c) => !f.conditionId || c.conditionId === f.conditionId)
          .map((c) => ({
            group: c.condition.nameEn,
            citizenId: s.citizenId,
            gender: s.citizen.gender as string,
          })),
      );
      const recorded = countBy(entries, (e) => e.group);
      const rows = uniqueCitizensByGroup(entries).map((r) => ({
        condition: r.group,
        female: r.female,
        male: r.male,
        other: r.other,
        total: r.total,
        recorded: recorded.get(r.group) ?? 0,
      }));
      return {
        columns: [
          { key: "condition", label: "Health condition" },
          ...genderCols.slice(0, 3),
          { key: "total", label: "Citizens", type: "number" },
          { key: "recorded", label: "Times recorded", type: "number" },
        ],
        rows,
        summary: [
          { label: "Conditions", value: rows.length },
          {
            label: "Citizens with a condition",
            value: new Set(entries.map((e) => e.citizenId)).size,
          },
        ],
        charts: [
          {
            id: "cond-citizens",
            title: "Citizens per condition",
            type: "stackedBar",
            series: genderSeries,
            data: rows.slice(0, 15).map((r) => ({
              name: r.condition,
              female: r.female,
              male: r.male,
              other: r.other,
            })),
          },
        ],
      };
    },
  },
  {
    key: "medicines-by-citizens",
    group: "Medicines",
    title: "Medicines vs citizens",
    description:
      "Number of unique citizens who received each medicine, split by gender.",
    filters: [
      F.dateFrom(),
      F.dateTo(),
      F.ward,
      F.tole,
      F.medicine,
      F.gender,
      F.ageGroup,
      F.category,
      F.caste,
    ],
    async run(f) {
      const services = await fetchServices(f);
      const entries = services.flatMap((s) =>
        s.medicines
          .filter((m) => !f.medicineId || m.medicineId === f.medicineId)
          .map((m) => ({
            group: m.medicine
              ? `${m.medicine.name}${m.medicine.strength ? ` ${m.medicine.strength}` : ""}`
              : (m.otherMedicineName ?? "Other"),
            citizenId: s.citizenId,
            gender: s.citizen.gender as string,
          })),
      );
      const given = countBy(entries, (e) => e.group);
      const rows = uniqueCitizensByGroup(entries).map((r) => ({
        medicine: r.group,
        female: r.female,
        male: r.male,
        other: r.other,
        total: r.total,
        given: given.get(r.group) ?? 0,
      }));
      return {
        columns: [
          { key: "medicine", label: "Medicine" },
          ...genderCols.slice(0, 3),
          { key: "total", label: "Citizens", type: "number" },
          { key: "given", label: "Times given", type: "number" },
        ],
        rows,
        summary: [
          { label: "Medicines", value: rows.length },
          {
            label: "Citizens given medicine",
            value: new Set(entries.map((e) => e.citizenId)).size,
          },
        ],
        charts: [
          {
            id: "med-citizens",
            title: "Citizens per medicine",
            type: "stackedBar",
            series: genderSeries,
            data: rows.slice(0, 15).map((r) => ({
              name: r.medicine,
              female: r.female,
              male: r.male,
              other: r.other,
            })),
          },
        ],
      };
    },
  },
];
