import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
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

if (ENV.isProduction) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // The production bundle is emitted to backend/dist, beside the frontend's
  // top-level dist directory.
  const frontendDist = path.resolve(currentDir, "../../dist");
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(ENV.port, () => {
  console.log(`OpsFlow backend listening on port ${ENV.port}`);
});
