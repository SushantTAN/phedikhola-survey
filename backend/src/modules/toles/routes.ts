import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";

export const toleRouter = Router();
toleRouter.use(requireAuth);

const include = { ward: true, healthPost: true, _count: { select: { citizens: true } } } as const;

async function validateLocation(wardId: string, healthPostId: string) {
  const [ward, healthPost] = await Promise.all([
    prisma.ward.findFirst({ where: { id: wardId, active: true } }),
    prisma.healthPost.findFirst({ where: { id: healthPostId, active: true } })
  ]);
  if (!ward) throw new HttpError(400, "INVALID_WARD", "Select an active ward");
  if (!healthPost || healthPost.wardId !== wardId) throw new HttpError(400, "INVALID_HEALTH_POST", "Select an active health post in the ward");
}

async function checkDuplicate(name: string, wardId: string, excludeId?: string) {
  const existing = await prisma.tole.findFirst({ where: {
    wardId, name: { equals: name, mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {})
  } });
  if (existing) throw new HttpError(409, "TOLE_EXISTS", "A tole with this name already exists in the ward");
}

toleRouter.get("/", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const wardId = req.query.wardId ? String(req.query.wardId) : undefined;
  const data = await prisma.tole.findMany({
    where: {
      ...(wardId ? { wardId } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { healthPost: { name: { contains: q, mode: "insensitive" } } },
        { ward: { OR: [
          { code: { contains: q, mode: "insensitive" } },
          { nameEn: { contains: q, mode: "insensitive" } },
          { nameNe: { contains: q, mode: "insensitive" } }
        ] } }
      ] } : {})
    },
    include,
    orderBy: { name: "asc" }
  });
  res.json({ success: true, data });
}));

toleRouter.get("/:id", asyncHandler(async (req, res) => {
  const data = await prisma.tole.findUnique({ where: { id: String(req.params.id) }, include });
  if (!data) throw new HttpError(404, "TOLE_NOT_FOUND", "Tole not found");
  res.json({ success: true, data });
}));

toleRouter.post("/", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const wardId = String(req.body.wardId ?? "").trim();
  const healthPostId = String(req.body.healthPostId ?? "").trim();
  if (!name || !wardId || !healthPostId) throw new HttpError(400, "TOLE_FIELDS_REQUIRED", "Name, ward and health post are required");
  await validateLocation(wardId, healthPostId);
  await checkDuplicate(name, wardId);
  const data = await prisma.tole.create({ data: { name, wardId, healthPostId }, include });
  res.status(201).json({ success: true, data });
}));

toleRouter.patch("/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const current = await prisma.tole.findUnique({ where: { id: String(req.params.id) }, include: { _count: { select: { citizens: true } } } });
  if (!current) throw new HttpError(404, "TOLE_NOT_FOUND", "Tole not found");
  const name = String(req.body.name ?? current.name).trim();
  const wardId = String(req.body.wardId ?? current.wardId).trim();
  const healthPostId = String(req.body.healthPostId ?? current.healthPostId).trim();
  if (!name || !wardId || !healthPostId) throw new HttpError(400, "TOLE_FIELDS_REQUIRED", "Name, ward and health post are required");
  await validateLocation(wardId, healthPostId);
  await checkDuplicate(name, wardId, current.id);
  if (wardId !== current.wardId && current._count.citizens) throw new HttpError(400, "TOLE_HAS_CITIZENS", "Move citizens to another tole before changing its ward");
  const data = await prisma.tole.update({ where: { id: current.id }, data: { name, wardId, healthPostId, active: req.body.active }, include });
  res.json({ success: true, data });
}));

toleRouter.delete("/:id", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  await prisma.tole.update({ where: { id: String(req.params.id) }, data: { active: false } });
  res.json({ success: true });
}));
