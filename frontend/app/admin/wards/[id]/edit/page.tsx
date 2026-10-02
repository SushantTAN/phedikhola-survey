"use client";
import { FormSkeleton } from "@/components/shared/skeletons";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { WardForm } from "@/components/forms/ward-form";
import { PageHeader } from "@/components/shared/page-header";
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["ward", id],
    queryFn: () => api<any>(`/master/wards/${id}`),
  });
  if (isLoading) return <FormSkeleton />;
  return (
    <>
      <PageHeader title="Edit ward" description={data?.data?.nameEn} />
      <WardForm mode="edit" id={id} initialData={data?.data} />
    </>
  );
}
