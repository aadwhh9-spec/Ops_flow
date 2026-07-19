import "dotenv/config";
import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { ENV } from "./env";
import { createContext } from "./trpc";
import { appRouter } from "../routers";

const app = express();

app.use(express.json());

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

app.listen(ENV.port, () => {
  console.log(`OpsFlow backend listening on port ${ENV.port}`);
});
