"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { FormSelect, selectChoice } from "@/components/shared/form-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Values = { name: string; wardId: string; healthPostId: string; active: boolean };

export function ToleForm({ id, initialData }: { id?: string; initialData?: Values }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const { data: wards, isLoading: wardsLoading } = useQuery({ queryKey: ["wards", "tole-form"], queryFn: () => api<any[]>("/master/wards") });
  const { data: healthPosts, isLoading: healthPostsLoading } = useQuery({ queryKey: ["health-posts", "tole-form"], queryFn: () => api<any[]>("/health-posts?active=true") });
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    defaultValues: { name: "", wardId: "", healthPostId: "", active: true }
  });
  useEffect(() => { if (initialData) reset(initialData); }, [initialData, reset]);
  const wardId = watch("wardId");
  const healthPostId = watch("healthPostId");
  const wardOptions = (wards?.data ?? []).filter((ward: any) => ward.active || ward.id === initialData?.wardId).map((ward: any) => ({ value: ward.id, label: `${ward.nameNe} / ${ward.nameEn}` }));
  const healthPostOptions = (healthPosts?.data ?? []).filter((post: any) => post.wardId === wardId).map((post: any) => ({ value: post.id, label: post.name }));
  useEffect(() => {
    if (healthPostId && healthPosts?.data && !healthPostOptions.some((post: any) => post.value === healthPostId)) setValue("healthPostId", "");
  }, [wardId, healthPostId, healthPosts?.data, setValue]);

  async function submit(values: Values) {
    setError("");
    try {
      await api(id ? `/toles/${id}` : "/toles", { method: id ? "PATCH" : "POST", body: JSON.stringify(values) });
      await queryClient.invalidateQueries({ queryKey: ["toles"] });
      void queryClient.invalidateQueries({ queryKey: ["tole", id] });
      router.push("/admin/toles");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save tole");
    }
  }

  return <form onSubmit={handleSubmit(submit)}>
    <Card>
      <CardHeader><CardTitle>{id ? "Edit tole" : "Tole details"}</CardTitle></CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="tole-name">Name *</Label><Input id="tole-name" {...register("name", { required: "Name is required" })}/>{errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}</div>
        <div className="space-y-2"><Label>Ward *</Label><Controller name="wardId" control={control} rules={{ required: "Ward is required" }} render={({ field }) => <FormSelect selected={selectChoice(field.value, wardOptions)} options={wardOptions} onChange={choice => field.onChange(choice.value)} placeholder="Select ward" loading={wardsLoading}/>}/>{errors.wardId && <p className="text-xs text-red-600">{errors.wardId.message}</p>}</div>
        <div className="space-y-2"><Label>Health post *</Label><Controller name="healthPostId" control={control} rules={{ required: "Health post is required" }} render={({ field }) => <FormSelect selected={selectChoice(field.value, healthPostOptions)} options={healthPostOptions} onChange={choice => field.onChange(choice.value)} placeholder={wardId ? "Select health post" : "Select a ward first"} loading={healthPostsLoading} disabled={!wardId}/>}/>{errors.healthPostId && <p className="text-xs text-red-600">{errors.healthPostId.message}</p>}</div>
        {id && <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" {...register("active")}/> Active</label>}
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="outline" onClick={() => router.push("/admin/toles")}>Cancel</Button><Button type="submit" disabled={isSubmitting}><Save/>{id ? "Save changes" : "Create tole"}</Button></div>
      </CardContent>
    </Card>
  </form>;
}
