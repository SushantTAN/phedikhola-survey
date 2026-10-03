"use client";
import { useNepaliFormat } from "@/lib/use-nepali-format";
import { PublicCitizenSkeleton } from "@/components/shared/skeletons";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Printer, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export default function PublicCitizenPage() {
  const { id } = useParams<{ id: string }>();
  const np = useNepaliFormat();
  const params = useSearchParams();
  const dob = params.get("dob") || undefined;
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-citizen", id, dob],
    queryFn: () =>
      api<any>("/public/citizen-lookup", {
        method: "POST",
        body: JSON.stringify({
          publicId: decodeURIComponent(id),
          dateOfBirth: dob,
        }),
      }),
    retry: false,
  });
  const c = data?.data;
  if (isLoading) return <PublicCitizenSkeleton />;
  if (error || !c)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <Card className="max-w-md">
          <CardContent className="p-7 text-center">
            <h1 className="text-xl font-bold">
              Citizen information not available
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {(error as Error)?.message || "Please verify the citizen ID."}
            </p>
            <Button asChild className="mt-5">
              <Link href="/">Back to lookup</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="no-print flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href="/">← Citizen lookup</Link>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
      </div>
      <div className="mt-6 flex items-center gap-4">
        {c.profilePhotoUrl ? (
          <img
            src={c.profilePhotoUrl}
            alt={c.fullName}
            className="h-20 w-20 rounded-2xl object-cover"
          />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <UserRound />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-emerald-700">{c.publicId}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {c.fullName}
          </h1>
          <p className="mt-1 text-slate-500">
            Phedikhola Rural Municipality citizen record
          </p>
        </div>
      </div>
      <Card className="mt-6 print-card">
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <Info l="Gender" v={c.gender} />
          <Info l="Date of birth" v={np.date(c.dateOfBirth)} />
          <Info l="Approx. age" v={c.approximateAge ?? "—"} />
          <Info
            l="Category"
            v={
              c.categories?.[0]?.nameEn ||
              c.categories?.[0]?.category?.nameEn ||
              "—"
            }
          />
          <Info
            l="Ward"
            v={
              c.wards?.map((w: any) => w.nameEn || w.ward?.nameEn).join(", ") ||
              "—"
            }
          />
        </CardContent>
      </Card>
      <Card className="mt-6 print-card">
        <CardHeader>
          <CardTitle>Service history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!c.serviceRecords?.length && (
            <p className="text-sm text-slate-500">No service records found.</p>
          )}
          {c.serviceRecords?.map((s: any) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold">{np.date(s.serviceDate)}</p>
                  <p className="text-sm text-slate-500">
                    {s.ward?.nameEn} · {s.nepaliMonth || ""}{" "}
                    {s.nepaliYear || ""}
                  </p>
                </div>
                <Badge variant="outline">
                  BP{" "}
                  {s.systolic && s.diastolic
                    ? `${s.systolic}/${s.diastolic}`
                    : "—"}{" "}
                  · Pulse {s.pulseRate ?? "—"} · {s.temperatureF ?? "—"} °F
                </Badge>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Info
                  l="Health observations"
                  v={s.conditions?.map((x: any) => x.nameEn).join(", ") || "—"}
                />
                <Info
                  l="Medicines"
                  v={
                    s.medicines
                      ?.map((m: any) => `${m.name} × ${m.quantity} ${m.unit}`)
                      .join(", ") || "—"
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
function Info({ l, v }: { l: string; v: any }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {l}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{v}</p>
    </div>
  );
}
