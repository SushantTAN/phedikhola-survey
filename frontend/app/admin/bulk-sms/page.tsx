"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Info, Loader2, MessageSquareText, RotateCcw, Send } from "lucide-react";
import { api } from "@/lib/api";
import { NEPALI_MONTH_NAMES } from "@/lib/nepali-months";
import { NP_MONTHS, useNepaliFormat } from "@/lib/use-nepali-format";
import { PageHeader } from "@/components/shared/page-header";
import { FormSelect } from "@/components/shared/form-select";
import { TableSkeletonRows } from "@/components/shared/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Item = {
  id: string;
  serviceDate: string;
  nepaliYear: number | null;
  nepaliMonth: string | null;
  guardianPhone: string | null;
  needsFollowup: boolean;
  citizen: { id: string; publicId: string; fullName: string };
  ward: { nameEn: string; nameNe: string } | null;
};
type RecipientsResponse = { items: Item[]; years: number[] };
type SendResult = { selected: number; skippedNoNumber: number; duplicateNumbers: number; recipients: number };

const ALL = "__all__";
// Stable references, so effects depending on the data don't re-run while it is still loading.
const NO_ITEMS: Item[] = [];
const NO_YEARS: number[] = [];
const PAGE_SIZES = [10, 20, 50, 100];
const MAX_MESSAGE = 1000;
const normalizePhone = (p: string) => p.replace(/[\s-]/g, "");

/** Rough SMS length: Nepali (Unicode) messages fit 70 characters per SMS, English ones 160. */
function smsSegments(text: string) {
  if (!text) return { segments: 0, unicode: false };
  const unicode = /[^\x00-\x7F]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { unicode, segments: text.length <= single ? 1 : Math.ceil(text.length / multi) };
}

export default function BulkSmsPage() {
  const np = useNepaliFormat();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [followup, setFollowup] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [result, setResult] = useState<SendResult | null>(null);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["sms-recipients", year, month, followup],
    queryFn: () => {
      const q = new URLSearchParams();
      if (year) q.set("nepaliYear", year);
      if (month) q.set("nepaliMonth", month);
      if (followup) q.set("needsFollowup", followup);
      return api<RecipientsResponse>(`/sms/recipients?${q}`);
    },
    placeholderData: (prev) => prev,
  });
  const items = data?.data.items ?? NO_ITEMS;
  const years = data?.data.years ?? NO_YEARS;
  const withNumber = useMemo(() => items.filter((i) => i.guardianPhone?.trim()), [items]);

  // Every record that has a number starts selected whenever the filters change.
  useEffect(() => {
    setSelected(new Set(withNumber.map((i) => i.id)));
    setPage(1);
    setResult(null);
  }, [withNumber]);

  const uniqueNumbers = useMemo(() => {
    const numbers = new Set<string>();
    for (const i of withNumber) if (selected.has(i.id)) numbers.add(normalizePhone(i.guardianPhone!));
    return numbers.size;
  }, [withNumber, selected]);

  const send = useMutation({
    mutationFn: () => api<SendResult>("/sms/bulk", { method: "POST", body: JSON.stringify({ serviceIds: [...selected], message }) }),
    onSuccess: (r) => setResult(r.data),
  });

  const { segments, unicode } = smsSegments(message);
  const pages = Math.max(1, Math.ceil(items.length / limit));
  const pageItems = items.slice((page - 1) * limit, page * limit);
  const allSelected = withNumber.length > 0 && withNumber.every((i) => selected.has(i.id));
  const canSend = uniqueNumbers > 0 && message.trim().length > 0 && !send.isPending;
  const filtered = Boolean(year || month || followup);

  function toggle(id: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }
  function submit() {
    if (!confirm(`Send this SMS to ${uniqueNumbers} guardian mobile number${uniqueNumbers === 1 ? "" : "s"}?`)) return;
    setResult(null);
    send.mutate();
  }

  return (
    <>
      <PageHeader
        title="Bulk SMS"
        description="Filter service records by Nepali year and month, then send one SMS to the guardian mobile numbers of the matching records."
      />

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Nepali year</Label>
              <FormSelect
                placeholder="All years"
                loading={isLoading}
                selected={year ? { value: year, label: year } : null}
                options={[{ value: ALL, label: "All years" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
                onChange={(c) => setYear(c.value === ALL ? "" : c.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nepali month</Label>
              <FormSelect
                placeholder="All months"
                selected={month ? { value: month, label: `${NP_MONTHS[NEPALI_MONTH_NAMES.indexOf(month)] ?? ""} (${month})` } : null}
                options={[
                  { value: ALL, label: "All months" },
                  ...NEPALI_MONTH_NAMES.map((m, i) => ({ value: m, label: `${NP_MONTHS[i]} (${m})` })),
                ]}
                onChange={(c) => setMonth(c.value === ALL ? "" : c.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Needs follow-up</Label>
              <FormSelect
                placeholder="All"
                selected={followup ? { value: followup, label: followup === "yes" ? "Yes" : "No" } : null}
                options={[
                  { value: ALL, label: "All" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                onChange={(c) => setFollowup(c.value === ALL ? "" : c.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" disabled={!filtered} onClick={() => { setYear(""); setMonth(""); setFollowup(""); }}>
                <RotateCcw />Reset filters
              </Button>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Info size={13} />Year and month filters use the Nepali year and month saved on each service record.
          </p>
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-red-600">{(error as Error).message}</p>}

      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span><strong>{items.length}</strong> service record{items.length === 1 ? "" : "s"}</span>
            <span className="text-emerald-700"><strong>{withNumber.length}</strong> with a guardian number</span>
            {items.length > withNumber.length && <span className="text-amber-600"><strong>{items.length - withNumber.length}</strong> without a number (skipped)</span>}
          </div>
          {isFetching && !isLoading && <Loader2 size={16} className="animate-spin text-slate-400" />}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all records with a number"
                    checked={allSelected}
                    disabled={!withNumber.length}
                    onCheckedChange={(on) => setSelected(on === true ? new Set(withNumber.map((i) => i.id)) : new Set())}
                  />
                </TableHead>
                <TableHead>Citizen</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Service date</TableHead>
                <TableHead>Nepali period</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Guardian mobile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows cols={7} />
              ) : pageItems.length ? (
                pageItems.map((i) => {
                  const hasNumber = Boolean(i.guardianPhone?.trim());
                  const date = np.parts(i.serviceDate);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${i.citizen.fullName}`}
                          checked={selected.has(i.id)}
                          disabled={!hasNumber}
                          onCheckedChange={(on) => toggle(i.id, on === true)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{i.citizen.fullName}</div>
                        <div className="text-xs text-slate-500">{i.citizen.publicId}</div>
                      </TableCell>
                      <TableCell>{i.ward?.nameEn ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-medium">{date.bs}</div>
                        <div className="text-xs text-slate-400">{date.ad}</div>
                      </TableCell>
                      <TableCell>{i.nepaliYear || i.nepaliMonth ? `${i.nepaliYear ?? ""} ${i.nepaliMonth ?? ""}`.trim() : "—"}</TableCell>
                      <TableCell>{i.needsFollowup ? <Badge>Needs follow-up</Badge> : <span className="text-slate-400">—</span>}</TableCell>
                      <TableCell>{hasNumber ? i.guardianPhone : <Badge variant="secondary">No number</Badge>}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-slate-500">No service records match these filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {items.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row">
            <div className="flex items-center gap-3">
              <span>{(page - 1) * limit + 1}–{Math.min(page * limit, items.length)} of {items.length}</span>
              <label className="flex items-center gap-2">
                Rows
                <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft />Previous</Button>
              <span className="px-1">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next<ChevronRight /></Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MessageSquareText size={18} className="text-emerald-600" />Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={message}
            maxLength={MAX_MESSAGE}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write the message to send to guardians…"
            rows={4}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {message.length}/{MAX_MESSAGE} characters
              {segments > 0 && <> · about {segments} SMS per recipient{unicode ? " (Nepali text uses shorter SMS)" : ""}</>}
            </span>
            <span>{uniqueNumbers} unique number{uniqueNumbers === 1 ? "" : "s"} selected</span>
          </div>

          {send.error && <p className="text-sm text-red-600">{(send.error as Error).message}</p>}
          {result && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Request accepted for {result.recipients} number{result.recipients === 1 ? "" : "s"}.</p>
              <p className="mt-0.5 text-xs opacity-80">
                No SMS provider is connected yet, so nothing was actually sent. The server only logged the message.
                {result.skippedNoNumber > 0 && ` ${result.skippedNoNumber} record(s) had no number.`}
                {result.duplicateNumbers > 0 && ` ${result.duplicateNumbers} duplicate number(s) were merged.`}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" disabled={!canSend} onClick={submit}>
              {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}Send SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
