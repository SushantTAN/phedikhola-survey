import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { env } from "../../config/env.js";

export const publicRouter = Router();

publicRouter.post("/citizen-lookup", asyncHandler(async (req, res) => {
  const publicId = String(req.body.publicId ?? "").trim().toUpperCase();
  if (!publicId) throw new HttpError(400, "PUBLIC_ID_REQUIRED", "Citizen ID is required");
  const citizen = await prisma.citizen.findUnique({ where: { publicId }, include: {
    categories: { include: { category: true } },
    wards: { include: { ward: true } },
    serviceRecords: {
      where: { deletedAt: null }, orderBy: { serviceDate: "desc" }, take: 100,
      include: { ward: true, conditions: { include: { condition: true } }, medicines: { include: { medicine: true } } }
    }
  }});
  if (!citizen || citizen.deletedAt) throw new HttpError(404, "CITIZEN_NOT_FOUND", "Citizen not found");
  if (env.publicLookupRequireDob) {
    const dob = req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null;
    if (!dob || !citizen.dateOfBirth || dob.toISOString().slice(0, 10) !== citizen.dateOfBirth.toISOString().slice(0, 10)) {
      throw new HttpError(403, "VERIFICATION_FAILED", "Citizen verification failed");
    }
  }
  res.json({ success: true, data: {
    publicId: citizen.publicId, fullName: citizen.fullName, dateOfBirth: citizen.dateOfBirth,
    approximateAge: citizen.approximateAge, gender: citizen.gender, profilePhotoUrl: citizen.profilePhotoUrl, categories: citizen.categories.map(c => c.category), wards: citizen.wards.map(w => w.ward),
    serviceRecords: citizen.serviceRecords.map(s => ({
      id: s.id, serviceDate: s.serviceDate, nepaliYear: s.nepaliYear, nepaliMonth: s.nepaliMonth,
      ward: s.ward, systolic: s.systolic, diastolic: s.diastolic, pulseRate: s.pulseRate,
      temperatureF: s.temperatureF, conditions: s.conditions.map(c => c.condition),
      medicines: s.medicines.map(m => ({ name: m.medicine?.name ?? m.otherMedicineName, quantity: m.quantity, unit: m.unit }))
    }))
  }});
}));

publicRouter.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
