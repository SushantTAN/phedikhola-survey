import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const masterRouter = Router();
masterRouter.use(requireAuth);

masterRouter.get("/reference-data", asyncHandler(async (_req, res) => {
  const [wards, toles, categories, conditions, medicines, units, appVersion] = await Promise.all([
    prisma.ward.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.tole.findMany({ where: { active: true, ward: { active: true }, healthPost: { active: true } }, include: { ward: true, healthPost: true }, orderBy: { name: "asc" } }),
    prisma.citizenCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.healthCondition.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.medicine.findMany({ where: { active: true }, include: { defaultUnit: true }, orderBy: { name: "asc" } }),
    prisma.medicineUnit.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } }),
    prisma.appVersion.findFirst({ where: { platform: "ANDROID" } })
  ]);
  res.json({ success: true, data: { wards, toles, categories, conditions, medicines, units, appVersion, serverTime: new Date().toISOString() } });
}));

masterRouter.get("/medicines", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const medicines = await prisma.medicine.findMany({
    where: q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { genericName: { contains: q, mode: "insensitive" } },
      { strength: { contains: q, mode: "insensitive" } }
    ] } : {},
    include: { defaultUnit: true }, orderBy: { name: "asc" }, take: 500
  });
  res.json({ success: true, data: medicines });
}));
masterRouter.get("/medicines/:id", asyncHandler(async (req, res) => {
  const medicine = await prisma.medicine.findUnique({ where: { id: req.params.id }, include: { defaultUnit: true } });
  if (!medicine) throw new HttpError(404, "MEDICINE_NOT_FOUND", "Medicine not found");
  res.json({ success: true, data: medicine });
}));
masterRouter.post("/medicines", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  if (!name) throw new HttpError(400, "NAME_REQUIRED", "Medicine name is required");
  const code = String(req.body.code ?? name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")).replace(/^_|_$/g, "");
  const medicine = await prisma.medicine.create({ data: {
    code, name, genericName: req.body.genericName || null, strength: req.body.strength || null,
    dosageForm: req.body.dosageForm || null, description: req.body.description || null,
    defaultUnitId: req.body.defaultUnitId || null
  }});
  res.status(201).json({ success: true, data: medicine });
}));
masterRouter.patch("/medicines/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const medicine = await prisma.medicine.update({ where: { id: req.params.id }, data: {
    name: req.body.name, genericName: req.body.genericName, strength: req.body.strength,
    dosageForm: req.body.dosageForm, description: req.body.description,
    defaultUnitId: req.body.defaultUnitId, active: req.body.active
  }});
  res.json({ success: true, data: medicine });
}));
masterRouter.delete("/medicines/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  await prisma.medicine.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ success: true });
}));

masterRouter.get("/wards", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const data = await prisma.ward.findMany({
    where: q ? { OR: [
      { code: { contains: q, mode: "insensitive" } },
      { nameEn: { contains: q, mode: "insensitive" } },
      { nameNe: { contains: q, mode: "insensitive" } },
      { locationNameEn: { contains: q, mode: "insensitive" } },
      { locationNameNe: { contains: q, mode: "insensitive" } }
    ] } : {},
    orderBy: { sortOrder: "asc" }
  });
  res.json({ success: true, data });
}));
masterRouter.get("/wards/:id", asyncHandler(async (req, res) => {
  const ward = await prisma.ward.findUnique({ where: { id: req.params.id }, include: { _count: { select: { services: true, citizens: true, staff: true } } } });
  if (!ward) throw new HttpError(404, "WARD_NOT_FOUND", "Ward not found");
  res.json({ success: true, data: ward });
}));
masterRouter.post("/wards", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  if (!req.body.code || !req.body.nameEn || !req.body.nameNe) throw new HttpError(400, "WARD_FIELDS_REQUIRED", "Code, English name and Nepali name are required");
  const ward = await prisma.ward.create({ data: {
    code: String(req.body.code), nameEn: String(req.body.nameEn), nameNe: String(req.body.nameNe),
    locationNameEn: req.body.locationNameEn || null, locationNameNe: req.body.locationNameNe || null,
    sortOrder: Number(req.body.sortOrder ?? 0), active: req.body.active ?? true
  }});
  res.status(201).json({ success: true, data: ward });
}));
masterRouter.patch("/wards/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const ward = await prisma.ward.update({ where: { id: req.params.id }, data: {
    code: req.body.code, nameEn: req.body.nameEn, nameNe: req.body.nameNe,
    locationNameEn: req.body.locationNameEn, locationNameNe: req.body.locationNameNe,
    sortOrder: req.body.sortOrder, active: req.body.active
  }});
  res.json({ success: true, data: ward });
}));
masterRouter.delete("/wards/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  await prisma.ward.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ success: true });
}));

masterRouter.get("/health-conditions", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.healthCondition.findMany({ orderBy: { sortOrder: "asc" } }) })));
masterRouter.get("/citizen-categories", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.citizenCategory.findMany({ orderBy: { sortOrder: "asc" } }) })));
masterRouter.get("/medicine-units", asyncHandler(async (_req, res) => res.json({ success: true, data: await prisma.medicineUnit.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } }) })));
