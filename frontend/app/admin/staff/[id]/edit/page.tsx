"use client";
import { FormSkeleton } from "@/components/shared/skeletons";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StaffForm } from "@/components/forms/staff-form";
import { PageHeader } from "@/components/shared/page-header";
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => api<any>(`/staff/${id}`),
  });
  if (isLoading) return <FormSkeleton />;
  return (
    <>
      <PageHeader title="Edit staff" description={data?.data?.email} />
      <StaffForm mode="edit" id={id} initialData={data?.data} />
    </>
  );
}
