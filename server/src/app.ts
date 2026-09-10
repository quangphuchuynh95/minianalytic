import * as process from "node:process";
import { logger } from "~services/logger";
import { appFactory } from "./app.factory";
import { routes } from "./routes";
import { trimTrailingSlash } from "hono/trailing-slash";
import { logger as loggerMiddleware } from "hono/logger";

(async function main() {
  const app = appFactory.createApp();

  app.use(trimTrailingSlash());

  app.use(loggerMiddleware());

  app.post("/collect/v0", ...routes.collect);

  const server = Bun.serve({
    port: Number(process.env.PORT) || 9765,
    fetch: app.fetch,
  });

  return {
    server,
  };
})()
  .then(({ server }) => {
    logger.info(`Server is running at ${server.url}`);
  })
  .catch((error) => {
    logger.error("Failed to boot server up", error);
  });
