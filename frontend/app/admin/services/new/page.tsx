"use client";
import { useSearchParams } from "next/navigation";
import { ServiceForm } from "@/components/forms/service-form";
import { PageHeader } from "@/components/shared/page-header";
export default function NewServicePage() {
  const p = useSearchParams();
  return (
    <>
      <PageHeader
        title="Add service record"
        description="Enter a municipality health/service visit from the admin panel."
      />
      <ServiceForm
        mode="create"
        defaultCitizenId={p.get("citizenId") || undefined}
      />
    </>
  );
}
