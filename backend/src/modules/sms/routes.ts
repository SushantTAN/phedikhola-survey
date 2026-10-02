import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { sendBulkSms, type SmsRecipient } from "../../lib/sms.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const smsRouter = Router();
smsRouter.use(requireAuth, requireRole("ADMIN"));

const MAX_RECIPIENTS = 5000;
const MAX_MESSAGE_LENGTH = 1000;
const normalizePhone = (phone: string) => phone.replace(/[\s-]/g, "");

// Service records for the Bulk SMS screen, filtered by the Nepali year/month stored on each record.
smsRouter.get("/recipients", asyncHandler(async (req, res) => {
  const year = req.query.nepaliYear ? Number(req.query.nepaliYear) : undefined;
  const month = req.query.nepaliMonth ? String(req.query.nepaliMonth).trim() : undefined;
  const followup = req.query.needsFollowup === "yes" ? true : req.query.needsFollowup === "no" ? false : undefined;
  if (year !== undefined && !Number.isInteger(year)) throw new HttpError(400, "INVALID_YEAR", "Invalid Nepali year");

  const [records, yearRows] = await Promise.all([
    prisma.citizenServiceRecord.findMany({
      where: {
        deletedAt: null,
        ...(year !== undefined ? { nepaliYear: year } : {}),
        ...(month ? { nepaliMonth: { equals: month, mode: "insensitive" } } : {}),
        ...(followup !== undefined ? { needsFollowup: followup } : {})
      },
      select: {
        id: true, serviceDate: true, nepaliYear: true, nepaliMonth: true, guardianPhone: true, needsFollowup: true,
        citizen: { select: { id: true, publicId: true, fullName: true } },
        ward: { select: { nameEn: true, nameNe: true } }
      },
      orderBy: { serviceDate: "desc" },
      take: MAX_RECIPIENTS
    }),
    prisma.citizenServiceRecord.groupBy({ by: ["nepaliYear"], where: { deletedAt: null, nepaliYear: { not: null } }, orderBy: { nepaliYear: "desc" } })
  ]);

  res.json({ success: true, data: {
    items: records.map(r => ({
      id: r.id,
      serviceDate: r.serviceDate,
      nepaliYear: r.nepaliYear,
      nepaliMonth: r.nepaliMonth,
      guardianPhone: r.guardianPhone,
      needsFollowup: r.needsFollowup,
      citizen: r.citizen,
      ward: r.ward
    })),
    years: yearRows.flatMap(y => (y.nepaliYear == null ? [] : [y.nepaliYear]))
  }});
}));

// Sends one message to the guardian mobile number of each selected service record.
smsRouter.post("/bulk", asyncHandler(async (req, res) => {
  const message = String(req.body.message ?? "").trim();
  const ids: string[] = Array.isArray(req.body.serviceIds) ? [...new Set<string>(req.body.serviceIds.map(String))] : [];
  if (!message) throw new HttpError(400, "MESSAGE_REQUIRED", "Message is required");
  if (message.length > MAX_MESSAGE_LENGTH) throw new HttpError(400, "MESSAGE_TOO_LONG", `Message can be at most ${MAX_MESSAGE_LENGTH} characters`);
  if (!ids.length) throw new HttpError(400, "NO_RECORDS", "Select at least one service record");
  if (ids.length > MAX_RECIPIENTS) throw new HttpError(400, "TOO_MANY_RECORDS", `Select at most ${MAX_RECIPIENTS} records at a time`);

  const records = await prisma.citizenServiceRecord.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, guardianPhone: true, citizen: { select: { fullName: true } } }
  });

  // One message per number, even when a guardian appears on several records.
  const byNumber = new Map<string, SmsRecipient>();
  let withoutNumber = 0;
  for (const r of records) {
    const phone = r.guardianPhone ? normalizePhone(r.guardianPhone) : "";
    if (!phone) { withoutNumber++; continue; }
    if (!byNumber.has(phone)) byNumber.set(phone, { phone, citizenName: r.citizen.fullName, serviceId: r.id });
  }
  const recipients = [...byNumber.values()];
  if (!recipients.length) throw new HttpError(400, "NO_PHONE_NUMBERS", "None of the selected records has a guardian mobile number");

  const result = await sendBulkSms({ recipients, message });
  res.json({ success: true, data: {
    selected: ids.length,
    found: records.length,
    skippedNoNumber: withoutNumber,
    duplicateNumbers: records.length - withoutNumber - recipients.length,
    recipients: recipients.length,
    accepted: result.accepted
  }});
}));
