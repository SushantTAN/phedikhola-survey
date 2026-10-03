"use client";
import { useNepaliFormat } from "@/lib/use-nepali-format";
import { TableSkeletonRows } from "@/components/shared/skeletons";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useRole } from "@/components/role-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PageHeader } from "@/components/shared/page-header";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { ActionMenu } from "@/components/shared/action-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default function ServicesPage() {
  const router = useRouter();
  const isAdmin = useRole() === "ADMIN";
  const np = useNepaliFormat();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q);
  const { data, isLoading } = useQuery({
    queryKey: ["services", dq],
    queryFn: () => api<any>(`/services?limit=100&q=${encodeURIComponent(dq)}`),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/services/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });
  return (
    <>
      <PageHeader
        title="Service records"
        description="Health and citizen-service visits entered by staff or administrators."
        actions={
          <Button asChild>
            <Link href="/admin/services/new">
              <Plus />
              Add service record
            </Link>
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <TableToolbar
          resource="services"
          search={q}
          setSearch={setQ}
          searchPlaceholder="Search citizen name, ID or phone…"
          onImported={() => qc.invalidateQueries({ queryKey: ["services"] })}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Citizen</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Vitals</TableHead>
              <TableHead>Health problems</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={7} />
            ) : data?.data?.length ? (
              data.data.map((s: any) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/services/${s.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">
                      {np.parts(s.serviceDate).bs}
                    </div>
                    <div className="text-xs text-slate-400">
                      {np.parts(s.serviceDate).ad}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{s.citizen?.fullName}</div>
                    <div className="text-xs text-slate-500">
                      {s.citizen?.publicId}
                    </div>
                  </TableCell>
                  <TableCell>{s.ward?.nameEn}</TableCell>
                  <TableCell>
                    <div>
                      {s.systolic && s.diastolic
                        ? `${s.systolic}/${s.diastolic}`
                        : "BP —"}
                    </div>
                    <div className="text-xs text-slate-500">
                      P {s.pulseRate ?? "—"} · {s.temperatureF ?? "—"}°F
                    </div>
                  </TableCell>
                  <TableCell className="max-w-56">
                    {s.conditions
                      ?.map((x: any) => x.condition.nameEn)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell>{s.createdBy?.name || "—"}</TableCell>
                  <TableCell>
                    <ActionMenu
                      onView={() => router.push(`/admin/services/${s.id}`)}
                      onEdit={() => router.push(`/admin/services/${s.id}/edit`)}
                      onDelete={
                        isAdmin
                          ? () => {
                              if (confirm("Archive this service record?"))
                                del.mutate(s.id);
                            }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-16 text-center text-slate-500"
                >
                  No service records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
