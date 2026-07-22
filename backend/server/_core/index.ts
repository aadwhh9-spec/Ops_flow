import "dotenv/config";
import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { ENV } from "./env";
import { createContext } from "./trpc";
import { appRouter } from "../routers";
import { compatibilityRouter } from "../compatibilityRouter";

const app = express();

app.use(express.json());

app.use("/api", compatibilityRouter);

app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(ENV.port, () => {
  console.log(`OpsFlow backend listening on port ${ENV.port}`);
});
