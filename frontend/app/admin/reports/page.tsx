"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileBarChart } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

type Catalog = Array<{
  group: string;
  reports: Array<{ key: string; title: string; description: string; filters: Array<{ key: string; label: string }> }>;
}>;

export default function ReportsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["reports-catalog"], queryFn: () => api<Catalog>("/reports") });

  return (
    <>
      <PageHeader title="Reports" description="Choose a report to filter, analyse with charts, and export. Reports are grouped by topic." />
      {isLoading && <p>Loading reports…</p>}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      <div className="space-y-8">
        {data?.data.map((g) => (
          <section key={g.group}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{g.group}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {g.reports.map((r) => (
                <Link key={r.key} href={`/admin/reports/${r.key}`} className="group">
                  <Card className="h-full transition group-hover:border-emerald-300 group-hover:shadow-md">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><FileBarChart size={20} /></div>
                        <ArrowRight size={16} className="mt-1 text-slate-300 transition group-hover:text-emerald-600" />
                      </div>
                      <h3 className="mt-3 font-semibold text-slate-900">{r.title}</h3>
                      <p className="mt-1 flex-1 text-sm text-slate-500">{r.description}</p>
                      <p className="mt-3 text-xs text-slate-400">Filters: {r.filters.map((f) => f.label).join(" · ")}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
