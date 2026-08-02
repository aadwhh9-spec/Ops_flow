import "dotenv/config";

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function appUrl(): string {
  const value = process.env.APP_URL ?? "http://localhost:5173";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.origin;
  } catch {
    throw new Error(
      "APP_URL must be a complete URL, for example http://localhost:5173 or https://your-app.onrender.com",
    );
  }
}

export const ENV = {
  databaseUrl: required("DATABASE_URL"),

  // The openId (email, in this simple auth setup) that should automatically
  // get the "admin" role the first time it signs up. Set this in your .env
  // to your own email so you have an admin account from day one.
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  // Secret used to sign session JWTs. MUST be overridden in production via
  // the JWT_SECRET environment variable.
  jwtSecret: required("JWT_SECRET", "dev-insecure-secret-change-me"),

  port: Number(process.env.PORT ?? 4000),

  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  appUrl: appUrl(),

  isProduction: process.env.NODE_ENV === "production",
};

if (ENV.isProduction && ENV.jwtSecret === "dev-insecure-secret-change-me") {
  throw new Error("JWT_SECRET must be set to a real secret in production");
}
