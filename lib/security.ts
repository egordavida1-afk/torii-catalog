import crypto from "node:crypto";

export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export function validatePassword(password: string) {
  return password.length >= 8 && password.length <= 128;
}

export function normalizeHttpUrl(input: string, maxLength = 2048): string | null {
  const value = input.trim();
  if (!value || value.length > maxLength) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export async function hashPassword(password: string) {
  const salt = randomToken(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, digest] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  const expected = Buffer.from(digest, "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

export function safeNextPath(value: string | null | undefined, fallback = "/") {
  const next = String(value || fallback);
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
