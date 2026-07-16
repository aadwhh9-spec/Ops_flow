import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse } from "cookie";
import superjson from "superjson";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId } from "../db";
import { verifySessionToken } from "./auth";
import { COOKIE_NAME } from "./cookies";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  let user: User | null = null;

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parse(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (token) {
      const openId = await verifySessionToken(token);
      if (openId) {
        user = (await getUserByOpenId(openId)) ?? null;
      }
    }
  }

  return { req, res, user };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

// protectedProcedure guarantees ctx.user is present (and narrows its type
// accordingly) or throws UNAUTHORIZED before the handler ever runs.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
