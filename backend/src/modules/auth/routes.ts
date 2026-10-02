import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import {
  randomOtp,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/tokens.js";
import { sendMail } from "../../lib/mailer.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";

export const authRouter = Router();

function tokensFor(user: {
  id: string;
  role: "ADMIN" | "STAFF";
  email: string;
}) {
  const payload = { sub: user.id, role: user.role, email: user.email } as const;
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = String(req.body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password ?? "");
    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new HttpError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password",
      );
    }
    const tokens = tokensFor({
      id: user.id,
      role: user.role,
      email: user.email,
    });
    const expiresAt = new Date(Date.now() + env.refreshTokenDays * 86400000);
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(tokens.refreshToken),
          expiresAt,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);
    res.json({
      success: true,
      data: {
        ...tokens,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = String(req.body.refreshToken ?? "");
    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date())
      throw new HttpError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid",
      );
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.isActive)
      throw new HttpError(401, "USER_DISABLED", "User is disabled");
    res.json({
      success: true,
      data: {
        accessToken: signAccessToken({
          sub: user.id,
          role: user.role,
          email: user.email,
        }),
      },
    });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = String(req.body.refreshToken ?? "");
    if (token)
      await prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(token) },
        data: { revokedAt: new Date() },
      });
    res.json({ success: true });
  }),
);

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const email = String(req.body.email ?? "")
      .trim()
      .toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.isActive) {
      const otp = randomOtp();
      await prisma.passwordResetOtp.create({
        data: {
          email,
          otpHash: sha256(otp),
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
      await sendMail(
        email,
        "Phedikhola password reset OTP",
        `Your OTP is ${otp}. It expires in 10 minutes.`,
      );
    }
    res.json({
      success: true,
      message: "If the account exists, an OTP has been sent.",
    });
  }),
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const email = String(req.body.email ?? "")
      .trim()
      .toLowerCase();
    const otp = String(req.body.otp ?? "");
    const password = String(req.body.password ?? "");
    if (password.length < 8)
      throw new HttpError(
        400,
        "WEAK_PASSWORD",
        "Password must be at least 8 characters",
      );
    const record = await prisma.passwordResetOtp.findFirst({
      where: { email, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (
      !record ||
      record.expiresAt < new Date() ||
      record.otpHash !== sha256(otp) ||
      record.attempts >= 5
    ) {
      if (record)
        await prisma.passwordResetOtp.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        });
      throw new HttpError(400, "INVALID_OTP", "OTP is invalid or expired");
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      }),
      prisma.passwordResetOtp.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { user: { email }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    res.json({ success: true });
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentPassword = String(req.body.currentPassword ?? "");
    const newPassword = String(req.body.newPassword ?? "");
    if (newPassword.length < 8)
      throw new HttpError(
        400,
        "WEAK_PASSWORD",
        "New password must be at least 8 characters",
      );
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash)))
      throw new HttpError(
        400,
        "CURRENT_PASSWORD_INVALID",
        "Current password is incorrect",
      );
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(newPassword, 12) },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    res.json({ success: true });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });
    res.json({ success: true, data: user });
  }),
);
