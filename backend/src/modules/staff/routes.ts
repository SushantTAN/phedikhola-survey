import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { sendMail } from "../../lib/mailer.js";

export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole("ADMIN"));
const include = { staffProfile: { include: { assignedWard: true, healthPost: true } } } as const;

staffRouter.get("/", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const users = await prisma.user.findMany({
    where: { role: "STAFF", ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }
    ] } : {}) }, include, orderBy: { name: "asc" }
  });
  res.json({ success: true, data: users.map(({ passwordHash: _passwordHash, ...u }) => u) });
}));
staffRouter.get("/:id", asyncHandler(async (req, res) => {
  const user = await prisma.user.findFirst({ where: { id: req.params.id, role: "STAFF" }, include });
  if (!user) throw new HttpError(404, "STAFF_NOT_FOUND", "Staff member not found");
  const { passwordHash: _passwordHash, ...safe } = user;
  res.json({ success: true, data: safe });
}));
staffRouter.post("/", asyncHandler(async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "TempPass123!");
  if (!email || !req.body.name) throw new HttpError(400, "STAFF_FIELDS_REQUIRED", "Name and email are required");
  const user = await prisma.user.create({ data: {
    name: String(req.body.name), email, phone: req.body.phone || null, passwordHash: await bcrypt.hash(password, 12), role: "STAFF",
    staffProfile: { create: { assignedWardId: req.body.assignedWardId || null, healthPostId: req.body.healthPostId || null, employeeCode: req.body.employeeCode || null } }
  }, include });
  await sendMail(email, "Phedikhola staff account created", `Your staff account has been created. Login email: ${email}. Please change the temporary password after login.`).catch(e => console.error("Staff email failed", e));
  const { passwordHash: _passwordHash, ...safe } = user;
  res.status(201).json({ success: true, data: safe });
}));
staffRouter.patch("/:id", asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { name: req.body.name, email: req.body.email ? String(req.body.email).trim().toLowerCase() : undefined, phone: req.body.phone, isActive: req.body.isActive } });
  if (req.body.assignedWardId !== undefined || req.body.employeeCode !== undefined || req.body.healthPostId !== undefined) {
    await prisma.staffProfile.update({ where: { userId: user.id }, data: { assignedWardId: req.body.assignedWardId || null, healthPostId: req.body.healthPostId || null, employeeCode: req.body.employeeCode } });
  }
  await sendMail(user.email, "Phedikhola staff account updated", "Your staff account information has been updated by an administrator.").catch(e => console.error("Staff email failed", e));
  const safe = await prisma.user.findUnique({ where: { id: user.id }, include });
  if (!safe) throw new HttpError(404, "STAFF_NOT_FOUND", "Staff member not found");
  const { passwordHash: _passwordHash, ...withoutPassword } = safe;
  res.json({ success: true, data: withoutPassword });
}));
staffRouter.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true });
}));
