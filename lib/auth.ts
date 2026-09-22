export const SESSION_COOKIE = "admin_session";

export function getAdminCredentials() {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) throw new Error("ADMIN_USER и ADMIN_PASSWORD должны быть заданы в окружении.");
  if (process.env.NODE_ENV === "production" && password === "123456") throw new Error("В production запрещён тестовый пароль администратора.");
  return { username, password };
}

export function getSessionSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 24) throw new Error("ADMIN_SECRET должен содержать минимум 24 символа.");
  return secret;
}

export function checkCredentials(username: string, password: string) {
  const creds = getAdminCredentials();
  return username === creds.username && password === creds.password;
}

export async function getAdminCookieValue() {
  const data = new TextEncoder().encode(`${getSessionSecret()}:admin`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
