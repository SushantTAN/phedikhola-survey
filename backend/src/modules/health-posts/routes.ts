import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const healthPostRouter = Router();
healthPostRouter.use(requireAuth);

const include = { ward: true, _count: { select: { staff: true } } } as const;

function coordinate(value: unknown, name: string, limit: number) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit)
    throw new HttpError(400, "INVALID_COORDINATE", `Invalid ${name}`);
  return n;
}

function location(body: any) {
  const latitude = coordinate(body.latitude, "latitude", 90);
  const longitude = coordinate(body.longitude, "longitude", 180);
  if (
    (latitude == null) !== (longitude == null) &&
    latitude !== undefined &&
    longitude !== undefined
  ) {
    throw new HttpError(
      400,
      "INCOMPLETE_LOCATION",
      "Latitude and longitude must be provided together",
    );
  }
  return { latitude, longitude };
}

healthPostRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const wardId = req.query.wardId ? String(req.query.wardId) : undefined;
    const activeOnly = req.query.active === "true";
    const items = await prisma.healthPost.findMany({
      where: {
        ...(activeOnly ? { active: true } : {}),
        ...(wardId ? { wardId } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include,
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: items });
  }),
);

healthPostRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.healthPost.findUnique({
      where: { id: String(req.params.id) },
      include,
    });
    if (!item)
      throw new HttpError(
        404,
        "HEALTH_POST_NOT_FOUND",
        "Health post not found",
      );
    res.json({ success: true, data: item });
  }),
);

healthPostRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const name = String(req.body.name ?? "").trim();
    if (!name || !req.body.wardId)
      throw new HttpError(
        400,
        "HEALTH_POST_FIELDS_REQUIRED",
        "Name and ward are required",
      );
    const item = await prisma.healthPost.create({
      data: { name, wardId: String(req.body.wardId), ...location(req.body) },
      include,
    });
    res.status(201).json({ success: true, data: item });
  }),
);

healthPostRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const current = await prisma.healthPost.findUnique({
      where: { id: String(req.params.id) },
      select: { wardId: true, _count: { select: { toles: true } } },
    });
    if (!current)
      throw new HttpError(
        404,
        "HEALTH_POST_NOT_FOUND",
        "Health post not found",
      );
    if (
      req.body.wardId &&
      req.body.wardId !== current.wardId &&
      current._count.toles
    )
      throw new HttpError(
        400,
        "HEALTH_POST_HAS_TOLES",
        "Move its toles before changing the health post ward",
      );
    const name =
      req.body.name === undefined ? undefined : String(req.body.name).trim();
    if (name === "")
      throw new HttpError(
        400,
        "HEALTH_POST_FIELDS_REQUIRED",
        "Name is required",
      );
    const item = await prisma.healthPost.update({
      where: { id: String(req.params.id) },
      data: {
        name,
        wardId: req.body.wardId || undefined,
        ...location(req.body),
        active: req.body.active,
      },
      include,
    });
    res.json({ success: true, data: item });
  }),
);

healthPostRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.healthPost.update({
      where: { id: String(req.params.id) },
      data: { active: false },
    });
    res.json({ success: true });
  }),
);
