import { Router } from "express";
import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { AGE_GROUPS, CASTE_LABELS } from "./data.js";
import { reportRegistry, reports } from "./registry.js";
import type { ReportDef, ReportFilters } from "./types.js";

export const reportRouter = Router();
reportRouter.use(requireAuth, requireRole("ADMIN"));

const str = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

function parseDate(v: unknown, endOfDay: boolean) {
  const s = str(v);
  if (!s) return undefined;
  const d = new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(d.getTime()))
    throw new HttpError(400, "INVALID_DATE", `Invalid date: ${s}`);
  return d;
}

function parseFilters(
  query: Record<string, unknown>,
  def: ReportDef,
): ReportFilters {
  const allowed = new Set<string>(def.filters.map((f) => f.key));
  const raw: ReportFilters = {
    dateFrom: parseDate(query.dateFrom, false),
    dateTo: parseDate(query.dateTo, true),
    wardId: str(query.wardId),
    gender: str(query.gender),
    ageGroup: str(query.ageGroup),
    categoryId: str(query.categoryId),
    conditionId: str(query.conditionId),
    medicineId: str(query.medicineId),
    staffId: str(query.staffId),
    toleId: str(query.toleId),
    casteGroupCode: str(query.casteGroupCode),
    foreignEmployment:
      query.foreignEmployment === "yes" ||
      query.foreignEmployment === "no" ||
      query.foreignEmployment === "unknown"
        ? query.foreignEmployment
        : undefined,
    followup:
      query.followup === "yes" || query.followup === "no"
        ? query.followup
        : undefined,
    q: str(query.q),
  };
  return Object.fromEntries(
    Object.entries(raw).filter(([k, v]) => v !== undefined && allowed.has(k)),
  ) as ReportFilters;
}

function getReport(key: string) {
  const def = reportRegistry.get(key);
  if (!def) throw new HttpError(404, "REPORT_NOT_FOUND", "Report not found");
  return def;
}

reportRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const groups = new Map<
      string,
      Array<{
        key: string;
        title: string;
        description: string;
        filters: ReportDef["filters"];
      }>
    >();
    for (const r of reports) {
      groups.set(r.group, [
        ...(groups.get(r.group) ?? []),
        {
          key: r.key,
          title: r.title,
          description: r.description,
          filters: r.filters,
        },
      ]);
    }
    res.json({
      success: true,
      data: [...groups].map(([group, items]) => ({ group, reports: items })),
    });
  }),
);

reportRouter.get(
  "/filter-options",
  asyncHandler(async (_req, res) => {
    const [wards, categories, conditions, medicines, staff, toles] =
      await Promise.all(
      [
        prisma.ward.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.citizenCategory.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.healthCondition.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.medicine.findMany({ orderBy: { name: "asc" } }),
        prisma.user.findMany({
          where: { role: "STAFF" },
          orderBy: { name: "asc" },
        }),
        prisma.tole.findMany({
          where: { active: true },
          include: { ward: true },
          orderBy: [{ ward: { sortOrder: "asc" } }, { name: "asc" }],
        }),
      ],
    );
    res.json({
      success: true,
      data: {
        wards: wards.map((w) => ({
          value: w.id,
          label: `${w.nameEn} (${w.code})`,
        })),
        categories: categories.map((c) => ({ value: c.id, label: c.nameEn })),
        conditions: conditions.map((c) => ({ value: c.id, label: c.nameEn })),
        medicines: medicines.map((m) => ({ value: m.id, label: m.name })),
        staff: staff.map((u) => ({ value: u.id, label: u.name })),
        toles: toles.map((t) => ({
          value: t.id,
          label: `${t.ward.nameEn} – ${t.name}`,
        })),
        castes: Object.entries(CASTE_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        foreignEmployment: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "unknown", label: "Not recorded" },
        ],
        gender: [
          { value: "FEMALE", label: "Female" },
          { value: "MALE", label: "Male" },
          { value: "OTHER", label: "Other" },
        ],
        ageGroup: AGE_GROUPS.map((g) => ({ value: g.value, label: g.label })),
        followup: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    });
  }),
);

// Paginated view. Summary and charts are always computed from the full result set.
reportRouter.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const def = getReport(String(req.params.key));
    const result = await def.run(parseFilters(req.query, def));
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit ?? 20) || 20),
    );
    const total = result.rows.length;
    res.json({
      success: true,
      data: {
        key: def.key,
        title: def.title,
        description: def.description,
        group: def.group,
        columns: result.columns,
        summary: result.summary ?? [],
        charts: result.charts ?? [],
        rows: result.rows.slice((page - 1) * limit, page * limit),
      },
      meta: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }),
);

// Full export: all rows, no pagination.
reportRouter.get(
  "/:key/export",
  asyncHandler(async (req, res) => {
    const def = getReport(String(req.params.key));
    const filters = parseFilters(req.query, def);
    const result = await def.run(filters);
    const sheet = XLSX.utils.aoa_to_sheet([
      result.columns.map((c) => c.label),
      ...result.rows.map((r) => result.columns.map((c) => r[c.key] ?? "")),
    ]);
    sheet["!cols"] = result.columns.map((c) => ({
      wch: Math.max(c.label.length + 2, 14),
    }));
    const filename = `${def.key}-${new Date().toISOString().slice(0, 10)}`;
    if (req.query.format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}.csv`,
      );
      res.send("﻿" + XLSX.utils.sheet_to_csv(sheet));
      return;
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Report");
    const applied = Object.entries(filters).map(([k, v]) => [
      def.filters.find((f) => f.key === k)?.label ?? k,
      v instanceof Date ? v.toISOString().slice(0, 10) : String(v),
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Report", def.title],
        ["Generated", new Date().toISOString()],
        ["Rows", result.rows.length],
        ...applied,
      ]),
      "Info",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.xlsx`,
    );
    res.send(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  }),
);
