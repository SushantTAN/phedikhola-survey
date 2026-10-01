"use client";
import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CitizenForm } from "@/components/forms/citizen-form";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Camera,
  Loader2,
  MapPinned,
  MinusCircle,
  Plus,
  Save,
  Stethoscope,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/supabase-storage";
import { compressImageToWebp } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { MedicinePicker } from "@/components/shared/medicine-picker";
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
  citizenId: yup.string().required("Citizen is required"),
  wardId: yup.string().required("Ward is required"),
  createdById: yup.string().nullable(),
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
  latitude: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  longitude: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  altitude: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  accuracy: yup
    .number()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  otherHealthProblem: yup.string().nullable(),
  notes: yup.string().nullable(),
  visitPhotoUrl: yup.string().nullable(),
  needsFollowup: yup.boolean().optional(),
  version: yup.number().optional(),
});
type Values = yup.InferType<typeof schema>;
type Med = {
  medicineId?: string;
  otherMedicineName?: string;
  label: string;
  quantity: string;
  unit: string;
};
export function ServiceForm({
  mode = "create",
  serviceId,
  initialData,
  defaultCitizenId,
}: {
  mode?: "create" | "edit";
  serviceId?: string;
  initialData?: any;
  defaultCitizenId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reference, setReference] = useState<any>({
    wards: [],
    conditions: [],
    medicines: [],
    units: [],
  });
  const [citizens, setCitizens] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [createdCitizen, setCreatedCitizen] = useState<{
    id: string;
    fullName: string;
    publicId: string;
  } | null>(null);
  const [citizenDialogOpen, setCitizenDialogOpen] = useState(false);
  const [conditionIds, setConditionIds] = useState<string[]>([]);
  const [medicines, setMedicines] = useState<Med[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialData?.visitPhotoUrl || "");
  const [error, setError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<Values>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      citizenId: defaultCitizenId || "",
      wardId: "",
      createdById: "",
      serviceDate: new Date().toISOString().slice(0, 10),
      nepaliYear: null,
      nepaliMonth: "",
      systolic: null,
      diastolic: null,
      pulseRate: null,
      temperatureF: null,
      latitude: null,
      longitude: null,
      altitude: null,
      accuracy: null,
      otherHealthProblem: "",
      notes: "",
      visitPhotoUrl: "",
      needsFollowup: false,
    },
  });
  useEffect(() => {
    Promise.all([
      api<any>("/master/reference-data"),
      api<any>("/citizens?limit=100"),
    ]).then(([r, c]) => {
      setReference(r.data);
      setCitizens((current) => [
        ...current,
        ...c.data.filter(
          (citizen: any) =>
            !current.some((existing) => existing.id === citizen.id),
        ),
      ]);
    });
  }, []);
  useEffect(() => {
    api<any>("/staff")
      .then((r) => setStaff(r.data.filter((u: any) => u.isActive)))
      .catch(() => setStaff([]));
  }, []);
  useEffect(() => {
    if (!initialData) return;
    reset({
      citizenId: initialData.citizenId,
      wardId: initialData.wardId,
      createdById: initialData.createdById ?? "",
      serviceDate: String(initialData.serviceDate).slice(0, 10),
      nepaliYear: initialData.nepaliYear ?? null,
      nepaliMonth: initialData.nepaliMonth ?? "",
      systolic: initialData.systolic ?? null,
      diastolic: initialData.diastolic ?? null,
      pulseRate: initialData.pulseRate ?? null,
      temperatureF:
        initialData.temperatureF == null
          ? null
          : Number(initialData.temperatureF),
      latitude:
        initialData.latitude == null ? null : Number(initialData.latitude),
      longitude:
        initialData.longitude == null ? null : Number(initialData.longitude),
      altitude:
        initialData.altitude == null ? null : Number(initialData.altitude),
      accuracy:
        initialData.accuracy == null ? null : Number(initialData.accuracy),
      otherHealthProblem: initialData.otherHealthProblem ?? "",
      notes: initialData.notes ?? "",
      visitPhotoUrl: initialData.visitPhotoUrl ?? "",
      needsFollowup: !!initialData.needsFollowup,
      version: initialData.version,
    });
    setConditionIds(
      initialData.conditions?.map((x: any) => x.conditionId) ?? [],
    );
    setMedicines(
      initialData.medicines?.map((m: any) => ({
        medicineId: m.medicineId || undefined,
        otherMedicineName: m.otherMedicineName || undefined,
        label: m.medicine?.name || m.otherMedicineName || "Other medicine",
        quantity: String(m.quantity),
        unit: m.unit,
      })) ?? [],
    );
    setPreview(initialData.visitPhotoUrl ?? "");
  }, [initialData, reset]);
  function addMedicine(m: any) {
    setMedicines((v) =>
      v.some((x) => x.medicineId === m.id)
        ? v
        : [
            ...v,
            {
              medicineId: m.id,
              label: `${m.name}${m.strength ? ` ${m.strength}` : ""}`,
              quantity: "1",
              unit: m.defaultUnit?.nameEn || "unit",
            },
          ],
    );
  }
  function addOtherMedicine(name: string) {
    setMedicines((v) => [
      ...v,
      { otherMedicineName: name, label: name, quantity: "1", unit: "unit" },
    ]);
  }
  async function submit(values: Values) {
    setError("");
    try {
      let visitPhotoUrl = values.visitPhotoUrl || null;
      if (photoFile) {
        const webp = await compressImageToWebp(photoFile);
        visitPhotoUrl = await uploadImage(webp, "service", serviceId || "new");
      }
      const payload = {
        ...values,
        visitPhotoUrl,
        conditionIds,
        medicines: medicines.map(({ label, ...m }) => m),
      };
      const r = await api<any>(
        mode === "edit" ? `/services/${serviceId}` : "/services",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["service", r.data.id] });
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (initialData?.citizenId)
        void queryClient.invalidateQueries({
          queryKey: ["citizen", initialData.citizenId],
        });
      if (r.data.citizenId)
        void queryClient.invalidateQueries({
          queryKey: ["citizen", r.data.citizenId],
        });
      router.push(`/admin/services/${r.data.id}`);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save service record",
      );
    }
  }
  return (
    <>
      <form onSubmit={handleSubmit(submit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                <Stethoscope />
              </div>
              <div>
                <CardTitle>Service information</CardTitle>
                <CardDescription>
                  Select the citizen, service ward and visit date.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Controller
              control={control}
              name="citizenId"
              render={({ field }) => {
                const choices = citizens.map((c) => ({
                  value: c.id,
                  label: `${c.fullName} / ${c.publicId}`,
                }));
                const chosenId = createdCitizen?.id ?? field.value;
                const fallback = createdCitizen
                  ? `${createdCitizen.fullName} / ${createdCitizen.publicId}`
                  : initialData?.citizen?.id === chosenId
                    ? `${initialData.citizen.fullName} / ${initialData.citizen.publicId}`
                    : undefined;
                return (
                  <Field label="Citizen *">
                    <FormSelect
                      selected={selectChoice(chosenId, choices, fallback)}
                      options={choices}
                      placeholder="Select citizen"
                      onChange={(choice) => {
                        setCreatedCitizen(null);
                        field.onChange(choice.value);
                      }}
                      action={{
                        label: "Create new citizen",
                        onSelect: () =>
                          requestAnimationFrame(() =>
                            setCitizenDialogOpen(true),
                          ),
                      }}
                    />
                  </Field>
                );
              }}
            />
            <Controller
              control={control}
              name="wardId"
              render={({ field }) => (
                <SelectField
                  label="सेवा दिएको वडा / Service ward *"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={reference.wards.map((w: any) => [
                    w.id,
                    `${w.nameNe} / ${w.nameEn}`,
                  ])}
                />
              )}
            />
            <Controller
              control={control}
              name="createdById"
              render={({ field }) => {
                const wardId = watch("wardId");
                const current = initialData?.createdBy;
                const list = staff.filter(
                  (u) =>
                    !wardId ||
                    u.staffProfile?.assignedWardId === wardId ||
                    u.id === field.value,
                );
                if (current && !list.some((u) => u.id === current.id))
                  list.push(current);
                return (
                  <SelectField
                    label="Staff"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    options={list.map((u) => [u.id, u.name])}
                  />
                );
              }}
            />
            <Field label="Service date *">
              <Input type="date" {...register("serviceDate")} />
            </Field>
            <Field label="Nepali year">
              <Input
                type="number"
                placeholder="2083"
                {...register("nepaliYear")}
              />
            </Field>
            <Controller
              control={control}
              name="nepaliMonth"
              render={({ field }) => (
                <SelectField
                  label="Nepali month"
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  options={months.map((m) => [m, m])}
                />
              )}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vital signs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-800">
                Blood pressure (रक्तचाप)
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Upper value – Systolic (mmHg)">
                  <Input type="number" placeholder="e.g. 120" {...register("systolic")} />
                </Field>
                <Field label="Lower value – Diastolic (mmHg)">
                  <Input type="number" placeholder="e.g. 80" {...register("diastolic")} />
                </Field>
              </div>
            </div>
            <Field label="Pulse rate / minute">
              <Input type="number" {...register("pulseRate")} />
            </Field>
            <Field label="Temperature °F">
              <Input type="number" step="0.1" {...register("temperatureF")} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Health conditions</CardTitle>
            <CardDescription>
              Select all problems observed for this visit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MultiSelect
              value={conditionIds}
              onChange={setConditionIds}
              placeholder="Select health conditions"
              options={reference.conditions.map((x: any) => ({
                value: x.id,
                label: `${x.nameNe || x.nameEn} / ${x.nameEn}`,
              }))}
            />
            <Field label="Other health problem">
              <Input
                {...register("otherHealthProblem")}
                placeholder="Describe if Other was selected"
              />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Medicines provided</CardTitle>
            <CardDescription>
              Search for a medicine and click it to add. Then set the quantity given.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MedicinePicker
              medicines={reference.medicines}
              selectedIds={medicines.flatMap((m) => (m.medicineId ? [m.medicineId] : []))}
              onAdd={addMedicine}
              onAddOther={addOtherMedicine}
            />
            {medicines.length ? (
              <div className="divide-y rounded-xl border border-slate-200">
                <div className="hidden gap-3 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1fr_120px_150px_36px]">
                  <span>Medicine given</span>
                  <span>Quantity</span>
                  <span>Unit</span>
                  <span />
                </div>
                {medicines.map((m, i) => (
                  <div
                    key={`${m.medicineId || m.otherMedicineName}-${i}`}
                    className="grid gap-3 p-3 sm:grid-cols-[1fr_120px_150px_36px] sm:items-center"
                  >
                    <div className="font-medium text-slate-800">{m.label}</div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={m.quantity}
                      onChange={(e) =>
                        setMedicines((v) =>
                          v.map((x, idx) =>
                            idx === i ? { ...x, quantity: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Input
                      value={m.unit}
                      onChange={(e) =>
                        setMedicines((v) =>
                          v.map((x, idx) =>
                            idx === i ? { ...x, unit: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setMedicines((v) => v.filter((_, idx) => idx !== i))
                      }
                    >
                      <MinusCircle className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                No medicines added yet. Search above and click a medicine to add it.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="text-emerald-600" />
              Location & photo
            </CardTitle>
            <CardDescription>
              GPS can also be captured by the mobile app offline. Admin can
              enter coordinates manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Latitude">
                <Input type="number" step="any" {...register("latitude")} />
              </Field>
              <Field label="Longitude">
                <Input type="number" step="any" {...register("longitude")} />
              </Field>
              <Field label="Altitude (m)">
                <Input type="number" step="any" {...register("altitude")} />
              </Field>
              <Field label="Accuracy (m)">
                <Input type="number" step="any" {...register("accuracy")} />
              </Field>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {preview ? (
                <img
                  src={preview}
                  alt="Service preview"
                  className="h-28 w-28 rounded-2xl border object-cover"
                />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-2xl border border-dashed bg-slate-50 text-slate-400">
                  <Camera />
                </div>
              )}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setPhotoFile(f);
                  if (f) setPreview(URL.createObjectURL(f));
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register("notes")}
              placeholder="Additional observations…"
            />
            <Controller
              control={control}
              name="needsFollowup"
              render={({ field }) => (
                <label className="mt-4 flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  Needs follow-up
                </label>
              )}
            />
          </CardContent>
        </Card>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
            {mode === "edit" ? "Save changes" : "Create service record"}
          </Button>
        </div>
      </form>
      <Dialog.Root open={citizenDialogOpen} onOpenChange={setCitizenDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(96vw,1100px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-slate-50 p-5 shadow-2xl md:p-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-slate-900">
                  Create citizen
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500">
                  The new citizen will be selected for this service record.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close citizen form"
                >
                  <X />
                </Button>
              </Dialog.Close>
            </div>
            {citizenDialogOpen && (
              <CitizenForm
                onCancel={() => setCitizenDialogOpen(false)}
                onCreated={(citizen) => {
                  setCreatedCitizen(citizen);
                  setCitizens((current) => [
                    citizen,
                    ...current.filter((c) => c.id !== citizen.id),
                  ]);
                  setValue("citizenId", citizen.id, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  setCitizenDialogOpen(false);
                }}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function SelectField({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: any[];
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
      />
    </Field>
  );
}
