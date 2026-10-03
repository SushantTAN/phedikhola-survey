import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import { Text } from "./text";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Button,
  Card,
  CheckRow,
  ErrorText,
  H1,
  Input,
  Label,
  MultiSelect,
  Screen,
  SectionTitle,
  SelectField,
  StatusBanner,
} from "./ui";
import { NepaliDatePicker } from "./nepali-date-picker";
import { MedicinePicker, type PickerMedicine } from "./medicine-picker";
import {
  getCitizen,
  getService,
  listReference,
  saveService,
  updateService,
  type LocalCitizen,
  type ServiceInput,
} from "../db";
import { captureLocation, capturePhoto } from "../services/media";
import { uuid } from "../services/uuid";
import { adDay, adToBs, formatBs, todayAd } from "../lib/nepali-date";
import { bloodPressureStatus, temperatureStatus } from "../lib/health";
import { emptyToNull, NEPALI_MONTH_NAMES, PHONE_ERROR, PHONE_PATTERN } from "../lib/validation";

const number = (message: string) =>
  yup.number().typeError(message).nullable().transform(emptyToNull).min(0, "Cannot be negative");

// Mirrors the web app's service record form (frontend/components/forms/service-form.tsx).
const schema = yup
  .object({
    wardId: yup.string().required("Ward is required"),
    serviceDate: yup.string().required("Service date is required"),
    guardianPhone: yup
      .string()
      .nullable()
      .test("guardian-phone", PHONE_ERROR, (v) => !v || PHONE_PATTERN.test(v)),
    nepaliYear: number("Year must be a number"),
    nepaliMonth: yup.string().nullable(),
    systolic: number("Must be a number"),
    diastolic: number("Must be a number"),
    pulseRate: number("Must be a number"),
    temperatureF: number("Must be a number"),
    latitude: yup
      .string()
      .nullable()
      .test("latitude-range", "Latitude must be between -90 and 90", (v) => !v || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 90)),
    longitude: yup
      .string()
      .nullable()
      .test("longitude-range", "Longitude must be between -180 and 180", (v) => !v || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 180)),
    otherHealthProblem: yup.string().nullable(),
    notes: yup.string().nullable(),
    needsFollowup: yup.boolean().required(),
  })
  .test("complete-location", "Provide both latitude and longitude, or leave both empty", function (values) {
    if (!!values?.latitude !== !!values?.longitude) return this.createError({ path: "latitude" });
    return true;
  });
type Form = yup.InferType<typeof schema>;

type Ref = { id: string; code: string | null; label_en: string | null; label_ne: string | null; payload: string };
type SelectedMed = {
  medicineId?: string;
  otherMedicineName?: string;
  label: string;
  quantity: string;
  unit: string;
};

const blank: Form = {
  wardId: "",
  serviceDate: "",
  guardianPhone: "",
  nepaliYear: null,
  nepaliMonth: "",
  systolic: null,
  diastolic: null,
  pulseRate: null,
  temperatureF: null,
  latitude: "",
  longitude: "",
  otherHealthProblem: "",
  notes: "",
  needsFollowup: false,
};

const bothLabel = (r: Ref) =>
  r.label_ne && r.label_en && r.label_ne !== r.label_en ? `${r.label_ne} / ${r.label_en}` : r.label_ne || r.label_en || r.code || r.id;
const numField = (v: number | null | undefined) => (v == null ? "" : String(v));

function nepaliPartsOf(ad: string) {
  const bs = adToBs(ad);
  return bs ? { year: bs.year, month: NEPALI_MONTH_NAMES[bs.month - 1] ?? "" } : null;
}

export function ServiceForm({
  mode,
  citizenId,
  serviceId,
}: {
  mode: "create" | "edit";
  /** Citizen's local id (client UUID) when adding a record. */
  citizenId?: string;
  /** Service record's local id (client UUID) when editing. */
  serviceId?: string;
}) {
  const [citizen, setCitizen] = useState<LocalCitizen | null>(null);
  const [wards, setWards] = useState<Ref[]>([]);
  const [conditions, setConditions] = useState<Ref[]>([]);
  const [medicineRefs, setMedicineRefs] = useState<Ref[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<SelectedMed[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [gps, setGps] = useState<{ altitude: number | null; accuracy: number | null }>({ altitude: null, accuracy: null });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Form>({ resolver: yupResolver(schema) as any, defaultValues: { ...blank, serviceDate: todayAd() } });

  useEffect(() => {
    (async () => {
      const [w, c, m] = await Promise.all([listReference("ward"), listReference("condition"), listReference("medicine")]);
      setWards(w);
      setConditions(c);
      setMedicineRefs(m);

      if (mode === "edit") {
        const s = serviceId ? await getService(serviceId) : null;
        const cit = s ? await getCitizen(s.citizen_client_uuid) : null;
        if (!s || !cit) {
          setMissing(true);
          setLoading(false);
          return;
        }
        setCitizen(cit);
        reset({
          wardId: s.ward_id,
          serviceDate: adDay(s.service_date),
          guardianPhone: s.guardian_phone ?? "",
          nepaliYear: s.nepali_year,
          nepaliMonth: s.nepali_month ?? "",
          systolic: s.systolic,
          diastolic: s.diastolic,
          pulseRate: s.pulse_rate,
          temperatureF: s.temperature_f,
          latitude: numField(s.latitude),
          longitude: numField(s.longitude),
          otherHealthProblem: s.other_health_problem ?? "",
          notes: s.notes ?? "",
          needsFollowup: Boolean(s.needs_followup),
        });
        setGps({ altitude: s.altitude, accuracy: s.accuracy });
        setSelectedConditions(JSON.parse(s.condition_ids || "[]"));
        setSelectedMeds(
          (JSON.parse(s.medicines || "[]") as any[]).map((x) => {
            const ref = x.medicineId ? m.find((r) => r.id === x.medicineId) : null;
            return {
              medicineId: x.medicineId || undefined,
              otherMedicineName: x.otherMedicineName || undefined,
              label: ref?.label_en || ref?.label_ne || x.otherMedicineName || "Medicine",
              quantity: String(x.quantity ?? "1"),
              unit: x.unit || "unit",
            };
          }),
        );
        setPhoto(s.visit_photo_uri);
      } else {
        const cit = citizenId ? await getCitizen(citizenId) : null;
        if (!cit) {
          setMissing(true);
          setLoading(false);
          return;
        }
        setCitizen(cit);
        const today = todayAd();
        const np = nepaliPartsOf(today);
        const citizenWards: string[] = JSON.parse(cit.ward_ids || "[]");
        reset({
          ...blank,
          serviceDate: today,
          // The guardian number comes from the citizen's profile and can still be changed for this visit.
          guardianPhone: cit.guardian_phone ?? "",
          wardId: citizenWards.length === 1 ? citizenWards[0]! : "",
          nepaliYear: np?.year ?? null,
          nepaliMonth: np?.month ?? "",
        });
      }
      setLoading(false);
    })().catch((e) => {
      setLoading(false);
      Alert.alert("Unable to load", e instanceof Error ? e.message : "Unknown error");
    });
  }, [mode, citizenId, serviceId, reset]);

  const systolic = watch("systolic");
  const diastolic = watch("diastolic");
  const temperature = watch("temperatureF");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const serviceDate = watch("serviceDate");

  const bp = bloodPressureStatus(systolic, diastolic);
  const temp = temperatureStatus(temperature);

  const pickerMedicines: PickerMedicine[] = useMemo(
    () =>
      medicineRefs.map((r) => ({
        id: r.id,
        label: r.label_en || r.label_ne || r.code || r.id,
        unit: JSON.parse(r.payload).defaultUnit?.nameEn || JSON.parse(r.payload).dosageForm || "unit",
      })),
    [medicineRefs],
  );

  function addMedicine(m: PickerMedicine) {
    setSelectedMeds((s) => (s.some((x) => x.medicineId === m.id) ? s : [...s, { medicineId: m.id, label: m.label, quantity: "1", unit: m.unit }]));
  }
  function addOtherMedicine(name: string) {
    setSelectedMeds((s) => [...s, { otherMedicineName: name, label: name, quantity: "1", unit: "unit" }]);
  }

  async function submit(v: Form) {
    if (!citizen) return;
    for (const m of selectedMeds) {
      const q = Number(m.quantity);
      if (!Number.isFinite(q) || q <= 0) {
        Alert.alert("Medicine quantity", `Enter a quantity greater than 0 for ${m.label}.`);
        return;
      }
    }
    setSaving(true);
    try {
      // Records are filtered by Nepali year/month later (e.g. bulk SMS), so always store both.
      const derived = nepaliPartsOf(v.serviceDate);
      const input: ServiceInput = {
        citizenClientUuid: citizen.client_uuid,
        wardId: v.wardId,
        // Stored like the web app does: midnight UTC of the chosen English date.
        serviceDate: new Date(`${v.serviceDate}T00:00:00.000Z`).toISOString(),
        nepaliYear: v.nepaliYear ?? derived?.year ?? null,
        nepaliMonth: v.nepaliMonth || derived?.month || null,
        systolic: v.systolic ?? null,
        diastolic: v.diastolic ?? null,
        pulseRate: v.pulseRate ?? null,
        temperatureF: v.temperatureF ?? null,
        latitude: v.latitude ? Number(v.latitude) : null,
        longitude: v.longitude ? Number(v.longitude) : null,
        altitude: v.latitude ? gps.altitude : null,
        accuracy: v.latitude ? gps.accuracy : null,
        notes: v.notes?.trim() || null,
        otherHealthProblem: v.otherHealthProblem?.trim() || null,
        guardianPhone: v.guardianPhone?.trim() || null,
        needsFollowup: v.needsFollowup,
        conditionIds: selectedConditions,
        medicines: selectedMeds.map((m) => ({
          medicineId: m.medicineId || null,
          quantity: Number(m.quantity),
          unit: m.unit.trim() || "unit",
          otherMedicineName: m.otherMedicineName || null,
        })),
        visitPhotoUri: photo,
      };
      if (mode === "edit" && serviceId) await updateService(serviceId, input);
      else await saveService({ clientUuid: uuid(), ...input });
      Alert.alert("Saved offline", "Service record is ready to sync.");
      router.back();
    } catch (e) {
      Alert.alert("Unable to save", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (missing)
    return (
      <Screen>
        <Text>{mode === "edit" ? "Service record" : "Citizen"} not found on this device.</Text>
        <Button variant="outline" title="Back" onPress={() => router.back()} />
      </Screen>
    );

  return (
    <Screen>
      <H1>{mode === "edit" ? "Edit service record" : "Service record"}</H1>
      <Text style={{ color: "#64748b" }}>Citizen: {citizen ? `${citizen.full_name}${citizen.public_id ? ` · ${citizen.public_id}` : ""}` : "…"}</Text>
      {loading ? (
        <Text style={{ color: "#64748b" }}>Loading…</Text>
      ) : (
        <>
          <Card>
            <SectionTitle hint="Select the service ward and visit date.">Service information</SectionTitle>
            <Controller
              control={control}
              name="wardId"
              render={({ field }) => (
                <SelectField
                  label="सेवा दिएको वडा / Service ward *"
                  value={field.value || null}
                  onChange={field.onChange}
                  options={wards.map((w) => ({ value: w.id, label: bothLabel(w) }))}
                />
              )}
            />
            <ErrorText message={errors.wardId?.message} />

            <Label>Guardian mobile number (optional)</Label>
            <Controller
              control={control}
              name="guardianPhone"
              render={({ field }) => (
                <Input keyboardType="phone-pad" placeholder="98XXXXXXXX" value={field.value || ""} onChangeText={field.onChange} />
              )}
            />
            {mode === "create" && citizen?.guardian_phone ? (
              <Text style={{ fontSize: 12, color: "#64748b" }}>Filled in from the citizen's profile. You can change it for this visit.</Text>
            ) : null}
            <ErrorText message={errors.guardianPhone?.message} />

            <Controller
              control={control}
              name="serviceDate"
              render={({ field }) => (
                <NepaliDatePicker
                  label="Service date *"
                  value={field.value}
                  onChange={(ad) => {
                    if (!ad) return;
                    field.onChange(ad);
                    const np = nepaliPartsOf(ad);
                    if (np) {
                      setValue("nepaliYear", np.year, { shouldDirty: true });
                      setValue("nepaliMonth", np.month, { shouldDirty: true });
                    }
                  }}
                />
              )}
            />
            <ErrorText message={errors.serviceDate?.message} />
            {serviceDate ? <Text style={{ fontSize: 12, color: "#64748b" }}>{formatBs(serviceDate)} · {serviceDate}</Text> : null}

            <Label>Nepali year</Label>
            <Controller
              control={control}
              name="nepaliYear"
              render={({ field }) => (
                <Input keyboardType="number-pad" placeholder="2083" value={numField(field.value)} onChangeText={field.onChange} />
              )}
            />
            <ErrorText message={errors.nepaliYear?.message} />
            <Controller
              control={control}
              name="nepaliMonth"
              render={({ field }) => (
                <SelectField
                  label="Nepali month"
                  value={field.value || null}
                  onChange={field.onChange}
                  options={NEPALI_MONTH_NAMES.map((x) => ({ value: x, label: x }))}
                />
              )}
            />
          </Card>

          <Card>
            <SectionTitle>Vital signs</SectionTitle>
            <Text style={{ fontWeight: "700", color: "#0f172a" }}>Blood pressure (रक्तचाप)</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Label>Upper – Systolic (mmHg)</Label>
                <Controller
                  control={control}
                  name="systolic"
                  render={({ field }) => (
                    <Input keyboardType="number-pad" placeholder="e.g. 120" value={numField(field.value)} onChangeText={field.onChange} />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Lower – Diastolic (mmHg)</Label>
                <Controller
                  control={control}
                  name="diastolic"
                  render={({ field }) => (
                    <Input keyboardType="number-pad" placeholder="e.g. 80" value={numField(field.value)} onChangeText={field.onChange} />
                  )}
                />
              </View>
            </View>
            <ErrorText message={errors.systolic?.message || errors.diastolic?.message} />
            <StatusBanner status={bp} reading={bp && bp !== "invalid" ? `${systolic}/${diastolic}` : undefined} />

            <Label>Pulse rate / minute</Label>
            <Controller
              control={control}
              name="pulseRate"
              render={({ field }) => <Input keyboardType="number-pad" value={numField(field.value)} onChangeText={field.onChange} />}
            />
            <ErrorText message={errors.pulseRate?.message} />

            <Label>Temperature °F</Label>
            <Controller
              control={control}
              name="temperatureF"
              render={({ field }) => <Input keyboardType="decimal-pad" value={numField(field.value)} onChangeText={field.onChange} />}
            />
            <ErrorText message={errors.temperatureF?.message} />
            <StatusBanner
              status={temp}
              reading={temp && temp !== "invalid" ? `${temperature}°F` : undefined}
            />
          </Card>

          <Card>
            <SectionTitle hint="Select all problems observed for this visit.">Health conditions</SectionTitle>
            <MultiSelect
              label="जेष्ठ नागरिकको हालको स्वास्थ्य समस्या"
              items={conditions.map((c) => ({ id: c.id, label: bothLabel(c) }))}
              selected={selectedConditions}
              onToggle={(id) => setSelectedConditions((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
            />
            <Label>Other health problem</Label>
            <Controller
              control={control}
              name="otherHealthProblem"
              render={({ field }) => <Input multiline value={field.value || ""} onChangeText={field.onChange} placeholder="Describe if Other was selected" />}
            />
          </Card>

          <Card>
            <SectionTitle hint="Search for a medicine and tap it to add. Then set the quantity given.">स्वास्थ्यकर्मी द्वारा दिइएको औषधीहरु</SectionTitle>
            <MedicinePicker
              medicines={pickerMedicines}
              selectedIds={selectedMeds.flatMap((m) => (m.medicineId ? [m.medicineId] : []))}
              onAdd={addMedicine}
              onAddOther={addOtherMedicine}
            />
            {selectedMeds.length ? (
              <View style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12 }}>
                {selectedMeds.map((m, i) => (
                  <View
                    key={`${m.medicineId || m.otherMedicineName}-${i}`}
                    style={{ padding: 10, borderBottomWidth: i === selectedMeds.length - 1 ? 0 : 1, borderBottomColor: "#e2e8f0", gap: 6 }}
                  >
                    <Text style={{ fontWeight: "600" }}>{m.label}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Input
                        style={{ flex: 1 }}
                        keyboardType="decimal-pad"
                        placeholder="Quantity"
                        value={m.quantity}
                        onChangeText={(val) => setSelectedMeds((s) => s.map((x, j) => (j === i ? { ...x, quantity: val } : x)))}
                      />
                      <Input
                        style={{ flex: 1 }}
                        placeholder="Unit"
                        value={m.unit}
                        onChangeText={(val) => setSelectedMeds((s) => s.map((x, j) => (j === i ? { ...x, unit: val } : x)))}
                      />
                      <Pressable onPress={() => setSelectedMeds((s) => s.filter((_, j) => j !== i))} hitSlop={8}>
                        <Text style={{ color: "#dc2626", fontWeight: "700" }}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: "#64748b", textAlign: "center", padding: 10 }}>No medicines added yet.</Text>
            )}
          </Card>

          <Card>
            <SectionTitle hint="Capture GPS on the spot, or type both coordinates.">Location & photo</SectionTitle>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Label>Latitude</Label>
                <Controller
                  control={control}
                  name="latitude"
                  render={({ field }) => (
                    <Input
                      keyboardType="numbers-and-punctuation"
                      value={field.value || ""}
                      onChangeText={(t) => {
                        field.onChange(t);
                        setGps({ altitude: null, accuracy: null });
                      }}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Longitude</Label>
                <Controller
                  control={control}
                  name="longitude"
                  render={({ field }) => (
                    <Input
                      keyboardType="numbers-and-punctuation"
                      value={field.value || ""}
                      onChangeText={(t) => {
                        field.onChange(t);
                        setGps({ altitude: null, accuracy: null });
                      }}
                    />
                  )}
                />
              </View>
            </View>
            <ErrorText message={errors.latitude?.message || errors.longitude?.message} />
            {gps.accuracy != null ? (
              <Text style={{ color: "#64748b", fontSize: 12 }}>
                GPS accuracy {gps.accuracy.toFixed(1)} m{gps.altitude != null ? ` · altitude ${gps.altitude.toFixed(0)} m` : ""}
              </Text>
            ) : null}
            <Button
              variant="outline"
              title="Capture GPS location"
              onPress={async () => {
                try {
                  const l = await captureLocation();
                  setValue("latitude", String(Number(l.latitude.toFixed(7))), { shouldValidate: true, shouldDirty: true });
                  setValue("longitude", String(Number(l.longitude.toFixed(7))), { shouldValidate: true, shouldDirty: true });
                  setGps({ altitude: l.altitude, accuracy: l.accuracy });
                } catch (e) {
                  Alert.alert("Location", e instanceof Error ? e.message : "Unable to capture");
                }
              }}
            />
            {latitude || longitude ? (
              <Button
                variant="outline"
                title="Clear location"
                onPress={() => {
                  setValue("latitude", "", { shouldValidate: true });
                  setValue("longitude", "", { shouldValidate: true });
                  setGps({ altitude: null, accuracy: null });
                }}
              />
            ) : null}

            {photo ? <Image source={{ uri: photo }} style={{ height: 220, borderRadius: 12 }} /> : null}
            <Button
              variant="outline"
              title={photo ? "Retake service photo" : "Take service photo"}
              onPress={async () => {
                try {
                  const p = await capturePhoto();
                  if (p) setPhoto(p);
                } catch (e) {
                  Alert.alert("Camera", e instanceof Error ? e.message : "Unable to capture");
                }
              }}
            />
          </Card>

          <Card>
            <SectionTitle>Notes</SectionTitle>
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Input multiline style={{ minHeight: 90 }} value={field.value || ""} onChangeText={field.onChange} placeholder="Additional observations…" />
              )}
            />
            <Controller
              control={control}
              name="needsFollowup"
              render={({ field }) => <CheckRow label="Needs follow-up" value={field.value} onChange={field.onChange} />}
            />
          </Card>

          <Button title={saving ? "Saving…" : mode === "edit" ? "Save changes" : "Save service offline"} disabled={saving} onPress={handleSubmit(submit)} />
          <Button variant="outline" title="Cancel" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
