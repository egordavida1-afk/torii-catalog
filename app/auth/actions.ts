"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { allowAttempt } from "@/lib/rate-limit";
import { createUserSession, destroyUserSession } from "@/lib/user-auth";
import { hashPassword, normalizeEmail, safeNextPath, validatePassword, verifyPassword } from "@/lib/security";

function authKey(email: string) { return `user:${email}`; }

export async function register(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") || ""));
  const password = String(formData.get("password") || "");
  const next = safeNextPath(String(formData.get("next") || "/"), "/");

  if (!email.includes("@") || email.length > 160 || !validatePassword(password)) {
    redirect(`/register?error=1&next=${encodeURIComponent(next)}`);
  }
  if (!allowAttempt(authKey(email), 6, 10 * 60 * 1000)) {
    redirect(`/register?blocked=1&next=${encodeURIComponent(next)}`);
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) redirect(`/login?exists=1&next=${encodeURIComponent(next)}`);

  const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });
  await createUserSession(user.id);
  redirect(next);
}

export async function loginUser(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") || ""));
  const password = String(formData.get("password") || "");
  const next = safeNextPath(String(formData.get("next") || "/"), "/");

  if (!allowAttempt(authKey(email), 8, 10 * 60 * 1000)) {
    redirect(`/login?blocked=1&next=${encodeURIComponent(next)}`);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !validatePassword(password) || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  await createUserSession(user.id);
  redirect(next);
}

export async function logoutUser() {
  await destroyUserSession();
  redirect("/");
}
