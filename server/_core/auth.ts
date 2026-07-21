import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

const scrypt = promisify(scryptCallback);
const secretKey = new TextEncoder().encode(ENV.jwtSecret);

// ─── Password hashing (no external deps — uses Node's built-in scrypt) ────────
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const hashBuffer = Buffer.from(hash, "hex");
  if (derivedKey.length !== hashBuffer.length) return false;
  return timingSafeEqual(derivedKey, hashBuffer);
}

// ─── Session JWTs ───────────────────────────────────────────────────────────────
// The token just carries the user's openId (their email, in this simple setup).
const SESSION_TTL = "7d";

export async function signSessionToken(openId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(openId)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
