"use client";
import { DashboardSkeleton } from "@/components/shared/skeletons";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { useRole } from "@/components/role-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ClipboardList,
  UserCog,
  CalendarDays,
  Activity,
  Plus,
  UserPlus,
  BellRing,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
const COLORS = [
  "#059669",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#0f766e",
  "#ec4899",
  "#64748b",
  "#84cc16",
  "#06b6d4",
  "#f97316",
  "#a855f7",
];
export default function DashboardPage() {
  return useRole() === "STAFF" ? <StaffDashboard /> : <AdminDashboard />;
}

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<any>("/dashboard/summary"),
  });
  const d = data?.data;
  const cards = [
    [
      "Total citizens",
      d?.cards?.totalCitizens ?? 0,
      Users,
      "All active citizen profiles",
      "/admin/citizens",
    ],
    [
      "Service records",
      d?.cards?.serviceRecords ?? 0,
      ClipboardList,
      "Recorded municipality visits",
      "/admin/services",
    ],
    [
      "Served this month",
      d?.cards?.citizensServedThisMonth ?? 0,
      CalendarDays,
      "Visits in the current month",
      "/admin/services",
    ],
    [
      "Active staff",
      d?.cards?.activeStaff ?? 0,
      UserCog,
      "Enabled data collectors",
      "/admin/staff",
    ],
  ] as const;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A current overview of citizen coverage, service delivery, medicine distribution and staff activity."
      />
      {isLoading && <DashboardSkeleton />}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value, Icon, help, href]) => (
              <Link
                key={label}
                href={href}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Card className="h-full transition group-hover:border-emerald-300 group-hover:shadow-md">
                  <CardContent className="flex items-start justify-between p-5">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight">
                        {value}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{help}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Icon />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <ChartCard title="Medicine distribution">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.medicines}
                    dataKey="quantity"
                    nameKey="medicine"
                    outerRadius={92}
                    innerRadius={45}
                  >
                    {d.medicines.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Age groups">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.ageGroups}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#059669" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Services by ward">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={d.wards.map((x: any) => ({
                    name: x.ward?.nameEn ?? "Ward",
                    count: x.count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f766e" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </>
  );
}
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={18} className="text-emerald-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">{children}</div>
      </CardContent>
    </Card>
  );
}

function StaffDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-dashboard"],
    queryFn: () => api<any>("/dashboard/my-summary"),
  });
  const d = data?.data;
  const cards = [
    ["Services today", d?.cards?.servicesToday ?? 0, CalendarDays, "Visits you recorded today", "/admin/services"],
    ["Services this month", d?.cards?.servicesThisMonth ?? 0, ClipboardList, "Visits you recorded this month", "/admin/services"],
    ["Citizens registered", d?.cards?.citizensRegistered ?? 0, Users, "Profiles you added", "/admin/citizens"],
    ["Needs follow-up", d?.cards?.followups ?? 0, BellRing, "Your visits flagged for follow-up", "/admin/services"],
  ] as const;
  return (
    <>
      <PageHeader
        title="My dashboard"
        description="A summary of the citizens and service records you have recorded."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/citizens/new">
                <UserPlus />
                New citizen
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/services/new">
                <Plus />
                New service record
              </Link>
            </Button>
          </div>
        }
      />
      {isLoading && <DashboardSkeleton />}
      {error && <p className="text-red-600">{(error as Error).message}</p>}
      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value, Icon, help, href]) => (
              <Link key={label} href={href} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <Card className="h-full transition group-hover:border-emerald-300 group-hover:shadow-md">
                  <CardContent className="flex items-start justify-between p-5">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{label}</p>
                      <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
                      <p className="mt-1 text-xs text-slate-400">{help}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Icon />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={18} className="text-emerald-600" />
                My recent service records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {d.recent.length === 0 ? (
                <p className="text-sm text-slate-500">You have not recorded any services yet.</p>
              ) : (
                <ul className="divide-y">
                  {d.recent.map((r: any) => (
                    <li key={r.id}>
                      <Link href={`/admin/services/${r.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-emerald-700">
                        <span className="min-w-0 truncate font-medium">
                          {r.citizen?.fullName}
                          <span className="ml-2 text-xs font-normal text-slate-400">{r.citizen?.publicId}</span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {r.ward?.nameEn}
                          {" · "}
                          {new Date(r.serviceDate).toLocaleDateString()}
                          {r.needsFollowup && " · follow-up"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
