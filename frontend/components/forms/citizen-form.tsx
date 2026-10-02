"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Camera, Loader2, Save, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/supabase-storage";
import { compressImageToWebp } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MultiSelect } from "@/components/shared/multi-select";
import { FormSelect, selectChoice } from "@/components/shared/form-select";
import { LocationPicker } from "@/components/shared/location-picker";

const schema = yup.object({
  fullName: yup.string().trim().required("Full name is required"),
  dateOfBirth: yup.string().nullable(),
  approximateAge: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .min(0)
    .max(130),
  gender: yup.string().oneOf(["FEMALE", "MALE", "OTHER"]).required(),
  phone: yup.string().nullable(),
  latitude: yup.string().nullable().test("latitude-range", "Latitude must be between -90 and 90", (value) => !value || (Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 90)),
  longitude: yup.string().nullable().test("longitude-range", "Longitude must be between -180 and 180", (value) => !value || (Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 180)),
  categoryId: yup.string().nullable(),
  wardIds: yup.array(yup.string().required()).default([]),
  toleId: yup.string().nullable(),
  casteGroupCode: yup.string().nullable(),
  casteOther: yup.string().nullable(),
  maritalStatusCode: yup.string().nullable(),
  occupationCode: yup.string().nullable(),
  occupationOther: yup.string().nullable(),
  livingStatusCode: yup.string().nullable(),
  householdForeignEmployment: yup.boolean().nullable(),
  profilePhotoUrl: yup.string().nullable(),
  version: yup.number().optional(),
}).test("complete-location", "Provide both latitude and longitude, or leave both empty", function (values) {
  if (!!values?.latitude !== !!values?.longitude) return this.createError({ path: "latitude" });
  return true;
});
export type CitizenFormValues = yup.InferType<typeof schema>;
const caste = [
  ["DALIT", "दलित / Dalit"],
  ["BRAHMIN_CHHETRI", "ब्राह्मण/क्षेत्री / Brahmin/Chhetri"],
  ["JANAJATI", "जनजाती / Janajati"],
  ["MADHESI", "मधेशी / Madhesi"],
  ["MUSLIM", "मुस्लिम / Muslim"],
  ["OTHER", "अन्य / Other"],
];
const marital = [
  ["SINGLE", "Single"],
  ["MARRIED", "Married"],
  ["DIVORCED", "Divorced"],
  ["WIDOW", "Widow"],
  ["WIDOWER", "Widower"],
  ["OTHER", "Other"],
];
const occupations = [
  ["UNEMPLOYED", "Unemployed"],
  ["EMPLOYED", "Employed"],
  ["STUDENT", "Student"],
  ["RETIRED", "Retired"],
  ["SELF_EMPLOYED", "Self-employed"],
  ["AGRICULTURE", "Agriculture"],
  ["OTHER", "Other"],
];
const living = [
  ["LIVES_ALONE", "एकल / Lives alone"],
  ["HAS_CAREGIVER", "हेरचाहा गर्ने व्यक्ति भएको / Has caregiver"],
];
const empty: CitizenFormValues = {
  fullName: "",
  dateOfBirth: "",
  approximateAge: null,
  gender: "OTHER",
  phone: "",
  latitude: "",
  longitude: "",
  categoryId: "",
  wardIds: [],
  toleId: "",
  casteGroupCode: "",
  casteOther: "",
  maritalStatusCode: "",
  occupationCode: "",
  occupationOther: "",
  livingStatusCode: "",
  householdForeignEmployment: null,
  profilePhotoUrl: "",
};

export function CitizenForm({
  mode = "create",
  citizenId,
  initialData,
  onCreated,
  onCancel,
}: {
  mode?: "create" | "edit";
  citizenId?: string;
  initialData?: any;
  onCreated?: (citizen: {
    id: string;
    fullName: string;
    publicId: string;
  }) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reference, setReference] = useState<any>({
    wards: [],
    toles: [],
    categories: [],
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialData?.profilePhotoUrl || "");
  const [serverError, setServerError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CitizenFormValues>({
    resolver: yupResolver(schema) as any,
    defaultValues: empty,
  });
  const [refLoading, setRefLoading] = useState(true);
  useEffect(() => {
    api<any>("/master/reference-data")
      .then((r) => setReference(r.data))
      .finally(() => setRefLoading(false));
  }, []);
  useEffect(() => {
    if (!initialData) return;
    const v = {
      ...empty,
      fullName: initialData.fullName ?? "",
      dateOfBirth: initialData.dateOfBirth
        ? String(initialData.dateOfBirth).slice(0, 10)
        : "",
      approximateAge: initialData.approximateAge ?? null,
      gender: initialData.gender ?? "OTHER",
      phone: initialData.phone ?? "",
      latitude: initialData.latitude == null ? "" : String(Number(initialData.latitude)),
      longitude: initialData.longitude == null ? "" : String(Number(initialData.longitude)),
      categoryId:
        initialData.categories?.[0]?.categoryId ??
        initialData.categories?.[0]?.category?.id ??
        "",
      wardIds: initialData.wards?.map((x: any) => x.wardId ?? x.ward?.id) ?? [],
      toleId: initialData.toleId ?? "",
      casteGroupCode: initialData.casteGroupCode ?? "",
      casteOther: initialData.casteOther ?? "",
      maritalStatusCode: initialData.maritalStatusCode ?? "",
      occupationCode: initialData.occupationCode ?? "",
      occupationOther: initialData.occupationOther ?? "",
      livingStatusCode: initialData.livingStatusCode ?? "",
      householdForeignEmployment:
        initialData.householdForeignEmployment ?? null,
      profilePhotoUrl: initialData.profilePhotoUrl ?? "",
      version: initialData.version,
    };
    reset(v);
    setPreview(initialData.profilePhotoUrl ?? "");
  }, [initialData, reset]);
  const casteValue = watch("casteGroupCode"),
    occupationValue = watch("occupationCode");
  const selectedWardIds = watch("wardIds") || [];
  const selectedToleId = watch("toleId");
  useEffect(() => {
    if (selectedToleId && reference.toles.length && !reference.toles.some((t: any) => t.id === selectedToleId && selectedWardIds.includes(t.wardId))) {
      setValue("toleId", "");
    }
  }, [selectedWardIds, selectedToleId, reference.toles, setValue]);
  async function submit(values: CitizenFormValues) {
    setServerError("");
    try {
      let profilePhotoUrl = values.profilePhotoUrl || null;
      if (photoFile) {
        const webp = await compressImageToWebp(photoFile);
        profilePhotoUrl = await uploadImage(
          webp,
          "citizen",
          citizenId || "new",
        );
      }
      const payload = {
        ...values,
        categoryId: values.categoryId || null,
        toleId: values.toleId || null,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
        profilePhotoUrl,
        householdForeignEmployment: values.householdForeignEmployment,
      };
      const response = await api<any>(
        mode === "edit" ? `/citizens/${citizenId}` : "/citizens",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      await queryClient.invalidateQueries({
        queryKey: ["citizen", response.data.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["citizens"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      if (mode === "create" && onCreated) onCreated(response.data);
      else {
        router.push(`/admin/citizens/${response.data.id}`);
        router.refresh();
      }
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Unable to save citizen");
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <UserRound />
            </div>
            <div>
              <CardTitle>Citizen profile</CardTitle>
              <CardDescription>
                Identity and core demographic information.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label="जेष्ठ नागरिकको नाम / Full name *"
            error={errors.fullName?.message}
          >
            <Input {...register("fullName")} placeholder="Full name" />
          </Field>
          <Field label="Date of birth">
            <Input type="date" {...register("dateOfBirth")} />
          </Field>
          <Field label="उमेर / Approximate age">
            <Input
              type="number"
              min={0}
              max={130}
              {...register("approximateAge")}
            />
          </Field>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <SelectField
                label="लिङ्ग / Gender *"
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  ["FEMALE", "महिला / Female"],
                  ["MALE", "पुरुष / Male"],
                  ["OTHER", "अन्य / Other"],
                ]}
              />
            )}
          />
          <Field label="फोन नं. / Phone">
            <Input {...register("phone")} placeholder="98XXXXXXXX" />
          </Field>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <SelectField
                label="Citizen category"
                loading={refLoading}
                value={field.value || ""}
                onValueChange={field.onChange}
                placeholder="Select category"
                options={reference.categories.map((c: any) => [
                  c.id,
                  `${c.nameNe} / ${c.nameEn}`,
                ])}
              />
            )}
          />
          <Controller
            control={control}
            name="wardIds"
            render={({ field }) => (
              <Field label="Ward(s)">
                <MultiSelect
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select one or more wards"
                  loading={refLoading}
                  options={reference.wards.map((w: any) => ({
                    value: w.id,
                    label: `${w.nameNe} / ${w.nameEn}${w.locationNameNe ? ` · ${w.locationNameNe}` : ""}`,
                  }))}
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="toleId"
            render={({ field }) => (
              <SelectField
                label="Tole"
                loading={refLoading}
                value={field.value || ""}
                onValueChange={(value) => field.onChange(value === "__none" ? "" : value)}
                placeholder={selectedWardIds.length ? "Select tole" : "Select a ward first"}
                options={[["__none", "No tole"], ...reference.toles.filter((t: any) => selectedWardIds.includes(t.wardId)).map((t: any) => [t.id, `${t.name} · ${t.ward.nameEn}`])]}
              />
            )}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>Optional citizen location. Click the map or enter both coordinates.</CardDescription>
        </CardHeader>
        <CardContent>
          <LocationPicker
            latitude={watch("latitude") || ""}
            longitude={watch("longitude") || ""}
            onChange={(latitude, longitude) => {
              setValue("latitude", latitude, { shouldDirty: true, shouldValidate: true });
              setValue("longitude", longitude, { shouldDirty: true, shouldValidate: true });
            }}
          />
          {(errors.latitude || errors.longitude) && <p className="mt-2 text-xs text-red-600">{errors.latitude?.message || errors.longitude?.message}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Demographic & household details</CardTitle>
          <CardDescription>
            Fields included in the municipality survey specification.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Controller
            control={control}
            name="casteGroupCode"
            render={({ field }) => (
              <SelectField
                label="जात/समुह / Caste or group"
                value={field.value || ""}
                onValueChange={field.onChange}
                options={caste}
              />
            )}
          />
          {casteValue === "OTHER" && (
            <Field label="Other caste/group">
              <Input {...register("casteOther")} />
            </Field>
          )}
          <Controller
            control={control}
            name="maritalStatusCode"
            render={({ field }) => (
              <SelectField
                label="Marital status"
                value={field.value || ""}
                onValueChange={field.onChange}
                options={marital}
              />
            )}
          />
          <Controller
            control={control}
            name="occupationCode"
            render={({ field }) => (
              <SelectField
                label="Occupation"
                value={field.value || ""}
                onValueChange={field.onChange}
                options={occupations}
              />
            )}
          />
          {occupationValue === "OTHER" && (
            <Field label="Other occupation">
              <Input {...register("occupationOther")} />
            </Field>
          )}
          <Controller
            control={control}
            name="livingStatusCode"
            render={({ field }) => (
              <SelectField
                label="जेष्ठ नागरिकको बसोबास"
                value={field.value || ""}
                onValueChange={field.onChange}
                options={living}
              />
            )}
          />
          <Controller
            control={control}
            name="householdForeignEmployment"
            render={({ field }) => (
              <SelectField
                label="घरको कुनै सदस्य वैदेशिक रोजगारमा गएको"
                value={
                  field.value === true
                    ? "YES"
                    : field.value === false
                      ? "NO"
                      : ""
                }
                onValueChange={(v) =>
                  field.onChange(v === "YES" ? true : v === "NO" ? false : null)
                }
                options={[
                  ["YES", "छ / Yes"],
                  ["NO", "छैन / No"],
                ]}
              />
            )}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Citizen photo</CardTitle>
          <CardDescription>
            Images are compressed to WebP in the browser and uploaded to
            Supabase Storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {preview ? (
              <img
                src={preview}
                alt="Citizen preview"
                className="h-28 w-28 rounded-2xl border object-cover"
              />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-2xl border border-dashed bg-slate-50 text-slate-400">
                <Camera />
              </div>
            )}
            <div>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setPhotoFile(f);
                  if (f) setPreview(URL.createObjectURL(f));
                }}
              />
              <p className="mt-2 text-xs text-slate-500">
                JPEG, PNG or WebP. The uploaded file is resized before storage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          Cancel
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
          {mode === "edit" ? "Save changes" : "Create citizen"}
        </Button>
      </div>
    </form>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select",
  loading,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: any[];
  placeholder?: string;
  loading?: boolean;
}) {
  const choices = options.map(
    ([optionValue, optionLabel]: [string, string]) => ({
      value: String(optionValue),
      label: String(optionLabel),
    }),
  );
  return (
    <Field label={label}>
      <FormSelect
        selected={selectChoice(value, choices)}
        options={choices}
        onChange={(choice) => onValueChange(choice.value)}
        placeholder={placeholder}
        loading={loading}
      />
    </Field>
  );
}
