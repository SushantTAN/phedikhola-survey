"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function WardForm({
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      code: "",
      nameEn: "",
      nameNe: "",
      locationNameEn: "",
      locationNameNe: "",
      sortOrder: 0,
      active: true,
    },
  });
  useEffect(() => {
    if (initialData) reset(initialData);
  }, [initialData, reset]);
  async function submit(v: any) {
    const r = await api<any>(
      mode === "edit" ? `/master/wards/${id}` : "/master/wards",
      {
        method: mode === "edit" ? "PATCH" : "POST",
        body: JSON.stringify({ ...v, sortOrder: Number(v.sortOrder) }),
      },
    );
    await queryClient.invalidateQueries({ queryKey: ["ward", r.data.id] });
    void queryClient.invalidateQueries({ queryKey: ["wards"] });
    void queryClient.invalidateQueries({ queryKey: ["services"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    router.push(`/admin/wards/${r.data.id}`);
  }
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "edit" ? "Edit ward" : "Ward details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Code *">
            <Input
              {...register("code", { required: true })}
              placeholder="WARD_1"
            />
          </Field>
          <Field label="Sort order">
            <Input type="number" {...register("sortOrder")} />
          </Field>
          <Field label="English name *">
            <Input
              {...register("nameEn", { required: true })}
              placeholder="Ward No. 1"
            />
          </Field>
          <Field label="Nepali name *">
            <Input
              className="nepali"
              {...register("nameNe", { required: true })}
              placeholder="वडा नं. १"
            />
          </Field>
          <Field label="Location / Tole (English)">
            <Input {...register("locationNameEn")} />
          </Field>
          <Field label="Location / Tole (Nepali)">
            <Input className="nepali" {...register("locationNameNe")} />
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
              {mode === "edit" ? "Save changes" : "Create ward"}
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
