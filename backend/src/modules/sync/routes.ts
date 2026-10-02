import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const syncRouter = Router();
syncRouter.use(requireAuth, requireRole("STAFF", "ADMIN"));

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
          guardianPhone: item.guardianPhone ? String(item.guardianPhone).trim() : null,
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
          profilePhotoUrl: item.profilePhotoUrl || null,
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
        const wardIds = Array.isArray(item.wardIds)
          ? [...new Set(item.wardIds.map(String))]
          : null;
        if (categoryIds || wardIds) {
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
            if (wardIds) {
              await tx.citizenWardAssignment.deleteMany({
                where: { citizenId: saved.id },
              });
              if (wardIds.length)
                await tx.citizenWardAssignment.createMany({
                  data: wardIds.map((wardId: string) => ({
                    citizenId: saved.id,
                    wardId,
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
          guardianPhone: item.guardianPhone ? String(item.guardianPhone).trim() : null,
          visitPhotoUrl: item.visitPhotoUrl || null,
          needsFollowup:
            item.needsFollowup === true || item.needsFollowup === "true",
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

syncRouter.get(
  "/pull",
  asyncHandler(async (req, res) => {
    const since = req.query.since
      ? new Date(String(req.query.since))
      : new Date(0);
    const [citizens, services, referenceData] = await Promise.all([
      prisma.citizen.findMany({
        where: { updatedAt: { gt: since } },
        include: { categories: true, wards: true },
        take: 5000,
      }),
      prisma.citizenServiceRecord.findMany({
        where: { updatedAt: { gt: since } },
        include: { conditions: true, medicines: true },
        take: 5000,
      }),
      Promise.all([
        prisma.ward.findMany({ where: { active: true } }),
        prisma.citizenCategory.findMany({ where: { active: true } }),
        prisma.healthCondition.findMany({ where: { active: true } }),
        prisma.medicine.findMany({
          where: { active: true },
          include: { defaultUnit: true },
        }),
        prisma.medicineUnit.findMany({ where: { active: true } }),
        prisma.appVersion.findFirst({ where: { platform: "ANDROID" } }),
      ]),
    ]);
    const [wards, categories, conditions, medicines, units, appVersion] =
      referenceData;
    res.json({
      success: true,
      data: {
        citizens,
        serviceRecords: services,
        referenceData: {
          wards,
          categories,
          conditions,
          medicines,
          units,
          appVersion,
        },
        serverTime: new Date().toISOString(),
      },
    });
  }),
);
