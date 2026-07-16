import "dotenv/config";

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

export const ENV = {
  // The openId (email, in this simple auth setup) that should automatically
  // get the "admin" role the first time it signs up. Set this in your .env
  // to your own email so you have an admin account from day one.
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  // Secret used to sign session JWTs. MUST be overridden in production via
  // the JWT_SECRET environment variable.
  jwtSecret: required("JWT_SECRET", "dev-insecure-secret-change-me"),

  port: Number(process.env.PORT ?? 4000),

  isProduction: process.env.NODE_ENV === "production",
};

if (ENV.isProduction && ENV.jwtSecret === "dev-insecure-secret-change-me") {
  throw new Error("JWT_SECRET must be set to a real secret in production");
}
