import { reports as baseReports } from "./definitions.js";
import { additionalReports } from "./additional.js";

export const reports = [...baseReports, ...additionalReports];
export const reportRegistry = new Map(reports.map((r) => [r.key, r]));
