"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { ToleForm } from "@/components/forms/tole-form";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["tole", id],
    queryFn: () => api<any>(`/toles/${id}`),
  });
  if (isLoading) return <p>Loading tole…</p>;
  if (error || !data?.data)
    return <p className="text-red-600">Tole not found.</p>;
  return (
    <>
      <PageHeader
        title={`Edit ${data.data.name}`}
        description="Update the tole details."
      />
      <ToleForm id={id} initialData={data.data} />
    </>
  );
}
