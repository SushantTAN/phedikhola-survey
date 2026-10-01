"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PageHeader } from "@/components/shared/page-header";
import { ActionMenu } from "@/components/shared/action-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function HealthPostsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q);
  const { data, isLoading } = useQuery({ queryKey: ["health-posts", dq], queryFn: () => api<any[]>(`/health-posts?q=${encodeURIComponent(dq)}`) });
  const del = useMutation({
    mutationFn: (id: string) => api(`/health-posts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["health-posts"] }),
  });

  return (
    <>
      <PageHeader
        title="Health posts"
        description="Health post locations, linked to wards and assignable to staff."
        actions={<Button asChild><Link href="/admin/health-posts/new"><Plus />Add health post</Link></Button>}
      />
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <Input className="max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search health post name…" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Ward</TableHead><TableHead>Location</TableHead>
              <TableHead>Staff</TableHead><TableHead>Status</TableHead><TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-slate-500">Loading…</TableCell></TableRow>
            ) : data?.data.length ? data.data.map((h: any) => (
              <TableRow key={h.id} className="cursor-pointer" onClick={() => router.push(`/admin/health-posts/${h.id}`)}>
                <TableCell className="font-semibold">{h.name}</TableCell>
                <TableCell>{h.ward?.nameEn}</TableCell>
                <TableCell>{h.latitude != null && h.longitude != null ? `${Number(h.latitude).toFixed(5)}, ${Number(h.longitude).toFixed(5)}` : "—"}</TableCell>
                <TableCell>{h._count?.staff ?? 0}</TableCell>
                <TableCell><Badge variant={h.active ? "default" : "secondary"}>{h.active ? "Active" : "Archived"}</Badge></TableCell>
                <TableCell>
                  <ActionMenu
                    onView={() => router.push(`/admin/health-posts/${h.id}`)}
                    onEdit={() => router.push(`/admin/health-posts/${h.id}/edit`)}
                    onDelete={() => { if (confirm(`Archive ${h.name}?`)) del.mutate(h.id); }}
                  />
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={6} className="py-16 text-center text-slate-500">No health posts found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
