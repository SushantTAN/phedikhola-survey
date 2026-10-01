"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { HealthPostForm } from "@/components/forms/health-post-form";
import { PageHeader } from "@/components/shared/page-header";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({ queryKey: ["health-post", id], queryFn: () => api<any>(`/health-posts/${id}`) });
  if (isLoading) return <p>Loading…</p>;
  return (
    <>
      <PageHeader title="Edit health post" description={data?.data?.name} />
      <HealthPostForm mode="edit" id={id} initialData={data?.data} />
    </>
  );
}
