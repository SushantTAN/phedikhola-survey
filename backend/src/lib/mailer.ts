import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined
});

export async function sendMail(to: string, subject: string, text: string) {
  if (!env.smtpUser) {
    console.info(`[mail disabled] ${to} | ${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({ from: env.smtpFrom, to, subject, text });
}
