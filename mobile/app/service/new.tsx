import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Button,
  Card,
  H1,
  Input,
  Label,
  MultiSelect,
  Screen,
  SelectField,
} from "@/src/components/ui";
import { getCitizen, listReference, saveService } from "@/src/db";
import { captureLocation, capturePhoto } from "@/src/services/media";
import { uuid } from "@/src/services/uuid";

const months = [
  "Baisakh",
  "Jestha",
  "Ashar",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];
const schema = yup.object({
  wardId: yup.string().required("Ward is required"),
  serviceDate: yup.string().required(),
  nepaliYear: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  nepaliMonth: yup.string().nullable(),
  systolic: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  diastolic: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  pulseRate: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  temperatureF: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  notes: yup.string().nullable(),
  otherHealthProblem: yup.string().nullable(),
});
type Form = yup.InferType<typeof schema>;
type Ref = {
  id: string;
  code: string | null;
  label_en: string | null;
  label_ne: string | null;
  payload: string;
};
type SelectedMed = {
  medicineId?: string;
  label: string;
  quantity: string;
  unit: string;
  otherMedicineName?: string;
};
export default function NewService() {
  const { citizen } = useLocalSearchParams<{ citizen: string }>();
  const [citizenName, setCitizenName] = useState("");
  const [wards, setWards] = useState<Ref[]>([]);
  const [conditions, setConditions] = useState<Ref[]>([]);
  const [medicines, setMedicines] = useState<Ref[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<SelectedMed[]>([]);
  const [medicineChoice, setMedicineChoice] = useState<string | null>(null);
  const [otherMed, setOtherMed] = useState("");
  const [otherQty, setOtherQty] = useState("1");
  const [otherUnit, setOtherUnit] = useState("unit");
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
  } | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: yupResolver(schema),
    defaultValues: {
      wardId: "",
      serviceDate: new Date().toISOString().slice(0, 10),
      nepaliYear: null,
      nepaliMonth: null,
      systolic: null,
      diastolic: null,
      pulseRate: null,
      temperatureF: null,
      notes: "",
      otherHealthProblem: "",
    },
  });
  useEffect(() => {
    if (citizen)
      getCitizen(citizen).then((c) => setCitizenName(c?.full_name ?? ""));
    Promise.all([
      listReference("ward"),
      listReference("condition"),
      listReference("medicine"),
    ]).then(([w, c, m]) => {
      setWards(w);
      setConditions(c);
      setMedicines(m);
    });
  }, [citizen]);
  const medicineOptions = useMemo(
    () =>
      medicines.map((m) => ({
        value: m.id,
        label: m.label_ne || m.label_en || m.code || m.id,
      })),
    [medicines],
  );
  function addMedicine() {
    if (!medicineChoice) return;
    const ref = medicines.find((x) => x.id === medicineChoice);
    if (!ref || selectedMeds.some((x) => x.medicineId === ref.id)) return;
    const p = JSON.parse(ref.payload);
    setSelectedMeds((s) => [
      ...s,
      {
        medicineId: ref.id,
        label: ref.label_ne || ref.label_en || p.name,
        quantity: "1",
        unit: p.defaultUnit?.nameEn || p.dosageForm || "unit",
      },
    ]);
    setMedicineChoice(null);
  }
  async function submit(v: Form) {
    if (!citizen) return;
    try {
      await saveService({
        clientUuid: uuid(),
        citizenClientUuid: citizen,
        wardId: v.wardId,
        serviceDate: new Date(v.serviceDate).toISOString(),
        nepaliYear: v.nepaliYear ?? null,
        nepaliMonth: v.nepaliMonth || null,
        systolic: v.systolic ?? null,
        diastolic: v.diastolic ?? null,
        pulseRate: v.pulseRate ?? null,
        temperatureF: v.temperatureF ?? null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        altitude: location?.altitude ?? null,
        accuracy: location?.accuracy ?? null,
        notes: v.notes || null,
        otherHealthProblem: v.otherHealthProblem || null,
        conditionIds: selectedConditions,
        medicines: selectedMeds.map((m) => ({
          medicineId: m.medicineId || null,
          quantity: Number(m.quantity || 0),
          unit: m.unit,
          otherMedicineName: m.otherMedicineName || null,
        })),
        visitPhotoUri: photo,
      });
      Alert.alert("Saved offline", "Service record is ready to sync.");
      router.back();
    } catch (e) {
      Alert.alert(
        "Unable to save",
        e instanceof Error ? e.message : "Unknown error",
      );
    }
  }
  return (
    <Screen>
      <H1>Service record</H1>
      <Text style={{ color: "#64748b" }}>
        Citizen: {citizenName || citizen}
      </Text>
      <Card>
        <Controller
          control={control}
          name="wardId"
          render={({ field }) => (
            <SelectField
              label="सेवा दिएको वडा *"
              value={field.value || null}
              onChange={field.onChange}
              options={wards.map((w) => ({
                value: w.id,
                label: w.label_ne || w.label_en || w.code || w.id,
              }))}
            />
          )}
        />
        {errors.wardId && (
          <Text style={{ color: "#dc2626" }}>{errors.wardId.message}</Text>
        )}
        <Label>Service date</Label>
        <Controller
          control={control}
          name="serviceDate"
          render={({ field }) => (
            <Input
              value={field.value}
              onChangeText={field.onChange}
              placeholder="YYYY-MM-DD"
            />
          )}
        />
        <Label>Nepali year</Label>
        <Controller
          control={control}
          name="nepaliYear"
          render={({ field }) => (
            <Input
              keyboardType="number-pad"
              value={field.value == null ? "" : String(field.value)}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="nepaliMonth"
          render={({ field }) => (
            <SelectField
              label="Month"
              value={field.value || null}
              onChange={field.onChange}
              options={months.map((x) => ({ value: x, label: x }))}
            />
          )}
        />
      </Card>
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 16 }}>Vital signs</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Label>Systolic</Label>
            <Controller
              control={control}
              name="systolic"
              render={({ field }) => (
                <Input
                  keyboardType="number-pad"
                  value={field.value == null ? "" : String(field.value)}
                  onChangeText={field.onChange}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Diastolic</Label>
            <Controller
              control={control}
              name="diastolic"
              render={({ field }) => (
                <Input
                  keyboardType="number-pad"
                  value={field.value == null ? "" : String(field.value)}
                  onChangeText={field.onChange}
                />
              )}
            />
          </View>
        </View>
        <Label>Pulse rate / minute</Label>
        <Controller
          control={control}
          name="pulseRate"
          render={({ field }) => (
            <Input
              keyboardType="number-pad"
              value={field.value == null ? "" : String(field.value)}
              onChangeText={field.onChange}
            />
          )}
        />
        <Label>Temperature °F</Label>
        <Controller
          control={control}
          name="temperatureF"
          render={({ field }) => (
            <Input
              keyboardType="decimal-pad"
              value={field.value == null ? "" : String(field.value)}
              onChangeText={field.onChange}
            />
          )}
        />
      </Card>
      <Card>
        <MultiSelect
          label="जेष्ठ नागरिकको हालको स्वास्थ्य समस्या"
          items={conditions.map((c) => ({
            id: c.id,
            label: c.label_ne || c.label_en || c.code || c.id,
          }))}
          selected={selectedConditions}
          onToggle={(id) =>
            setSelectedConditions((s) =>
              s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
            )
          }
        />
        <Label>Other health problem</Label>
        <Controller
          control={control}
          name="otherHealthProblem"
          render={({ field }) => (
            <Input
              multiline
              value={field.value || ""}
              onChangeText={field.onChange}
            />
          )}
        />
      </Card>
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 16 }}>
          स्वास्थ्यकर्मी द्वारा दिइएको औषधीहरु
        </Text>
        <SelectField
          label="Select medicine"
          value={medicineChoice}
          onChange={setMedicineChoice}
          options={medicineOptions}
        />
        <Button
          variant="outline"
          title="Add selected medicine"
          onPress={addMedicine}
        />
        {selectedMeds.map((m, i) => (
          <View
            key={`${m.medicineId || m.otherMedicineName}-${i}`}
            style={{
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: "#e2e8f0",
            }}
          >
            <Text style={{ fontWeight: "600" }}>{m.label}</Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
              }}
            >
              <Input
                style={{ flex: 1 }}
                keyboardType="decimal-pad"
                value={m.quantity}
                onChangeText={(v) =>
                  setSelectedMeds((s) =>
                    s.map((x, j) => (j === i ? { ...x, quantity: v } : x)),
                  )
                }
              />
              <Text>{m.unit}</Text>
              <Pressable
                onPress={() =>
                  setSelectedMeds((s) => s.filter((_, j) => j !== i))
                }
              >
                <Text style={{ color: "#dc2626" }}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Text style={{ fontWeight: "600", marginTop: 8 }}>Other medicine</Text>
        <Input
          placeholder="Medicine name"
          value={otherMed}
          onChangeText={setOtherMed}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Input
            style={{ flex: 1 }}
            placeholder="Quantity"
            keyboardType="decimal-pad"
            value={otherQty}
            onChangeText={setOtherQty}
          />
          <Input
            style={{ flex: 1 }}
            placeholder="Unit"
            value={otherUnit}
            onChangeText={setOtherUnit}
          />
        </View>
        <Button
          variant="outline"
          title="Add other medicine"
          onPress={() => {
            if (!otherMed.trim()) return;
            setSelectedMeds((s) => [
              ...s,
              {
                label: otherMed,
                otherMedicineName: otherMed,
                quantity: otherQty || "1",
                unit: otherUnit || "unit",
              },
            ]);
            setOtherMed("");
            setOtherQty("1");
          }}
        />
      </Card>
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 16 }}>
          Photo & service location
        </Text>
        {photo && (
          <Image
            source={{ uri: photo }}
            style={{ height: 220, borderRadius: 12 }}
          />
        )}
        <Button
          variant="outline"
          title="Take service photo"
          onPress={async () => {
            try {
              const p = await capturePhoto();
              if (p) setPhoto(p);
            } catch (e) {
              Alert.alert(
                "Camera",
                e instanceof Error ? e.message : "Unable to capture",
              );
            }
          }}
        />
        {location ? (
          <Text>
            Lat {location.latitude.toFixed(6)}, Long{" "}
            {location.longitude.toFixed(6)} · accuracy{" "}
            {location.accuracy?.toFixed(1) ?? "—"} m
          </Text>
        ) : (
          <Text style={{ color: "#64748b" }}>No location captured yet.</Text>
        )}
        <Button
          variant="outline"
          title="Capture GPS location"
          onPress={async () => {
            try {
              setLocation(await captureLocation());
            } catch (e) {
              Alert.alert(
                "Location",
                e instanceof Error ? e.message : "Unable to capture",
              );
            }
          }}
        />
      </Card>
      <Card>
        <Label>Notes</Label>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <Input
              multiline
              style={{ minHeight: 90 }}
              value={field.value || ""}
              onChangeText={field.onChange}
            />
          )}
        />
      </Card>
      <Button title="Save service offline" onPress={handleSubmit(submit)} />
      <Button variant="outline" title="Cancel" onPress={() => router.back()} />
    </Screen>
  );
}
