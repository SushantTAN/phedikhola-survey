import { useEffect, useMemo, useState } from "react";
import { Alert, Image, View } from "react-native";
import { Text } from "./text";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Button,
  Card,
  ErrorText,
  H1,
  Input,
  Label,
  MultiSelect,
  Screen,
  SectionTitle,
  SelectField,
} from "./ui";
import { NepaliDatePicker } from "./nepali-date-picker";
import {
  getCitizen,
  listReference,
  saveCitizen,
  updateCitizen,
  type CitizenInput,
} from "../db";
import { captureLocation, capturePhoto } from "../services/media";
import { uuid } from "../services/uuid";
import { emptyToNull, PHONE_ERROR, PHONE_PATTERN } from "../lib/validation";
import { todayAd } from "../lib/nepali-date";

// Mirrors the web app's citizen form (frontend/components/forms/citizen-form.tsx).
const schema = yup
  .object({
    fullName: yup.string().trim().required("Full name is required"),
    dateOfBirth: yup.string().nullable(),
    approximateAge: yup
      .number()
      .typeError("Age must be a number")
      .nullable()
      .transform(emptyToNull)
      .min(0, "Age cannot be negative")
      .max(130, "Age must be 130 or less"),
    gender: yup.string().oneOf(["FEMALE", "MALE", "OTHER"]).required(),
    phone: yup.string().nullable(),
    guardianPhone: yup
      .string()
      .nullable()
      .test("guardian-phone", PHONE_ERROR, (v) => !v || PHONE_PATTERN.test(v)),
    categoryId: yup.string().nullable(),
    toleId: yup.string().nullable(),
    latitude: yup
      .string()
      .nullable()
      .test(
        "latitude-range",
        "Latitude must be between -90 and 90",
        (v) => !v || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 90),
      ),
    longitude: yup
      .string()
      .nullable()
      .test(
        "longitude-range",
        "Longitude must be between -180 and 180",
        (v) => !v || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 180),
      ),
    casteGroupCode: yup.string().nullable(),
    casteOther: yup.string().nullable(),
    maritalStatusCode: yup.string().nullable(),
    occupationCode: yup.string().nullable(),
    occupationOther: yup.string().nullable(),
    livingStatusCode: yup.string().nullable(),
    householdForeignEmployment: yup.string().nullable(),
  })
  .test(
    "complete-location",
    "Provide both latitude and longitude, or leave both empty",
    function (values) {
      if (!!values?.latitude !== !!values?.longitude)
        return this.createError({ path: "latitude" });
      return true;
    },
  );
type Form = yup.InferType<typeof schema>;

const caste = [
  { value: "DALIT", label: "दलित / Dalit" },
  { value: "BRAHMIN_CHHETRI", label: "ब्राह्मण/क्षेत्री / Brahmin/Chhetri" },
  { value: "JANAJATI", label: "जनजाती / Janajati" },
  { value: "MADHESI", label: "मधेशी / Madhesi" },
  { value: "MUSLIM", label: "मुस्लिम / Muslim" },
  { value: "OTHER", label: "अन्य / Other" },
];
const marital = ["SINGLE", "MARRIED", "DIVORCED", "WIDOW", "WIDOWER", "OTHER"].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase(),
}));
const occupation = [
  { value: "UNEMPLOYED", label: "Unemployed" },
  { value: "EMPLOYED", label: "Employed" },
  { value: "STUDENT", label: "Student" },
  { value: "RETIRED", label: "Retired" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "AGRICULTURE", label: "Agriculture" },
  { value: "OTHER", label: "Other" },
];
const living = [
  { value: "LIVES_ALONE", label: "एकल / Lives alone" },
  { value: "HAS_CAREGIVER", label: "हेरचाहा गर्ने व्यक्ति भएको / Has caregiver" },
];

const empty: Form = {
  fullName: "",
  dateOfBirth: "",
  approximateAge: null,
  gender: "OTHER",
  phone: "",
  guardianPhone: "",
  categoryId: "",
  toleId: "",
  latitude: "",
  longitude: "",
  casteGroupCode: "",
  casteOther: "",
  maritalStatusCode: "",
  occupationCode: "",
  occupationOther: "",
  livingStatusCode: "",
  householdForeignEmployment: "",
};

type Ref = { id: string; code: string | null; label_en: string | null; label_ne: string | null; payload: string };
const bothLabel = (r: Ref) =>
  r.label_ne && r.label_en && r.label_ne !== r.label_en ? `${r.label_ne} / ${r.label_en}` : r.label_ne || r.label_en || r.code || r.id;

export function CitizenForm({ mode, citizenId }: { mode: "create" | "edit"; citizenId?: string }) {
  const [wards, setWards] = useState<Ref[]>([]);
  const [toles, setToles] = useState<Ref[]>([]);
  const [categories, setCategories] = useState<Ref[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(mode === "edit");
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: yupResolver(schema) as any,
    defaultValues: empty,
  });

  useEffect(() => {
    Promise.all([listReference("category"), listReference("ward"), listReference("tole")])
      .then(([c, w, t]) => {
        setCategories(c);
        setWards(w);
        setToles(t);
      })
      .finally(() => setRefLoading(false));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !citizenId) return;
    getCitizen(citizenId)
      .then((c) => {
        if (!c) {
          setMissing(true);
          return;
        }
        reset({
          fullName: c.full_name,
          dateOfBirth: c.date_of_birth ? String(c.date_of_birth).slice(0, 10) : "",
          approximateAge: c.approximate_age,
          gender: (c.gender as Form["gender"]) ?? "OTHER",
          phone: c.phone ?? "",
          guardianPhone: c.guardian_phone ?? "",
          categoryId: JSON.parse(c.category_ids || "[]")[0] ?? "",
          toleId: c.tole_id ?? "",
          latitude: c.latitude == null ? "" : String(c.latitude),
          longitude: c.longitude == null ? "" : String(c.longitude),
          casteGroupCode: c.caste_group_code ?? "",
          casteOther: c.caste_other ?? "",
          maritalStatusCode: c.marital_status_code ?? "",
          occupationCode: c.occupation_code ?? "",
          occupationOther: c.occupation_other ?? "",
          livingStatusCode: c.living_status_code ?? "",
          householdForeignEmployment:
            c.household_foreign_employment == null ? "" : c.household_foreign_employment ? "YES" : "NO",
        });
        setSelectedWards(JSON.parse(c.ward_ids || "[]"));
        setPhoto(c.profile_photo_uri);
      })
      .finally(() => setLoadingRecord(false));
  }, [mode, citizenId, reset]);

  const casteValue = watch("casteGroupCode");
  const occupationValue = watch("occupationCode");
  const toleValue = watch("toleId");
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  const wardName = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of wards) map.set(w.id, w.label_en || w.label_ne || w.id);
    return map;
  }, [wards]);
  const toleOptions = useMemo(
    () =>
      toles
        .filter((t) => selectedWards.includes(JSON.parse(t.payload).wardId))
        .map((t) => ({ value: t.id, label: `${t.label_en} · ${wardName.get(JSON.parse(t.payload).wardId) ?? ""}` })),
    [toles, selectedWards, wardName],
  );
  // A tole must belong to one of the selected wards.
  useEffect(() => {
    if (toleValue && toles.length && !toleOptions.some((o) => o.value === toleValue)) setValue("toleId", "");
  }, [toleValue, toleOptions, toles.length, setValue]);

  async function submit(v: Form) {
    setSaving(true);
    try {
      const input: CitizenInput = {
        fullName: v.fullName.trim(),
        dateOfBirth: v.dateOfBirth || null,
        approximateAge: v.approximateAge ?? null,
        gender: v.gender,
        phone: v.phone?.trim() || null,
        guardianPhone: v.guardianPhone?.trim() || null,
        casteGroupCode: v.casteGroupCode || null,
        casteOther: v.casteGroupCode === "OTHER" ? v.casteOther || null : null,
        maritalStatusCode: v.maritalStatusCode || null,
        occupationCode: v.occupationCode || null,
        occupationOther: v.occupationCode === "OTHER" ? v.occupationOther || null : null,
        livingStatusCode: v.livingStatusCode || null,
        householdForeignEmployment:
          v.householdForeignEmployment ? v.householdForeignEmployment === "YES" : null,
        categoryIds: v.categoryId ? [v.categoryId] : [],
        wardIds: selectedWards,
        toleId: v.toleId || null,
        latitude: v.latitude ? Number(v.latitude) : null,
        longitude: v.longitude ? Number(v.longitude) : null,
        profilePhotoUri: photo,
      };
      if (mode === "edit" && citizenId) await updateCitizen(citizenId, input);
      else await saveCitizen({ clientUuid: uuid(), ...input });
      Alert.alert("Saved offline", "Citizen is stored on this device and ready to sync.");
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
        <Text>Citizen not found on this device.</Text>
        <Button variant="outline" title="Back" onPress={() => router.back()} />
      </Screen>
    );

  return (
    <Screen>
      <H1>{mode === "edit" ? "Edit citizen" : "Add citizen"}</H1>
      <Text style={{ color: "#64748b" }}>
        {mode === "edit"
          ? "Changes are saved on this device and uploaded at the next sync."
          : "All required profile fields can be entered offline. The permanent public ID is assigned during sync."}
      </Text>
      {loadingRecord ? (
        <Text style={{ color: "#64748b" }}>Loading…</Text>
      ) : (
        <>
          <Card>
            <SectionTitle hint="Identity and core demographic information.">Citizen profile</SectionTitle>
            <Label>जेष्ठ नागरिकको नाम / Full name *</Label>
            <Controller
              control={control}
              name="fullName"
              render={({ field }) => <Input value={field.value} onChangeText={field.onChange} placeholder="Full name" />}
            />
            <ErrorText message={errors.fullName?.message} />

            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field }) => (
                <NepaliDatePicker
                  label="Date of birth"
                  value={field.value}
                  onChange={field.onChange}
                  max={todayAd()}
                  defaultYearsAgo={60}
                  clearable
                />
              )}
            />

            <Label>उमेर / Approximate age</Label>
            <Controller
              control={control}
              name="approximateAge"
              render={({ field }) => (
                <Input
                  keyboardType="number-pad"
                  value={field.value == null ? "" : String(field.value)}
                  onChangeText={field.onChange}
                />
              )}
            />
            <ErrorText message={errors.approximateAge?.message} />

            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <SelectField
                  label="लिङ्ग / Gender *"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "FEMALE", label: "महिला / Female" },
                    { value: "MALE", label: "पुरुष / Male" },
                    { value: "OTHER", label: "अन्य / Other" },
                  ]}
                />
              )}
            />

            <Label>फोन नं. / Phone</Label>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input keyboardType="phone-pad" placeholder="98XXXXXXXX" value={field.value || ""} onChangeText={field.onChange} />
              )}
            />

            <Label>Guardian mobile number (optional)</Label>
            <Controller
              control={control}
              name="guardianPhone"
              render={({ field }) => (
                <Input keyboardType="phone-pad" placeholder="98XXXXXXXX" value={field.value || ""} onChangeText={field.onChange} />
              )}
            />
            <ErrorText message={errors.guardianPhone?.message} />
          </Card>

          <Card>
            <SectionTitle>Category, ward and tole</SectionTitle>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <SelectField
                  label="Citizen category"
                  loading={refLoading}
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="Select category"
                  clearLabel="No category"
                  options={categories.map((r) => ({ value: r.id, label: bothLabel(r) }))}
                />
              )}
            />
            <MultiSelect
              label="Ward(s)"
              loading={refLoading}
              items={wards.map((r) => {
                const loc = JSON.parse(r.payload).locationNameNe;
                return { id: r.id, label: `${bothLabel(r)}${loc ? ` · ${loc}` : ""}` };
              })}
              selected={selectedWards}
              onToggle={(id) =>
                setSelectedWards((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
              }
            />
            <Controller
              control={control}
              name="toleId"
              render={({ field }) => (
                <SelectField
                  label="Tole"
                  loading={refLoading}
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder={selectedWards.length ? "Select tole" : "Select a ward first"}
                  clearLabel="No tole"
                  options={toleOptions}
                />
              )}
            />
          </Card>

          <Card>
            <SectionTitle hint="Optional citizen location. Capture it with GPS or type both coordinates.">Location</SectionTitle>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Label>Latitude</Label>
                <Controller
                  control={control}
                  name="latitude"
                  render={({ field }) => (
                    <Input keyboardType="numbers-and-punctuation" value={field.value || ""} onChangeText={field.onChange} placeholder="28.0123" />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Longitude</Label>
                <Controller
                  control={control}
                  name="longitude"
                  render={({ field }) => (
                    <Input keyboardType="numbers-and-punctuation" value={field.value || ""} onChangeText={field.onChange} placeholder="83.8123" />
                  )}
                />
              </View>
            </View>
            <ErrorText message={errors.latitude?.message || errors.longitude?.message} />
            <Button
              variant="outline"
              title="Capture GPS location"
              onPress={async () => {
                try {
                  const l = await captureLocation();
                  setValue("latitude", String(Number(l.latitude.toFixed(7))), { shouldValidate: true, shouldDirty: true });
                  setValue("longitude", String(Number(l.longitude.toFixed(7))), { shouldValidate: true, shouldDirty: true });
                } catch (e) {
                  Alert.alert("Location", e instanceof Error ? e.message : "Unable to capture");
                }
              }}
            />
            {(latitude || longitude) ? (
              <Button
                variant="outline"
                title="Clear location"
                onPress={() => {
                  setValue("latitude", "", { shouldValidate: true });
                  setValue("longitude", "", { shouldValidate: true });
                }}
              />
            ) : null}
          </Card>

          <Card>
            <SectionTitle hint="Fields included in the municipality survey specification.">Demographic & household details</SectionTitle>
            <Controller
              control={control}
              name="casteGroupCode"
              render={({ field }) => (
                <SelectField label="जात/समुह / Caste or group" value={field.value || null} onChange={field.onChange} clearLabel="Not set" options={caste} />
              )}
            />
            {casteValue === "OTHER" && (
              <>
                <Label>Other caste/group</Label>
                <Controller
                  control={control}
                  name="casteOther"
                  render={({ field }) => <Input value={field.value || ""} onChangeText={field.onChange} />}
                />
              </>
            )}
            <Controller
              control={control}
              name="maritalStatusCode"
              render={({ field }) => (
                <SelectField label="Marital status" value={field.value || null} onChange={field.onChange} clearLabel="Not set" options={marital} />
              )}
            />
            <Controller
              control={control}
              name="occupationCode"
              render={({ field }) => (
                <SelectField label="Occupation" value={field.value || null} onChange={field.onChange} clearLabel="Not set" options={occupation} />
              )}
            />
            {occupationValue === "OTHER" && (
              <>
                <Label>Other occupation</Label>
                <Controller
                  control={control}
                  name="occupationOther"
                  render={({ field }) => <Input value={field.value || ""} onChangeText={field.onChange} />}
                />
              </>
            )}
            <Controller
              control={control}
              name="livingStatusCode"
              render={({ field }) => (
                <SelectField label="जेष्ठ नागरिकको बसोबास" value={field.value || null} onChange={field.onChange} clearLabel="Not set" options={living} />
              )}
            />
            <Controller
              control={control}
              name="householdForeignEmployment"
              render={({ field }) => (
                <SelectField
                  label="घरको कुनै सदस्य वैदेशिक रोजगारमा गएको"
                  value={field.value || null}
                  onChange={field.onChange}
                  clearLabel="Not set"
                  options={[
                    { value: "YES", label: "छ / Yes" },
                    { value: "NO", label: "छैन / No" },
                  ]}
                />
              )}
            />
          </Card>

          <Card>
            <SectionTitle>Citizen photo</SectionTitle>
            {photo ? <Image source={{ uri: photo }} style={{ height: 220, borderRadius: 12 }} /> : null}
            <Button
              variant="outline"
              title={photo ? "Retake photo" : "Take photo"}
              onPress={async () => {
                try {
                  const p = await capturePhoto();
                  if (p) setPhoto(p);
                } catch (e) {
                  Alert.alert("Camera", e instanceof Error ? e.message : "Unable to take photo");
                }
              }}
            />
          </Card>

          <Button title={saving ? "Saving…" : mode === "edit" ? "Save changes" : "Save offline"} disabled={saving} onPress={handleSubmit(submit)} />
          <Button variant="outline" title="Cancel" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
