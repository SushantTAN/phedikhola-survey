"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect, selectChoice } from "@/components/shared/form-select";
export function StaffForm({
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
  const [wards, setWards] = useState<any[]>([]);
  const [healthPosts, setHealthPosts] = useState<any[]>([]);
  const [wardsLoading, setWardsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      employeeCode: "",
      assignedWardId: "",
      healthPostId: "",
      password: "TempPass123!",
      isActive: true,
    },
  });
  useEffect(() => {
    api<any>("/master/wards")
      .then((r) => setWards(r.data.filter((w: any) => w.active)))
      .finally(() => setWardsLoading(false));
  }, []);
  useEffect(() => {
    api<any>("/health-posts?active=true")
      .then((r) => setHealthPosts(r.data))
      .finally(() => setPostsLoading(false));
  }, []);
  useEffect(() => {
    if (initialData)
      reset({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        employeeCode: initialData.staffProfile?.employeeCode || "",
        assignedWardId: initialData.staffProfile?.assignedWardId || "",
        healthPostId: initialData.staffProfile?.healthPostId || "",
        password: "",
        isActive: initialData.isActive ?? true,
      });
  }, [initialData, reset]);
  async function submit(v: any) {
    const payload = { ...v, assignedWardId: v.assignedWardId || null, healthPostId: v.healthPostId || null };
    const r = await api<any>(mode === "edit" ? `/staff/${id}` : "/staff", {
      method: mode === "edit" ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    await queryClient.invalidateQueries({ queryKey: ["staff", r.data.id] });
    void queryClient.invalidateQueries({ queryKey: ["staff"] });
    void queryClient.invalidateQueries({ queryKey: ["services"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    router.push(`/admin/staff/${r.data.id}`);
  }
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "edit" ? "Edit staff member" : "Staff account"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Full name *">
            <Input {...register("name", { required: true })} />
          </Field>
          <Field label="Email *">
            <Input type="email" {...register("email", { required: true })} />
          </Field>
          <Field label="Phone">
            <Input {...register("phone")} />
          </Field>
          <Field label="Employee code">
            <Input {...register("employeeCode")} />
          </Field>
          <Field label="Assigned ward">
            <Controller
              control={control}
              name="assignedWardId"
              render={({ field }) => {
                const choices = wards.map((w) => ({
                  value: w.id as string,
                  label: `${w.nameNe} / ${w.nameEn}`,
                }));
                const assigned = initialData?.staffProfile?.assignedWard;
                const fallback = assigned
                  ? `${assigned.nameNe} / ${assigned.nameEn}`
                  : undefined;
                return (
                  <FormSelect
                    selected={selectChoice(field.value, choices, fallback)}
                    options={choices}
                    onChange={(choice) => field.onChange(choice.value)}
                    placeholder="Select ward"
                    loading={wardsLoading}
                  />
                );
              }}
            />
          </Field>
          <Field label="Health post">
            <Controller
              control={control}
              name="healthPostId"
              render={({ field }) => {
                const wardId = watch("assignedWardId");
                const choices = healthPosts
                  .filter((h) => !wardId || h.wardId === wardId || h.id === field.value)
                  .map((h) => ({ value: h.id as string, label: `${h.name} (${h.ward?.nameEn ?? ""})` }));
                const current = initialData?.staffProfile?.healthPost;
                return (
                  <FormSelect
                    selected={selectChoice(field.value, choices, current?.name)}
                    options={choices}
                    onChange={(choice) => field.onChange(choice.value)}
                    placeholder={wardId ? "Select health post in ward" : "Select health post"}
                    loading={postsLoading}
                  />
                );
              }}
            />
          </Field>
          {mode === "create" && (
            <Field label="Temporary password">
              <Input {...register("password")} />
            </Field>
          )}
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
              {mode === "edit" ? "Save changes" : "Create staff"}
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
