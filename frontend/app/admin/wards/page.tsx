"use client";
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
export default function WardsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q);
  const { data, isLoading } = useQuery({
    queryKey: ["wards", dq],
    queryFn: () => api<any>(`/master/wards?q=${encodeURIComponent(dq)}`),
  });
  const del = useMutation({
    mutationFn: (id: string) =>
      api(`/master/wards/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wards"] }),
  });
  return (
    <>
      <PageHeader
        title="Ward management"
        description="Manage service wards and location/tole labels used across the system."
        actions={
          <Button asChild>
            <Link href="/admin/wards/new">
              <Plus />
              Add ward
            </Link>
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <TableToolbar
          resource="wards"
          search={q}
          setSearch={setQ}
          searchPlaceholder="Search ward code or name…"
          onImported={() => qc.invalidateQueries({ queryKey: ["wards"] })}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nepali name</TableHead>
              <TableHead>English name</TableHead>
              <TableHead>Location / Tole</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={7} />
            ) : (
              data?.data?.map((w: any) => (
                <TableRow
                  key={w.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/wards/${w.id}`)}
                >
                  <TableCell className="font-semibold">{w.code}</TableCell>
                  <TableCell className="nepali">{w.nameNe}</TableCell>
                  <TableCell>{w.nameEn}</TableCell>
                  <TableCell>
                    {w.locationNameNe || w.locationNameEn || "—"}
                  </TableCell>
                  <TableCell>{w.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={w.active ? "default" : "secondary"}>
                      {w.active ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActionMenu
                      onView={() => router.push(`/admin/wards/${w.id}`)}
                      onEdit={() => router.push(`/admin/wards/${w.id}/edit`)}
                      onDelete={() => {
                        if (confirm(`Archive ${w.nameEn}?`)) del.mutate(w.id);
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
