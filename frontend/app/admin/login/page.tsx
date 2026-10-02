"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, LockKeyhole } from "lucide-react";
import { api, setTokens } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await api<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (r.data.user.role !== "ADMIN")
        throw new Error("This account is not an administrator");
      setTokens(r.data.accessToken, r.data.refreshToken);
      router.replace("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-4">
      <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
      <Card className="relative w-full max-w-md overflow-hidden border-slate-800 bg-white shadow-2xl">
        <CardHeader className="border-b bg-gradient-to-br from-emerald-50 to-white pb-6">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Landmark />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[.25em] text-emerald-700">
            Phedikhola Rural Municipality
          </div>
          <CardTitle className="mt-1 text-2xl">Administrator login</CardTitle>
          <p className="text-sm text-slate-500">
            Sign in to manage citizens, service records, wards and staff.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={submit}>
            <Input
              type="email"
              placeholder="Administrator email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button className="h-11 w-full" disabled={loading}>
              <LockKeyhole />
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
