"use client";
import { useNepaliFormat } from "@/lib/use-nepali-format";
import { DetailSkeleton } from "@/components/shared/skeletons";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Edit, UserCog } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const np = useNepaliFormat();
  const { data, isLoading, error } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => api<any>(`/staff/${id}`),
  });
  const u = data?.data;
  if (isLoading) return <DetailSkeleton />;
  if (error || !u) return <p>Staff member not found.</p>;
  return (
    <>
      <PageHeader
        title={u.name}
        description={u.email}
        actions={
          <Button asChild>
            <Link href={`/admin/staff/${u.id}/edit`}>
              <Edit />
              Edit staff
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="text-emerald-600" />
            Staff details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Info l="Email" v={u.email} />
          <Info l="Phone" v={u.phone} />
          <Info l="Employee code" v={u.staffProfile?.employeeCode} />
          <Info l="Assigned ward" v={u.staffProfile?.assignedWard?.nameEn} />
          <Info l="Health post" v={u.staffProfile?.healthPost?.name} />
          <Info l="Citizen entries" v={u.staffProfile?.citizenEntryCount} />
          <Info l="Service entries" v={u.staffProfile?.serviceEntryCount} />
          <Info
            l="Last login"
            v={u.lastLoginAt ? np.dateTime(u.lastLoginAt) : null}
          />
          <Info
            l="Last sync"
            v={u.lastSyncAt ? np.dateTime(u.lastSyncAt) : null}
          />
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
