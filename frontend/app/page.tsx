"use client";
import { NepaliDatePicker } from "@/components/shared/nepali-date-picker";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ShieldCheck,
  Languages,
  ArrowRight,
  HeartPulse,
  MapPinned,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dictionaries, type Locale } from "@/lib/i18n";
export default function HomePage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ne");
  const [id, setId] = useState("");
  const [dob, setDob] = useState("");
  const t = dictionaries[locale];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return;
    router.push(
      `/citizen/${encodeURIComponent(id.trim().toUpperCase())}${dob ? `?dob=${encodeURIComponent(dob)}` : ""}`,
    );
  };
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,.25),transparent_28%),linear-gradient(180deg,#022c22_0%,#064e3b_55%,#f8fafc_55%)]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-white">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.28em] text-emerald-200">
            Phedikhola Rural Municipality
          </div>
          <h1 className="mt-1 text-lg font-bold sm:text-xl">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Languages size={18} />
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="w-32 border-white/20 bg-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ne">नेपाली</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div className="text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-emerald-50 backdrop-blur">
            <ShieldCheck size={16} />
            Secure municipality citizen portal
          </div>
          <h2 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Citizen service records, accessible when you need them.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-100 sm:text-lg">
            View approved personal information and service history using the
            unique citizen ID issued by Phedikhola Rural Municipality.
          </p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            <Feature icon={<HeartPulse />} title="Service history" />
            <Feature icon={<MapPinned />} title="Ward records" />
            <Feature icon={<WifiOff />} title="Offline field collection" />
          </div>
        </div>
        <Card className="overflow-hidden border-white/30 shadow-2xl shadow-emerald-950/20">
          <CardHeader className="bg-gradient-to-r from-white to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                <Search />
              </div>
              <div>
                <CardTitle>{t.citizenLookup}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Use your municipality-provided identifier.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                {t.citizenId}
                <Input
                  className="mt-2 h-11"
                  placeholder="PHE-2083-000123"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Date of birth{" "}
                <span className="font-normal text-slate-400">
                  (if required)
                </span>
                <div className="mt-2">
                  <NepaliDatePicker
                    className="h-11"
                    value={dob}
                    onChange={setDob}
                    clearable
                    max={new Date().toISOString().slice(0, 10)}
                    defaultViewYearsAgo={60}
                  />
                </div>
              </label>
              <Button className="h-11 w-full" type="submit">
                {t.lookup}
                <ArrowRight />
              </Button>
            </form>
            <div className="mt-6 border-t pt-4 text-center text-xs text-slate-500">
              Municipality staff?{" "}
              <Link
                className="font-semibold text-emerald-700 hover:text-emerald-800"
                href="/admin/login"
              >
                {t.adminLogin}
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-emerald-50 backdrop-blur">
      {icon}
      <span>{title}</span>
    </div>
  );
}
