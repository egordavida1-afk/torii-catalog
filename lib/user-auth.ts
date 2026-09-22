import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashToken, randomToken } from "@/lib/security";

export const USER_SESSION_COOKIE = "user_session";
const SESSION_DAYS = 30;

export async function createUserSession(userId: string) {
  const rawToken = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { tokenHash: hashToken(rawToken), expiresAt, userId } });

  cookies().set(USER_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getCurrentUser() {
  const rawToken = cookies().get(USER_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

export async function destroyUserSession() {
  const rawToken = cookies().get(USER_SESSION_COOKIE)?.value;
  if (rawToken) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
  }
  cookies().delete(USER_SESSION_COOKIE);
}
