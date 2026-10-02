"use client";
import { DetailSkeleton } from "@/components/shared/skeletons";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Edit, Pill } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["medicine", id],
    queryFn: () => api<any>(`/master/medicines/${id}`),
  });
  const m = data?.data;
  if (isLoading) return <DetailSkeleton />;
  if (error || !m) return <p>Medicine not found.</p>;
  return (
    <>
      <PageHeader
        title={m.name}
        description={m.code}
        actions={
          <Button asChild>
            <Link href={`/admin/medicines/${m.id}/edit`}>
              <Edit />
              Edit medicine
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="text-emerald-600" />
            Medicine details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Info l="Generic name" v={m.genericName} />
          <Info l="Strength" v={m.strength} />
          <Info l="Dosage form" v={m.dosageForm} />
          <Info l="Default unit" v={m.defaultUnit?.nameEn} />
          <Info l="Status" v={m.active ? "Active" : "Archived"} />
          <Info l="Description" v={m.description} />
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
      <div className="mt-1 font-medium">{v || "—"}</div>
    </div>
  );
}
