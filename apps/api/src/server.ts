import Fastify from "fastify";
import { APP_NAME } from "@loko-map/shared";

const app = Fastify({ logger: true });

app.get("/api/health", async () => {
  return { status: "ok", message: `${APP_NAME} API is running` };
});

app.listen({ port: 3001, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
