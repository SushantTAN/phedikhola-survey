"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Edit, Hospital } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { LocationMap } from "@/components/shared/location-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Info({ l, v }: { l: string; v: any }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{l}</div>
      <div className="mt-1 font-medium">{v ?? "—"}</div>
    </div>
  );
}

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({ queryKey: ["health-post", id], queryFn: () => api<any>(`/health-posts/${id}`) });
  const h = data?.data;
  if (isLoading) return <p>Loading…</p>;
  if (error || !h) return <p>Health post not found.</p>;
  const point = h.latitude != null && h.longitude != null ? { lat: Number(h.latitude), lng: Number(h.longitude) } : null;
  return (
    <>
      <PageHeader
        title={h.name}
        description={h.ward ? `${h.ward.nameNe} / ${h.ward.nameEn}` : undefined}
        actions={<Button asChild><Link href={`/admin/health-posts/${h.id}/edit`}><Edit />Edit health post</Link></Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Hospital className="text-emerald-600" />Details</CardTitle></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Info l="Ward" v={h.ward?.nameEn} />
            <Info l="Status" v={h.active ? "Active" : "Archived"} />
            <Info l="Latitude" v={point?.lat} />
            <Info l="Longitude" v={point?.lng} />
            <Info l="Assigned staff" v={h._count?.staff} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent>
            {point ? <LocationMap value={point} /> : <p className="text-sm text-slate-500">No location set.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
