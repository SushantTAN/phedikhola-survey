import { HealthPostForm } from "@/components/forms/health-post-form";
import { PageHeader } from "@/components/shared/page-header";

export default function Page() {
  return (
    <>
      <PageHeader title="Add health post" description="Create a health post with its ward and map location." />
      <HealthPostForm />
    </>
  );
}
