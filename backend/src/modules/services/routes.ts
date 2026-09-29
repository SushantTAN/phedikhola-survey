import { randomUUID } from "node:crypto";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";

export const serviceRouter = Router();
serviceRouter.use(requireAuth);

const include = {
  citizen: { select: { id: true, publicId: true, fullName: true, phone: true } },
  ward: true,
  createdBy: { select: { id: true, name: true } },
  conditions: { include: { condition: true } },
  medicines: { include: { medicine: true } }
} as const;

serviceRouter.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const q = String(req.query.q ?? "").trim();
  const citizenId = req.query.citizenId ? String(req.query.citizenId) : undefined;
  const wardId = req.query.wardId ? String(req.query.wardId) : undefined;
  const where: any = {
    deletedAt: null,
    ...(citizenId ? { citizenId } : {}),
    ...(wardId ? { wardId } : {}),
    ...(q ? { citizen: { OR: [
      { fullName: { contains: q, mode: "insensitive" } },
      { publicId: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } }
    ] } } : {})
  };
  const [items, total] = await Promise.all([
    prisma.citizenServiceRecord.findMany({ where, include, orderBy: { serviceDate: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.citizenServiceRecord.count({ where })
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

serviceRouter.get("/:id", asyncHandler(async (req, res) => {
  const record = await prisma.citizenServiceRecord.findUnique({ where: { id: req.params.id }, include });
  if (!record || record.deletedAt) throw new HttpError(404, "SERVICE_NOT_FOUND", "Service record not found");
  res.json({ success: true, data: record });
}));

serviceRouter.post("/", asyncHandler(async (req, res) => {
  const conditions = Array.isArray(req.body.conditionIds) ? req.body.conditionIds.map(String) : [];
  const medicines = Array.isArray(req.body.medicines) ? req.body.medicines : [];
  if (!req.body.citizenId || !req.body.wardId) throw new HttpError(400, "SERVICE_FIELDS_REQUIRED", "Citizen and ward are required");
  const record = await prisma.citizenServiceRecord.create({
    data: {
      clientUuid: String(req.body.clientUuid ?? randomUUID()),
      citizenId: String(req.body.citizenId),
      wardId: String(req.body.wardId),
      createdById: req.user!.sub,
      serviceType: req.body.serviceType || "SENIOR_CITIZEN_HEALTH",
      serviceDate: req.body.serviceDate ? new Date(req.body.serviceDate) : new Date(),
      nepaliYear: req.body.nepaliYear == null || req.body.nepaliYear === "" ? null : Number(req.body.nepaliYear),
      nepaliMonth: req.body.nepaliMonth || null,
      systolic: req.body.systolic == null || req.body.systolic === "" ? null : Number(req.body.systolic),
      diastolic: req.body.diastolic == null || req.body.diastolic === "" ? null : Number(req.body.diastolic),
      pulseRate: req.body.pulseRate == null || req.body.pulseRate === "" ? null : Number(req.body.pulseRate),
      temperatureF: req.body.temperatureF === "" ? null : req.body.temperatureF ?? null,
      latitude: req.body.latitude === "" ? null : req.body.latitude ?? null,
      longitude: req.body.longitude === "" ? null : req.body.longitude ?? null,
      altitude: req.body.altitude === "" ? null : req.body.altitude ?? null,
      accuracy: req.body.accuracy === "" ? null : req.body.accuracy ?? null,
      notes: req.body.notes || null,
      otherHealthProblem: req.body.otherHealthProblem || null,
      visitPhotoUrl: req.body.visitPhotoUrl || null,
      conditions: { create: conditions.map(conditionId => ({ conditionId })) },
      medicines: { create: medicines.map((m: any) => ({
        medicineId: m.medicineId || null,
        quantity: String(m.quantity),
        unit: String(m.unit || "unit"),
        otherMedicineName: m.otherMedicineName || null
      })) }
    },
    include
  });
  res.status(201).json({ success: true, data: record });
}));

serviceRouter.patch("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.citizenServiceRecord.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "SERVICE_NOT_FOUND", "Service record not found");
  if (req.body.version && Number(req.body.version) !== existing.version) throw new HttpError(409, "SYNC_CONFLICT", "Service record was updated elsewhere");
  const conditionIds: string[] | null = Array.isArray(req.body.conditionIds) ? req.body.conditionIds.map(String) : null;
  const medicines: any[] | null = Array.isArray(req.body.medicines) ? req.body.medicines : null;
  const record = await prisma.$transaction(async tx => {
    if (conditionIds) {
      await tx.serviceHealthCondition.deleteMany({ where: { serviceId: existing.id } });
      if (conditionIds.length) await tx.serviceHealthCondition.createMany({ data: conditionIds.map(conditionId => ({ serviceId: existing.id, conditionId })) });
    }
    if (medicines) {
      await tx.serviceMedicine.deleteMany({ where: { serviceId: existing.id } });
      if (medicines.length) await tx.serviceMedicine.createMany({ data: medicines.map(m => ({
        serviceId: existing.id,
        medicineId: m.medicineId || null,
        quantity: String(m.quantity),
        unit: String(m.unit || "unit"),
        otherMedicineName: m.otherMedicineName || null
      })) });
    }
    return tx.citizenServiceRecord.update({
      where: { id: existing.id },
      data: {
        citizenId: req.body.citizenId,
        wardId: req.body.wardId,
        serviceDate: req.body.serviceDate ? new Date(req.body.serviceDate) : undefined,
        nepaliYear: req.body.nepaliYear === "" ? null : req.body.nepaliYear,
        nepaliMonth: req.body.nepaliMonth,
        systolic: req.body.systolic === "" ? null : req.body.systolic,
        diastolic: req.body.diastolic === "" ? null : req.body.diastolic,
        pulseRate: req.body.pulseRate === "" ? null : req.body.pulseRate,
        temperatureF: req.body.temperatureF === "" ? null : req.body.temperatureF,
        latitude: req.body.latitude === "" ? null : req.body.latitude,
        longitude: req.body.longitude === "" ? null : req.body.longitude,
        altitude: req.body.altitude === "" ? null : req.body.altitude,
        accuracy: req.body.accuracy === "" ? null : req.body.accuracy,
        notes: req.body.notes,
        otherHealthProblem: req.body.otherHealthProblem,
        visitPhotoUrl: req.body.visitPhotoUrl,
        version: { increment: 1 }
      },
      include
    });
  });
  res.json({ success: true, data: record });
}));

serviceRouter.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.citizenServiceRecord.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: "ARCHIVED", version: { increment: 1 } } });
  res.json({ success: true });
}));
