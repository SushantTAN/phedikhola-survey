"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChartSpec = {
  id: string;
  title: string;
  type: "bar" | "stackedBar" | "pie" | "line";
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string }>;
};

const COLORS = ["#059669", "#0f766e", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b", "#ec4899"];

function Chart({ spec }: { spec: ChartSpec }) {
  const axis = { tick: { fontSize: 12 } };
  if (spec.type === "pie") {
    const key = spec.series[0]?.key ?? "count";
    return (
      <PieChart>
        <Pie data={spec.data} dataKey={key} nameKey="name" outerRadius={95} innerRadius={45}>
          {spec.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    );
  }
  if (spec.type === "line") {
    return (
      <LineChart data={spec.data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip />
        {spec.series.length > 1 && <Legend />}
        {spec.series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot />)}
      </LineChart>
    );
  }
  return (
    <BarChart data={spec.data}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="name" interval={0} angle={spec.data.length > 6 ? -25 : 0} textAnchor={spec.data.length > 6 ? "end" : "middle"} height={spec.data.length > 6 ? 70 : 30} {...axis} />
      <YAxis allowDecimals={false} {...axis} />
      <Tooltip />
      {spec.series.length > 1 && <Legend />}
      {spec.series.map((s, i) => (
        <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} stackId={spec.type === "stackedBar" ? "a" : undefined} radius={spec.type === "stackedBar" ? 0 : [6, 6, 0, 0]} />
      ))}
    </BarChart>
  );
}

export function ReportChart({ spec }: { spec: ChartSpec }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><BarChart3 size={18} className="text-emerald-600" />{spec.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {spec.data.length ? (
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><Chart spec={spec} /></ResponsiveContainer></div>
        ) : (
          <p className="grid h-72 place-items-center text-sm text-slate-500">No data for the selected filters.</p>
        )}
      </CardContent>
    </Card>
  );
}
