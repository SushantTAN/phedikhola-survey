"use client";
import { useNepaliFormat } from "@/lib/use-nepali-format";
import { ReportSkeleton } from "@/components/shared/skeletons";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { downloadReport } from "@/lib/file-transfer";
import { PageHeader } from "@/components/shared/page-header";
import { FormSelect } from "@/components/shared/form-select";
import { ReportChart, type ChartSpec } from "@/components/reports/report-chart";
import { NepaliDatePicker } from "@/components/shared/nepali-date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FilterDef = {
  key: string;
  label: string;
  type: "date" | "select" | "text";
  options?: string;
};
type Choice = { value: string; label: string };
type Catalog = Array<{
  group: string;
  reports: Array<{ key: string; title: string; filters: FilterDef[] }>;
}>;
type ReportData = {
  title: string;
  description: string;
  group: string;
  columns: Array<{ key: string; label: string; type?: string }>;
  rows: Array<Record<string, string | number | boolean | null>>;
  summary: Array<{ label: string; value: string | number }>;
  charts: ChartSpec[];
};
type Meta = { page: number; limit: number; total: number; pages: number };

const ALL = "__all__";

// The citizen register hides the "Other" gender for now (filter option and pie slice).
const HIDE_OTHER_GENDER = new Set(["citizen-register"]);
const isOtherGender = (v: unknown) => String(v).toUpperCase() === "OTHER";
const PAGE_SIZES = [10, 20, 50, 100];

function toQuery(filters: Record<string, string>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
  return p;
}

export default function ReportPage() {
  const { key } = useParams<{ key: string }>();
  const np = useNepaliFormat();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [exporting, setExporting] = useState<"xlsx" | "csv" | null>(null);
  const [exportError, setExportError] = useState("");

  const catalog = useQuery({
    queryKey: ["reports-catalog"],
    queryFn: () => api<Catalog>("/reports"),
  });
  const options = useQuery({
    queryKey: ["reports-filter-options"],
    queryFn: () => api<Record<string, Choice[]>>("/reports/filter-options"),
    staleTime: 60_000,
  });
  const choicesFor = (f: FilterDef) =>
    (options.data?.data[f.options ?? ""] ?? []).filter(
      (o) =>
        !(
          f.key === "gender" &&
          HIDE_OTHER_GENDER.has(key) &&
          isOtherGender(o.value)
        ),
    );
  const filters =
    catalog.data?.data.flatMap((g) => g.reports).find((r) => r.key === key)
      ?.filters ?? [];

  const report = useQuery({
    queryKey: ["report", key, applied, page, limit],
    queryFn: () => {
      const q = toQuery(applied);
      q.set("page", String(page));
      q.set("limit", String(limit));
      return api<ReportData>(`/reports/${key}?${q}`);
    },
    placeholderData: (prev) => prev,
  });
  const d = report.data?.data;
  const meta = report.data?.meta as Meta | undefined;

  // Drops the "Other" slice from the gender pie on reports that hide it.
  const visibleChart = (c: ChartSpec): ChartSpec =>
    HIDE_OTHER_GENDER.has(key) && c.id === "gender"
      ? { ...c, data: c.data.filter((x) => !isOtherGender(x.name)) }
      : c;
  function apply() {
    setPage(1);
    setApplied({ ...draft });
  }
  function reset() {
    setDraft({});
    setApplied({});
    setPage(1);
  }
  async function exportAs(format: "xlsx" | "csv") {
    setExportError("");
    setExporting(format);
    try {
      await downloadReport(key, format, toQuery(applied));
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }
  const setFilter = (k: string, v: string) =>
    setDraft((s) => ({ ...s, [k]: v }));

  return (
    <>
      <Link
        href="/admin/reports"
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-emerald-700"
      >
        <ArrowLeft size={14} /> All reports
      </Link>
      <PageHeader
        title={d?.title ?? "Report"}
        description={d?.description}
        actions={
          <>
            <Button
              variant="outline"
              disabled={!!exporting || !d}
              onClick={() => exportAs("csv")}
            >
              {exporting === "csv" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Download />
              )}
              CSV
            </Button>
            <Button
              disabled={!!exporting || !d}
              onClick={() => exportAs("xlsx")}
            >
              {exporting === "xlsx" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <FileSpreadsheet />
              )}
              Export Excel
            </Button>
          </>
        }
      />
      {exportError && (
        <p className="mb-4 text-sm text-red-600">{exportError}</p>
      )}

      {filters.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                apply();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filters.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    {f.type === "select" ? (
                      <FormSelect
                        placeholder="All"
                        loading={options.isLoading}
                        selected={
                          choicesFor(f).find(
                            (o) => o.value === draft[f.key],
                          ) ?? null
                        }
                        options={[
                          { value: ALL, label: "All" },
                          ...choicesFor(f),
                        ]}
                        onChange={(c) =>
                          setFilter(f.key, c.value === ALL ? "" : c.value)
                        }
                      />
                    ) : f.type === "date" ? (
                      <NepaliDatePicker
                        value={draft[f.key] ?? ""}
                        onChange={(ad) => setFilter(f.key, ad)}
                        clearable
                      />
                    ) : (
                      <Input
                        value={draft[f.key] ?? ""}
                        onChange={(e) => setFilter(f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={reset}
                  disabled={report.isFetching}
                >
                  <RotateCcw />
                  Reset
                </Button>
                <Button type="submit" disabled={report.isFetching}>
                  {report.isFetching ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Search />
                  )}
                  {report.isFetching ? "Loading…" : "Apply filters"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {report.error && (
        <p className="mb-4 text-red-600">{(report.error as Error).message}</p>
      )}
      {report.isLoading && <ReportSkeleton />}

      {d && (
        <div className="relative" aria-busy={report.isFetching}>
          {report.isFetching && (
            <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-white/60 pt-24 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-lg">
                <Loader2 className="animate-spin text-emerald-600" size={16} />
                Updating report…
              </div>
            </div>
          )}
          {d.summary.length > 0 && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {d.summary.map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-slate-500">
                      {s.label}
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight">
                      {s.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {d.charts.length > 0 && (
            <div
              className={`mb-6 grid gap-6 ${d.charts.length > 1 ? "xl:grid-cols-2" : ""}`}
            >
              {d.charts.map((c) => (
                <ReportChart key={c.id} spec={visibleChart(c)} />
              ))}
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {d.columns.map((c) => (
                      <TableHead
                        key={c.key}
                        className={
                          c.type === "number" ? "text-right" : undefined
                        }
                      >
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.rows.length ? (
                    d.rows.map((r, i) => (
                      <TableRow key={i}>
                        {d.columns.map((c) => (
                          <TableCell
                            key={c.key}
                            className={
                              c.type === "number"
                                ? "text-right tabular-nums"
                                : "max-w-72"
                            }
                          >
                            {r[c.key] === "" || r[c.key] == null
                              ? "—"
                              : c.type === "date"
                                ? np.date(String(r[c.key]))
                                : String(r[c.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={d.columns.length}
                        className="py-16 text-center text-slate-500"
                      >
                        No records match the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {meta && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row">
                <div className="flex items-center gap-3">
                  <span>
                    {meta.total
                      ? `${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}`
                      : "0 records"}
                  </span>
                  <label className="flex items-center gap-2">
                    Rows
                    <select
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => setPage(meta.page - 1)}
                  >
                    <ChevronLeft />
                    Previous
                  </Button>
                  <span className="px-1">
                    Page {meta.page} of {meta.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page >= meta.pages}
                    onClick={() => setPage(meta.page + 1)}
                  >
                    Next
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
