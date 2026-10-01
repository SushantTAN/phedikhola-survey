"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect, selectChoice } from "@/components/shared/form-select";
import { LocationPicker } from "@/components/shared/location-picker";

export function HealthPostForm({
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
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm({ defaultValues: { name: "", wardId: "", latitude: "", longitude: "" } });

  useEffect(() => {
    api<any>("/master/wards").then((r) => setWards(r.data.filter((w: any) => w.active)));
  }, []);
  useEffect(() => {
    if (initialData)
      reset({
        name: initialData.name || "",
        wardId: initialData.wardId || "",
        latitude: initialData.latitude == null ? "" : String(Number(initialData.latitude)),
        longitude: initialData.longitude == null ? "" : String(Number(initialData.longitude)),
      });
  }, [initialData, reset]);

  async function submit(v: any) {
    setError("");
    if (!v.wardId) return setError("Please select a ward");
    if ((v.latitude === "") !== (v.longitude === "")) return setError("Provide both latitude and longitude, or leave both empty");
    try {
      const r = await api<any>(mode === "edit" ? `/health-posts/${id}` : "/health-posts", {
        method: mode === "edit" ? "PATCH" : "POST",
        body: JSON.stringify({
          name: v.name,
          wardId: v.wardId,
          latitude: v.latitude === "" ? null : Number(v.latitude),
          longitude: v.longitude === "" ? null : Number(v.longitude),
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["health-post", r.data.id] });
      void queryClient.invalidateQueries({ queryKey: ["health-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      router.push(`/admin/health-posts/${r.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save health post");
    }
  }

  const choices = wards.map((w) => ({ value: w.id as string, label: `${w.nameNe} / ${w.nameEn}` }));
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "edit" ? "Edit health post" : "Health post details"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input {...register("name", { required: true })} placeholder="e.g. Phedikhola Health Post" />
            </div>
            <div className="space-y-2">
              <Label>Ward *</Label>
              <Controller
                control={control}
                name="wardId"
                render={({ field }) => (
                  <FormSelect
                    selected={selectChoice(field.value, choices, initialData?.ward ? `${initialData.ward.nameNe} / ${initialData.ward.nameEn}` : undefined)}
                    options={choices}
                    onChange={(c) => field.onChange(c.value)}
                    placeholder="Select ward"
                  />
                )}
              />
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Location</h3>
            <LocationPicker
              latitude={watch("latitude")}
              longitude={watch("longitude")}
              onChange={(lat, lng) => { setValue("latitude", lat); setValue("longitude", lng); }}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button disabled={isSubmitting}><Save />{mode === "edit" ? "Save changes" : "Create health post"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
