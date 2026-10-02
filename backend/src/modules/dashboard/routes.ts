import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireRole("ADMIN"));

dashboardRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const [
      totalCitizens,
      serviceRecords,
      monthServices,
      activeStaff,
      medicineAgg,
      wardAgg,
      ageRows,
      genderAgg,
    ] = await Promise.all([
      prisma.citizen.count({ where: { deletedAt: null } }),
      prisma.citizenServiceRecord.count({ where: { deletedAt: null } }),
      prisma.citizenServiceRecord.count({
        where: { deletedAt: null, serviceDate: { gte: monthStart } },
      }),
      prisma.user.count({ where: { role: "STAFF", isActive: true } }),
      prisma.serviceMedicine.groupBy({
        by: ["medicineId"],
        _sum: { quantity: true },
        where: { medicineId: { not: null } },
        orderBy: { _sum: { quantity: "desc" } },
        take: 12,
      }),
      prisma.citizenServiceRecord.groupBy({
        by: ["wardId"],
        _count: { _all: true },
        where: { deletedAt: null },
      }),
      prisma.citizen.findMany({
        where: { deletedAt: null },
        select: { dateOfBirth: true, approximateAge: true },
      }),
      prisma.citizen.groupBy({
        by: ["gender"],
        _count: { _all: true },
        where: { deletedAt: null },
      }),
    ]);
    const medicineIds = medicineAgg.flatMap((x) =>
      x.medicineId ? [x.medicineId] : [],
    );
    const [medicines, wards] = await Promise.all([
      prisma.medicine.findMany({
        where: { id: { in: medicineIds } },
        select: { id: true, name: true },
      }),
      prisma.ward.findMany({
        where: { id: { in: wardAgg.map((x) => x.wardId) } },
        select: { id: true, nameEn: true, nameNe: true },
      }),
    ]);
    const ageGroups = { under18: 0, age18to60: 0, over60: 0, unknown: 0 };
    for (const c of ageRows) {
      const age = c.dateOfBirth
        ? Math.max(
            0,
            now.getUTCFullYear() -
              c.dateOfBirth.getUTCFullYear() -
              (now <
              new Date(
                Date.UTC(
                  now.getUTCFullYear(),
                  c.dateOfBirth.getUTCMonth(),
                  c.dateOfBirth.getUTCDate(),
                ),
              )
                ? 1
                : 0),
          )
        : c.approximateAge;
      if (age == null) ageGroups.unknown++;
      else if (age < 18) ageGroups.under18++;
      else if (age <= 60) ageGroups.age18to60++;
      else ageGroups.over60++;
    }
    res.json({
      success: true,
      data: {
        cards: {
          totalCitizens,
          serviceRecords,
          citizensServedThisMonth: monthServices,
          activeStaff,
        },
        medicines: medicineAgg.map((x) => ({
          medicine:
            medicines.find((m) => m.id === x.medicineId)?.name ?? "Unknown",
          quantity: Number(x._sum.quantity ?? 0),
        })),
        wards: wardAgg.map((x) => ({
          ward: wards.find((w) => w.id === x.wardId),
          count: x._count._all,
        })),
        ageGroups: [
          { label: "Under 18", count: ageGroups.under18 },
          { label: "18 to 60", count: ageGroups.age18to60 },
          { label: "60+", count: ageGroups.over60 },
          { label: "Unknown", count: ageGroups.unknown },
        ],
        genders: genderAgg.map((x) => ({
          gender: x.gender,
          count: x._count._all,
        })),
      },
    });
  }),
);
