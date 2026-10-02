"use client";
import { DetailSkeleton } from "@/components/shared/skeletons";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Edit, MapPinned } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ward", id],
    queryFn: () => api<any>(`/master/wards/${id}`),
  });
  const w = data?.data;
  if (isLoading) return <DetailSkeleton />;
  if (error || !w) return <p>Ward not found.</p>;
  return (
    <>
      <PageHeader
        title={w.nameEn}
        description={w.nameNe}
        actions={
          <Button asChild>
            <Link href={`/admin/wards/${w.id}/edit`}>
              <Edit />
              Edit ward
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="text-emerald-600" />
            Ward details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Info l="Code" v={w.code} />
          <Info l="Location / Tole" v={w.locationNameNe || w.locationNameEn} />
          <Info l="Citizen assignments" v={w._count?.citizens} />
          <Info l="Service records" v={w._count?.services} />
          <Info l="Assigned staff" v={w._count?.staff} />
          <Info l="Status" v={w.active ? "Active" : "Archived"} />
        </CardContent>
      </Card>
    </>
  );
}
function Info({ l, v }: { l: string; v: any }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {l}
      </div>
      <div className="mt-1 font-medium">{v ?? "—"}</div>
    </div>
  );
}
