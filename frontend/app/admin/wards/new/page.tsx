import { WardForm } from "@/components/forms/ward-form";
import { PageHeader } from "@/components/shared/page-header";
export default function Page() {
  return (
    <>
      <PageHeader
        title="Add ward"
        description="Create a ward or service-area master record."
      />
      <WardForm />
    </>
  );
}
