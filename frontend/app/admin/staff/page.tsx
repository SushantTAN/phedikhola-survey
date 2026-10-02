"use client";
import { useNepaliFormat } from "@/lib/use-nepali-format";
import { TableSkeletonRows } from "@/components/shared/skeletons";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PageHeader } from "@/components/shared/page-header";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { ActionMenu } from "@/components/shared/action-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default function StaffPage() {
  const router = useRouter();
  const np = useNepaliFormat();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q);
  const { data, isLoading } = useQuery({
    queryKey: ["staff", dq],
    queryFn: () => api<any>(`/staff?q=${encodeURIComponent(dq)}`),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/staff/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
  return (
    <>
      <PageHeader
        title="Staff"
        description="Mobile data collectors, ward assignments and synchronization activity."
        actions={
          <Button asChild>
            <Link href="/admin/staff/new">
              <Plus />
              Add staff
            </Link>
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <TableToolbar
          resource="staff"
          search={q}
          setSearch={setQ}
          searchPlaceholder="Search staff name, email or phone…"
          onImported={() => qc.invalidateQueries({ queryKey: ["staff"] })}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assigned ward</TableHead>
              <TableHead>Health post</TableHead>
              <TableHead>Entries</TableHead>
              <TableHead>Last sync</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={8} />
            ) : (
              data?.data?.map((u: any) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/staff/${u.id}`)}
                >
                  <TableCell className="font-semibold">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {u.staffProfile?.assignedWard?.nameEn || "—"}
                  </TableCell>
                  <TableCell>
                    {u.staffProfile?.healthPost?.name || "—"}
                  </TableCell>
                  <TableCell>
                    {u.staffProfile?.citizenEntryCount || 0} citizens ·{" "}
                    {u.staffProfile?.serviceEntryCount || 0} services
                  </TableCell>
                  <TableCell>{np.dateTime(u.lastSyncAt)}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}>
                      {u.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActionMenu
                      onView={() => router.push(`/admin/staff/${u.id}`)}
                      onEdit={() => router.push(`/admin/staff/${u.id}/edit`)}
                      onDelete={() => {
                        if (confirm(`Disable ${u.name}?`)) del.mutate(u.id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
