import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const syncRouter = Router();
syncRouter.use(requireAuth, requireRole("STAFF", "ADMIN"));

// Older app versions do not send newer fields; `undefined` leaves the stored value untouched.
const optionalText = (v: unknown) =>
  v === undefined ? undefined : String(v ?? "").trim() || null;

function optionalCoordinate(v: unknown, name: string, limit: number) {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || Math.abs(n) > limit)
    throw new Error(`Invalid ${name}`);
  return n;
}

type SyncResult = {
  clientUuid: string;
  status: "synced" | "conflict" | "failed";
  serverId?: string;
  publicId?: string;
  version?: number;
  error?: string;
};

function allocatePublicId(clientUuid: string) {
  return `PHE-${new Date().getFullYear()}-${clientUuid.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

syncRouter.post(
  "/push",
  asyncHandler(async (req, res) => {
    const deviceId = String(req.body.deviceId ?? "unknown");
    const citizens = Array.isArray(req.body.citizens) ? req.body.citizens : [];
    const services = Array.isArray(req.body.serviceRecords)
      ? req.body.serviceRecords
      : [];
    const citizenResults: SyncResult[] = [];
    const serviceResults: SyncResult[] = [];

    for (const item of citizens) {
      try {
        const clientUuid = String(item.clientUuid);
        const existing = await prisma.citizen.findUnique({
          where: { clientUuid },
        });
        if (
          existing &&
          item.version &&
          Number(item.version) < existing.version
        ) {
          citizenResults.push({
            clientUuid,
            status: "conflict",
            serverId: existing.id,
            publicId: existing.publicId,
            version: existing.version,
          });
          continue;
        }
        const data: any = {
          fullName: item.fullName,
          dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : null,
          approximateAge:
            item.approximateAge == null ? null : Number(item.approximateAge),
          gender: item.gender || "OTHER",
          phone: item.phone || null,
          guardianPhone: optionalText(item.guardianPhone),
          toleId: item.toleId === undefined ? undefined : item.toleId || null,
          wardId: item.wardId === undefined ? undefined : item.wardId || null,
          latitude: optionalCoordinate(item.latitude, "latitude", 90),
          longitude: optionalCoordinate(item.longitude, "longitude", 180),
          casteGroupCode: item.casteGroupCode || null,
          casteOther: item.casteOther || null,
          maritalStatusCode: item.maritalStatusCode || null,
          occupationCode: item.occupationCode || null,
          occupationOther: item.occupationOther || null,
          livingStatusCode: item.livingStatusCode || null,
          householdForeignEmployment:
            item.householdForeignEmployment == null
              ? null
              : Boolean(item.householdForeignEmployment),
          profilePhotoUrl: item.profilePhotoUrl || undefined,
          createdById: req.user!.sub,
        };
        let saved;
        if (!existing) {
          saved = await prisma.citizen.create({
            data: {
              ...data,
              clientUuid,
              publicId: item.publicId || allocatePublicId(clientUuid),
            },
          });
        } else {
          saved = await prisma.citizen.update({
            where: { id: existing.id },
            data: {
              ...data,
              version: { increment: 1 },
              deletedAt: item.deletedAt ? new Date(item.deletedAt) : undefined,
            },
          });
        }
        const categoryIds = item.categoryId
          ? [String(item.categoryId)]
          : Array.isArray(item.categoryIds)
            ? item.categoryIds.map(String).slice(0, 1)
            : null;
        if (categoryIds) {
          await prisma.$transaction(async (tx) => {
            if (categoryIds) {
              await tx.citizenCategoryAssignment.deleteMany({
                where: { citizenId: saved.id },
              });
              if (categoryIds.length)
                await tx.citizenCategoryAssignment.createMany({
                  data: categoryIds.map((categoryId: string) => ({
                    citizenId: saved.id,
                    categoryId,
                  })),
                });
            }
          });
        }
        citizenResults.push({
          clientUuid,
          status: "synced",
          serverId: saved.id,
          publicId: saved.publicId,
          version: saved.version,
        });
      } catch (error) {
        citizenResults.push({
          clientUuid: String(item.clientUuid ?? "unknown"),
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    for (const item of services) {
      try {
        const clientUuid = String(item.clientUuid);
        const existing = await prisma.citizenServiceRecord.findUnique({
          where: { clientUuid },
        });
        if (
          existing &&
          item.version &&
          Number(item.version) < existing.version
        ) {
          serviceResults.push({
            clientUuid,
            status: "conflict",
            serverId: existing.id,
            version: existing.version,
          });
          continue;
        }
        const citizen = item.citizenClientUuid
          ? await prisma.citizen.findUnique({
              where: { clientUuid: String(item.citizenClientUuid) },
            })
          : await prisma.citizen.findUnique({
              where: { id: String(item.citizenId) },
            });
        if (!citizen) throw new Error("Citizen dependency has not been synced");
        const base: any = {
          citizenId: citizen.id,
          wardId: String(item.wardId),
          createdById: req.user!.sub,
          serviceType: item.serviceType || "SENIOR_CITIZEN_HEALTH",
          serviceDate: item.serviceDate
            ? new Date(item.serviceDate)
            : new Date(),
          nepaliYear: item.nepaliYear == null ? null : Number(item.nepaliYear),
          nepaliMonth: item.nepaliMonth || null,
          systolic: item.systolic == null ? null : Number(item.systolic),
          diastolic: item.diastolic == null ? null : Number(item.diastolic),
          pulseRate: item.pulseRate == null ? null : Number(item.pulseRate),
          temperatureF: item.temperatureF ?? null,
          latitude: item.latitude ?? null,
          longitude: item.longitude ?? null,
          altitude: item.altitude ?? null,
          accuracy: item.accuracy ?? null,
          notes: item.notes || null,
          otherHealthProblem: item.otherHealthProblem || null,
          guardianPhone: optionalText(item.guardianPhone),
          visitPhotoUrl: item.visitPhotoUrl || undefined,
          needsFollowup:
            item.needsFollowup === undefined
              ? undefined
              : item.needsFollowup === true ||
                item.needsFollowup === "true" ||
                item.needsFollowup === 1,
        };
        const saved = existing
          ? await prisma.citizenServiceRecord.update({
              where: { id: existing.id },
              data: {
                ...base,
                version: { increment: 1 },
                deletedAt: item.deletedAt
                  ? new Date(item.deletedAt)
                  : undefined,
              },
            })
          : await prisma.citizenServiceRecord.create({
              data: { ...base, clientUuid },
            });

        await prisma.$transaction(async (tx) => {
          await tx.serviceHealthCondition.deleteMany({
            where: { serviceId: saved.id },
          });
          if (Array.isArray(item.conditionIds) && item.conditionIds.length) {
            await tx.serviceHealthCondition.createMany({
              data: item.conditionIds.map((conditionId: string) => ({
                serviceId: saved.id,
                conditionId,
              })),
            });
          }
          await tx.serviceMedicine.deleteMany({
            where: { serviceId: saved.id },
          });
          if (Array.isArray(item.medicines) && item.medicines.length) {
            await tx.serviceMedicine.createMany({
              data: item.medicines.map((m: any) => ({
                serviceId: saved.id,
                medicineId: m.medicineId || null,
                quantity: String(m.quantity),
                unit: String(m.unit || "unit"),
                otherMedicineName: m.otherMedicineName || null,
              })),
            });
          }
        });
        serviceResults.push({
          clientUuid,
          status: "synced",
          serverId: saved.id,
          version: saved.version,
        });
      } catch (error) {
        serviceResults.push({
          clientUuid: String(item.clientUuid ?? "unknown"),
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const failed = [...citizenResults, ...serviceResults].filter(
      (r) => r.status === "failed",
    ).length;
    await prisma.syncLog.create({
      data: {
        userId: req.user!.sub,
        deviceId,
        status: failed ? "FAILED" : "SYNCED",
        pushedCount:
          citizenResults.filter((r) => r.status === "synced").length +
          serviceResults.filter((r) => r.status === "synced").length,
        error: failed ? `${failed} records failed` : null,
      },
    });
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { lastSyncAt: new Date() },
    });
    res.json({
      success: true,
      data: {
        citizens: citizenResults,
        serviceRecords: serviceResults,
        serverTime: new Date().toISOString(),
      },
    });
  }),
);

const PULL_PAGE_SIZE = 1000;
// Apps that do not ask for paging (older releases) keep getting one large response, as before.
const LEGACY_PULL_LIMIT = 5000;

// Returns changes after `since`, oldest first. With `paged=true` the response is split into pages: the client keeps
// calling with `nextSince` (and inclusive=true) while `hasMore` is true, so large datasets are not silently cut off.
syncRouter.get(
  "/pull",
  asyncHandler(async (req, res) => {
    // Taken before reading so a record changed while this request runs is picked up by the next pull.
    const serverTime = new Date();
    const since = req.query.since ? new Date(String(req.query.since)) : new Date(0);
    const range = req.query.inclusive === "true" ? { gte: since } : { gt: since };
    const withReference = req.query.reference !== "false";
    const paged = req.query.paged === "true";
    const limit = paged ? PULL_PAGE_SIZE : LEGACY_PULL_LIMIT;

    const [citizens, services, referenceData] = await Promise.all([
      prisma.citizen.findMany({
        where: { updatedAt: range },
        include: { categories: true },
        orderBy: { updatedAt: "asc" },
        take: limit,
      }),
      prisma.citizenServiceRecord.findMany({
        where: { updatedAt: range },
        include: { conditions: true, medicines: true },
        orderBy: { updatedAt: "asc" },
        take: limit,
      }),
      withReference
        ? Promise.all([
            prisma.ward.findMany({ where: { active: true } }),
            prisma.citizenCategory.findMany({ where: { active: true } }),
            prisma.healthCondition.findMany({ where: { active: true } }),
            prisma.medicine.findMany({
              where: { active: true },
              include: { defaultUnit: true },
            }),
            prisma.medicineUnit.findMany({ where: { active: true } }),
            prisma.tole.findMany({
              where: {
                active: true,
                ward: { active: true },
                healthPost: { active: true },
              },
              select: { id: true, name: true, wardId: true, healthPostId: true },
              orderBy: { name: "asc" },
            }),
            prisma.appVersion.findFirst({ where: { platform: "ANDROID" } }),
          ])
        : null,
    ]);

    const cursors: number[] = [];
    if (paged && citizens.length === limit)
      cursors.push(citizens[citizens.length - 1]!.updatedAt.getTime());
    if (paged && services.length === limit)
      cursors.push(services[services.length - 1]!.updatedAt.getTime());
    const hasMore = cursors.length > 0;
    const nextSince = hasMore
      ? new Date(Math.min(...cursors)).toISOString()
      : serverTime.toISOString();

    const [wards, categories, conditions, medicines, units, toles, appVersion] =
      referenceData ?? [];
    res.json({
      success: true,
      data: {
        citizens,
        serviceRecords: services,
        referenceData: referenceData
          ? { wards, categories, conditions, medicines, units, toles, appVersion }
          : null,
        hasMore,
        nextSince,
        serverTime: serverTime.toISOString(),
      },
    });
  }),
);
