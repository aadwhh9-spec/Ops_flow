import type { Request } from "express";
import { ENV } from "./env";

export const COOKIE_NAME = "opsflow_session";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// req is accepted (and typed) for future flexibility — e.g. if you later need
// to vary cookie options based on the request's host/protocol behind a proxy.
export function getSessionCookieOptions(_req: Request) {
  return {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SEVEN_DAYS_MS,
  };
}
