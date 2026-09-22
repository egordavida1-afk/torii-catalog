import { cookies } from "next/headers";
import { getAdminCookieValue, SESSION_COOKIE } from "@/lib/auth";

export async function isAdminSessionValid() {
  const expected = await getAdminCookieValue();
  return cookies().get(SESSION_COOKIE)?.value === expected;
}

export async function requireAdminAction() {
  if (!(await isAdminSessionValid())) throw new Error("Недостаточно прав");
}
