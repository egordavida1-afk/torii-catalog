"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkCredentials, getAdminCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { allowAttempt } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/security";

function clientKey(formData: FormData) {
  return `admin:${String(formData.get("username") || "").trim().toLowerCase()}`;
}

export async function login(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNextPath(String(formData.get("next") || "/admin"), "/admin");

  if (!allowAttempt(clientKey(formData), 5, 10 * 60 * 1000)) {
    redirect(`/admin/login?blocked=1&next=${encodeURIComponent(next)}`);
  }

  if (!checkCredentials(username, password)) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  cookies().set(SESSION_COOKIE, await getAdminCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/admin/login");
}
