"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PageHeader } from "@/components/shared/page-header";
import { ActionMenu } from "@/components/shared/action-menu";
import { TableSkeletonRows } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TolesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const query = useDebouncedValue(search);
  const { data, isLoading } = useQuery({
    queryKey: ["toles", query],
    queryFn: () => api<any[]>(`/toles?q=${encodeURIComponent(query)}`),
  });
  const archive = useMutation({
    mutationFn: (id: string) => api(`/toles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["toles"] });
    },
    onError: (cause) =>
      setError(
        cause instanceof Error ? cause.message : "Unable to archive tole",
      ),
  });
  return (
    <>
      <PageHeader
        title="Toles"
        description="Manage toles, their wards, and health posts."
        actions={
          <Button asChild>
            <Link href="/admin/toles/new">
              <Plus />
              Add tole
            </Link>
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <Input
            className="max-w-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, ward or health post"
            aria-label="Search toles"
          />
        </div>
        {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Health post</TableHead>
              <TableHead>Citizens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={6} />
            ) : data?.data?.length ? (
              data.data.map((tole: any) => (
                <TableRow key={tole.id}>
                  <TableCell className="font-semibold">{tole.name}</TableCell>
                  <TableCell>{tole.ward?.nameEn}</TableCell>
                  <TableCell>{tole.healthPost?.name}</TableCell>
                  <TableCell>{tole._count?.citizens ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={tole.active ? "default" : "secondary"}>
                      {tole.active ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActionMenu
                      onEdit={() => router.push(`/admin/toles/${tole.id}/edit`)}
                      onDelete={() => {
                        if (confirm(`Archive ${tole.name}?`))
                          archive.mutate(tole.id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-slate-500"
                >
                  No toles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
