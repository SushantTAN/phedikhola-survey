import { useLocalSearchParams } from "expo-router";
import { ServiceForm } from "@/src/components/service-form";

export default function EditService() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ServiceForm mode="edit" serviceId={id} />;
}
