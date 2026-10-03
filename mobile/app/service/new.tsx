import { useLocalSearchParams } from "expo-router";
import { ServiceForm } from "@/src/components/service-form";

export default function NewService() {
  const { citizen } = useLocalSearchParams<{ citizen: string }>();
  return <ServiceForm mode="create" citizenId={citizen} />;
}
