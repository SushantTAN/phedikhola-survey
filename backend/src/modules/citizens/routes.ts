import { randomUUID } from "node:crypto";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { requireAuth } from "../../middleware/auth.js";

export const citizenRouter = Router();
citizenRouter.use(requireAuth);

const citizenInclude = {
  categories: { include: { category: true } },
  wards: { include: { ward: true } },
  tole: { include: { ward: true, healthPost: true } },
} as const;

async function validateTole(toleId: string | null, wardIds: string[]) {
  if (!toleId) return;
  const tole = await prisma.tole.findFirst({
    where: {
      id: toleId,
      active: true,
      ward: { active: true },
      healthPost: { active: true },
    },
  });
  if (!tole) throw new HttpError(400, "INVALID_TOLE", "Select an active tole");
  if (!wardIds.includes(tole.wardId))
    throw new HttpError(
      400,
      "TOLE_WARD_MISMATCH",
      "The selected tole must belong to an assigned ward",
    );
}

function coordinate(value: unknown, name: string, limit: number) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > limit)
    throw new HttpError(400, "INVALID_COORDINATE", `Invalid ${name}`);
  return number;
}

function location(body: any) {
  const latitude = coordinate(body.latitude, "latitude", 90);
  const longitude = coordinate(body.longitude, "longitude", 180);
  if (
    (latitude === undefined) !== (longitude === undefined) ||
    (latitude === null) !== (longitude === null)
  ) {
    throw new HttpError(
      400,
      "INCOMPLETE_LOCATION",
      "Latitude and longitude must be provided together",
    );
  }
  return { latitude, longitude };
}

function makePublicId(clientUuid: string) {
  return `PHE-${new Date().getFullYear()}-${clientUuid.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function selectedCategoryIds(body: any): string[] | null {
  if (body.categoryId !== undefined)
    return body.categoryId ? [String(body.categoryId)] : [];
  if (Array.isArray(body.categoryIds))
    return body.categoryIds.map(String).slice(0, 1);
  return null;
}

function selectedWardIds(body: any): string[] | null {
  if (Array.isArray(body.wardIds))
    return [...new Set<string>(body.wardIds.map(String))];
  return null;
}

citizenRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const q = String(req.query.q ?? "").trim();
    const wardId = req.query.wardId ? String(req.query.wardId) : undefined;
    const categoryId = req.query.categoryId
      ? String(req.query.categoryId)
      : undefined;
    const where: any = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { publicId: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
      ...(wardId ? { wards: { some: { wardId } } } : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.citizen.findMany({
        where,
        include: citizenInclude,
        omit: { profilePhotoUrl: true },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.citizen.count({ where }),
    ]);
    res.json({
      success: true,
      data: items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

citizenRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const citizen = await prisma.citizen.findFirst({
      where: {
        OR: [{ id: req.params.id }, { publicId: req.params.id }],
        deletedAt: null,
      },
      include: {
        ...citizenInclude,
        serviceRecords: {
          where: { deletedAt: null },
          include: {
            ward: true,
            createdBy: { select: { id: true, name: true } },
            conditions: { include: { condition: true } },
            medicines: { include: { medicine: true } },
          },
          orderBy: { serviceDate: "desc" },
          take: 100,
        },
      },
    });
    if (!citizen)
      throw new HttpError(404, "CITIZEN_NOT_FOUND", "Citizen not found");
    res.json({ success: true, data: citizen });
  }),
);

citizenRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const fullName = String(req.body.fullName ?? "").trim();
    if (!fullName)
      throw new HttpError(400, "FULL_NAME_REQUIRED", "Full name is required");
    const categoryIds = selectedCategoryIds(req.body) ?? [];
    const wardIds = selectedWardIds(req.body) ?? [];
    const toleId = req.body.toleId ? String(req.body.toleId) : null;
    await validateTole(toleId, wardIds);
    const clientUuid = String(req.body.clientUuid ?? randomUUID());
    const citizen = await prisma.citizen.create({
      data: {
        clientUuid,
        publicId: String(req.body.publicId ?? makePublicId(clientUuid)),
        fullName,
        dateOfBirth: req.body.dateOfBirth
          ? new Date(req.body.dateOfBirth)
          : null,
        approximateAge:
          req.body.approximateAge == null || req.body.approximateAge === ""
            ? null
            : Number(req.body.approximateAge),
        gender: req.body.gender ?? "OTHER",
        phone: req.body.phone || null,
        guardianPhone: req.body.guardianPhone ? String(req.body.guardianPhone).trim() : null,
        ...location(req.body),
        casteGroupCode: req.body.casteGroupCode || null,
        casteOther: req.body.casteOther || null,
        maritalStatusCode: req.body.maritalStatusCode || null,
        occupationCode: req.body.occupationCode || null,
        occupationOther: req.body.occupationOther || null,
        livingStatusCode: req.body.livingStatusCode || null,
        householdForeignEmployment:
          typeof req.body.householdForeignEmployment === "boolean"
            ? req.body.householdForeignEmployment
            : null,
        profilePhotoUrl: req.body.profilePhotoUrl || null,
        createdById: req.user!.sub,
        toleId,
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
        wards: { create: wardIds.map((wardId) => ({ wardId })) },
      },
      include: citizenInclude,
    });
    res.status(201).json({ success: true, data: citizen });
  }),
);

citizenRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const current = await prisma.citizen.findUnique({
      where: { id: req.params.id },
    });
    if (!current)
      throw new HttpError(404, "CITIZEN_NOT_FOUND", "Citizen not found");
    if (req.body.version && Number(req.body.version) !== current.version)
      throw new HttpError(
        409,
        "SYNC_CONFLICT",
        "Citizen was updated elsewhere",
      );
    const categoryIds = selectedCategoryIds(req.body);
    const wardIds = selectedWardIds(req.body);
    const toleId =
      req.body.toleId === undefined
        ? current.toleId
        : req.body.toleId
          ? String(req.body.toleId)
          : null;
    if (req.body.toleId !== undefined || wardIds) {
      const assignedWardIds =
        wardIds ??
        (
          await prisma.citizenWardAssignment.findMany({
            where: { citizenId: current.id },
            select: { wardId: true },
          })
        ).map((x) => x.wardId);
      await validateTole(toleId, assignedWardIds);
    }
    const citizen = await prisma.$transaction(async (tx) => {
      if (categoryIds) {
        await tx.citizenCategoryAssignment.deleteMany({
          where: { citizenId: current.id },
        });
        if (categoryIds.length)
          await tx.citizenCategoryAssignment.createMany({
            data: categoryIds.map((categoryId) => ({
              citizenId: current.id,
              categoryId,
            })),
          });
      }
      if (wardIds) {
        await tx.citizenWardAssignment.deleteMany({
          where: { citizenId: current.id },
        });
        if (wardIds.length)
          await tx.citizenWardAssignment.createMany({
            data: wardIds.map((wardId) => ({ citizenId: current.id, wardId })),
          });
      }
      return tx.citizen.update({
        where: { id: current.id },
        data: {
          fullName: req.body.fullName,
          dateOfBirth:
            req.body.dateOfBirth === ""
              ? null
              : req.body.dateOfBirth
                ? new Date(req.body.dateOfBirth)
                : undefined,
          approximateAge:
            req.body.approximateAge === "" ? null : req.body.approximateAge,
          gender: req.body.gender,
          phone: req.body.phone,
          guardianPhone:
            req.body.guardianPhone === undefined
              ? undefined
              : String(req.body.guardianPhone ?? "").trim() || null,
          ...location(req.body),
          casteGroupCode: req.body.casteGroupCode,
          casteOther: req.body.casteOther,
          maritalStatusCode: req.body.maritalStatusCode,
          occupationCode: req.body.occupationCode,
          occupationOther: req.body.occupationOther,
          livingStatusCode: req.body.livingStatusCode,
          householdForeignEmployment: req.body.householdForeignEmployment,
          profilePhotoUrl: req.body.profilePhotoUrl,
          toleId: req.body.toleId === undefined ? undefined : toleId,
          version: { increment: 1 },
        },
        include: citizenInclude,
      });
    });
    res.json({ success: true, data: citizen });
  }),
);

citizenRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.citizen.update({
      where: { id: req.params.id },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
        version: { increment: 1 },
      },
    });
    res.json({ success: true });
  }),
);
