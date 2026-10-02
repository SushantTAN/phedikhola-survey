"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect, selectChoice } from "@/components/shared/form-select";
import { Save } from "lucide-react";
export function MedicineForm({
  mode = "create",
  id,
  initialData,
}: {
  mode?: "create" | "edit";
  id?: string;
  initialData?: any;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [units, setUnits] = useState<any[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      genericName: "",
      strength: "",
      dosageForm: "",
      defaultUnitId: "",
      description: "",
      active: true,
    },
  });
  useEffect(() => {
    api<any>("/master/medicine-units")
      .then((r) => setUnits(r.data))
      .finally(() => setUnitsLoading(false));
  }, []);
  useEffect(() => {
    if (initialData)
      reset({
        name: initialData.name || "",
        genericName: initialData.genericName || "",
        strength: initialData.strength || "",
        dosageForm: initialData.dosageForm || "",
        defaultUnitId: initialData.defaultUnitId || "",
        description: initialData.description || "",
        active: initialData.active ?? true,
      });
  }, [initialData, reset]);
  async function submit(v: any) {
    const r = await api<any>(
      mode === "edit" ? `/master/medicines/${id}` : "/master/medicines",
      {
        method: mode === "edit" ? "PATCH" : "POST",
        body: JSON.stringify({ ...v, defaultUnitId: v.defaultUnitId || null }),
      },
    );
    await queryClient.invalidateQueries({ queryKey: ["medicine", r.data.id] });
    void queryClient.invalidateQueries({ queryKey: ["medicines"] });
    void queryClient.invalidateQueries({ queryKey: ["services"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    router.push(`/admin/medicines/${r.data.id}`);
  }
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "edit" ? "Edit medicine" : "Medicine details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Name *">
            <Input {...register("name", { required: true })} />
          </Field>
          <Field label="Generic name">
            <Input {...register("genericName")} />
          </Field>
          <Field label="Strength">
            <Input {...register("strength")} placeholder="500 mg" />
          </Field>
          <Field label="Dosage form">
            <Input
              {...register("dosageForm")}
              placeholder="Tablet, capsule, tube…"
            />
          </Field>
          <Field label="Default unit">
            <Controller
              control={control}
              name="defaultUnitId"
              render={({ field }) => {
                const choices = units.map((u) => ({
                  value: u.id as string,
                  label: u.nameEn as string,
                }));
                return (
                  <FormSelect
                    selected={selectChoice(
                      field.value,
                      choices,
                      initialData?.defaultUnit?.nameEn,
                    )}
                    options={choices}
                    onChange={(choice) => field.onChange(choice.value)}
                    placeholder="Select unit"
                    loading={unitsLoading}
                  />
                );
              }}
            />
          </Field>
          <Field label="Description">
            <Textarea {...register("description")} />
          </Field>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting}>
              <Save />
              {mode === "edit" ? "Save changes" : "Create medicine"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
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
