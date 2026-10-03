import { useLocalSearchParams } from "expo-router";
import { CitizenForm } from "@/src/components/citizen-form";

export default function EditCitizen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CitizenForm mode="edit" citizenId={id} />;
}
