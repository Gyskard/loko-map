import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { APP_NAME } from "@loko-map/shared";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: true });

const API_PREFIX = "/api"

app.register(fastifyStatic, {
  root: join(__dirname, "../data"),
  prefix: `${API_PREFIX}/data/`,
});

app.get(`${API_PREFIX}/health`, async () => {
  return { status: "ok", message: `${APP_NAME} API is running` };
});

app.listen({ port: 3001, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
