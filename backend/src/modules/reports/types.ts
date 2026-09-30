export type ReportFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  wardId?: string;
  gender?: string;
  ageGroup?: string;
  categoryId?: string;
  conditionId?: string;
  medicineId?: string;
  staffId?: string;
  followup?: "yes" | "no";
  q?: string;
};

export type FilterKey = keyof ReportFilters;
export type FilterOptionsSource = "wards" | "categories" | "conditions" | "medicines" | "staff" | "gender" | "ageGroup" | "followup";
export type FilterDef = { key: FilterKey; label: string; type: "date" | "select" | "text"; options?: FilterOptionsSource };

export type Column = { key: string; label: string; type?: "text" | "number" | "date" | "boolean" };
export type Row = Record<string, string | number | boolean | null>;

export type ChartSpec = {
  id: string;
  title: string;
  type: "bar" | "stackedBar" | "pie" | "line";
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string }>;
};

export type ReportResult = {
  columns: Column[];
  rows: Row[];
  summary?: Array<{ label: string; value: string | number }>;
  charts?: ChartSpec[];
};

export type ReportDef = {
  key: string;
  group: string;
  title: string;
  description: string;
  filters: FilterDef[];
  run: (filters: ReportFilters) => Promise<ReportResult>;
};
