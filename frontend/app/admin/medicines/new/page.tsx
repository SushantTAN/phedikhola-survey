import { MedicineForm } from "@/components/forms/medicine-form";
import { PageHeader } from "@/components/shared/page-header";
export default function Page() {
  return (
    <>
      <PageHeader
        title="Add medicine"
        description="Create a medicine used by the service-entry forms."
      />
      <MedicineForm />
    </>
  );
}
