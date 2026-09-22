"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { allowAttempt } from "@/lib/rate-limit";
import { createUserSession, destroyUserSession } from "@/lib/user-auth";
import { getAdminCookieValue, SESSION_COOKIE, checkCredentials } from "@/lib/auth";
import { hashPassword, normalizeEmail, safeNextPath, validatePassword, verifyPassword } from "@/lib/security";

function authKey(login: string) { return `auth:${login.trim().toLowerCase()}`; }

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
  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNextPath(String(formData.get("next") || "/"), "/");

  if (!login || login.length > 160 || !allowAttempt(authKey(login), 10, 10 * 60 * 1000)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  // Администратор использует тот же экран входа. После успешной проверки
  // он попадает в админку даже без специальной ссылки в публичной навигации.
  if (login.length <= 160 && password.length <= 128 && checkCredentials(login, password)) {
    cookies().set(SESSION_COOKIE, await getAdminCookieValue(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    redirect(next.startsWith("/admin") ? next : "/admin");
  }

  if (!validatePassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const email = normalizeEmail(login);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await createUserSession(user.id);
  redirect(next);
}

export async function logoutUser() {
  await destroyUserSession();
  cookies().delete(SESSION_COOKIE);
  redirect("/");
}
