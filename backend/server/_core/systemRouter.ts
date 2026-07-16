import { publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure.query(() => ({ status: "ok", time: new Date().toISOString() })),
});
