"use client";
import { useNepaliFormat } from "@/lib/use-nepali-format";
import { FormSkeleton } from "@/components/shared/skeletons";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ServiceForm } from "@/components/forms/service-form";
import { PageHeader } from "@/components/shared/page-header";
export default function EditService() {
  const { id } = useParams<{ id: string }>();
  const np = useNepaliFormat();
  const { data, isLoading, error } = useQuery({
    queryKey: ["service", id],
    queryFn: () => api<any>(`/services/${id}`),
  });
  if (isLoading) return <FormSkeleton />;
  if (error || !data?.data)
    return <p className="text-red-600">Service record not found.</p>;
  return (
    <>
      <PageHeader
        title="Edit service record"
        description={`${data.data.citizen.fullName} · ${np.date(data.data.serviceDate)}`}
      />
      <ServiceForm mode="edit" serviceId={id} initialData={data.data} />
    </>
  );
}
