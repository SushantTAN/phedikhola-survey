import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const widths = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-1/3"];

/** Placeholder rows to drop inside a <TableBody> while a list loads. */
export function TableSkeletonRows({
  cols,
  rows = 8,
}: {
  cols: number;
  rows?: number;
}) {
  return (
    <>
      {range(rows).map((r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {range(cols).map((c) => (
            <TableCell key={c}>
              <Skeleton className={`h-4 ${widths[(r + c) % widths.length]}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

function FieldsSkeleton({ count, cols }: { count: number; cols: string }) {
  return (
    <div className={`grid gap-5 ${cols}`}>
      {range(count).map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Header + two info cards, for detail pages. */
export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        {range(2).map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <FieldsSkeleton count={6} cols="sm:grid-cols-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Header + form card, for edit pages. */
export function FormSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <PageHeaderSkeleton />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
            {range(6).map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {range(count).map((i) => (
        <Card key={i}>
          <CardContent className="flex items-start justify-between p-5">
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-44" />
      </CardHeader>
      <CardContent>
        <div className="flex h-72 items-end gap-3 px-2">
          {[40, 70, 55, 85, 35, 60, 75].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-b-none"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard">
      <StatCardsSkeleton />
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {range(3).map((i) => (
          <ChartSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ReportCardsSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading reports">
      {range(2).map((g) => (
        <section key={g}>
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {range(3).map((i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Summary cards, charts and a table, for a report page. */
export function ReportSkeleton() {
  return (
    <div role="status" aria-label="Loading report">
      <div className="mb-6">
        <StatCardsSkeleton count={3} />
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <Card className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          {range(8).map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Full-screen skeleton of the admin layout while the session is checked. */
export function AdminShellSkeleton() {
  return (
    <div
      className="min-h-screen bg-slate-50 md:grid md:grid-cols-[270px_1fr]"
      role="status"
      aria-label="Loading"
    >
      <aside className="hidden border-r border-slate-800 bg-slate-950 p-4 md:block">
        <Skeleton className="mb-8 h-10 w-40 bg-slate-800" />
        <div className="space-y-2">
          {range(8).map((i) => (
            <Skeleton key={i} className="h-10 w-full bg-slate-800" />
          ))}
        </div>
      </aside>
      <main>
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-8">
          <Skeleton className="h-5 w-56" />
        </div>
        <div className="p-5 md:p-8 xl:p-10">
          <PageHeaderSkeleton />
          <StatCardsSkeleton />
        </div>
      </main>
    </div>
  );
}

export function PublicCitizenSkeleton() {
  return (
    <main
      className="mx-auto max-w-3xl space-y-4 p-6"
      role="status"
      aria-label="Loading citizen information"
    >
      <Skeleton className="h-8 w-56" />
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <FieldsSkeleton count={6} cols="sm:grid-cols-2" />
        </CardContent>
      </Card>
    </main>
  );
}
