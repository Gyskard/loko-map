import { config as loadEnv } from "dotenv";
import { resolve } from "path";

// need to be here because it's used for the constants file below
loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCors from "@fastify/cors";
import { APP_NAME, type SncfData } from "@loko-map/shared";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  IS_PROD,
  API_PREFIX,
  PORT,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW,
  SNCF_RATE_LIMIT_MAX,
  SNCF_RESULT_COUNT,
  SNCF_BASE,
  UIC_REGEX,
  PROD_IP,
  LOCAL_IP,
} from "./constants.js";
import type {
  SncfDisplay,
  SncfDeparture,
  SncfArrival,
  SncfLine,
} from "./types.js";
import { loadStatsData } from "./geo.js";

// === VARIABLES ===

const directoryName = dirname(fileURLToPath(import.meta.url));
const sncfAuth = `Basic ${Buffer.from(`${process.env.SNCF_TOKEN ?? ""}:`).toString("base64")}`;

let statsData: Awaited<ReturnType<typeof loadStatsData>>;

// === FUNCTIONS ===

// safe fetch so will return null instead of throwing or returning rejected promise
const safeFetch = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, { headers: { Authorization: sncfAuth } });
    return res.ok ? (res.json() as Promise<T>) : null;
  } catch {
    return null;
  }
};

// === SERVER INITIALIZATION ===

// load statistics data
try {
  statsData = await loadStatsData();
} catch (err) {
  console.error("Fatal: could not load data files — check apps/api/data/", err);
  process.exit(1);
}

// create app
const app = Fastify({
  logger: {
    level: IS_PROD ? "warn" : "info",
    redact: ["req.headers.authorization"],
  },
});

// set error handler to have context
app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  app.log.error(err);
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  reply
    .code(status)
    .send({ error: status === 500 ? "Internal error" : err.message });
});

// allow cross origin when no in production env
await app.register(fastifyCors, {
  origin: IS_PROD ? false : true,
});

// set rate limit
await app.register(fastifyRateLimit, {
  max: RATE_LIMIT_MAX,
  timeWindow: RATE_LIMIT_WINDOW,
});

// set static data root
app.register(fastifyStatic, {
  root: join(directoryName, "../data"),
  prefix: `${API_PREFIX}/data/`,
});

// === ENDPOINTS ===

// health endpoint
app.get(`${API_PREFIX}/health`, async () => {
  return { status: "ok", message: `${APP_NAME} API is running` };
});

// stats endpoint
app.get(`${API_PREFIX}/stats`, async () => statsData);

// station infos endpoint
app.get<{ Params: { uic: string } }>(
  `${API_PREFIX}/sncf/station/:uic`,
  {
    config: {
      rateLimit: { max: SNCF_RATE_LIMIT_MAX, timeWindow: RATE_LIMIT_WINDOW },
    },
  },
  async (request, reply) => {
    const { uic } = request.params;

    // validate UIC (identifier of a SNCF train station)
    if (!UIC_REGEX.test(uic)) {
      return reply.code(400).send({ error: "Invalid UIC" });
    }

    const stopId = encodeURIComponent(`stop_area:SNCF:${uic}`);
    const base = `${SNCF_BASE}/stop_areas/${stopId}`;

    const [depsData, arrivalsData, linesData] = await Promise.all([
      safeFetch<{ departures?: SncfDeparture[] }>(
        `${base}/departures?count=${SNCF_RESULT_COUNT}&disable_disruption=true`,
      ),
      safeFetch<{ arrivals?: SncfArrival[] }>(
        `${base}/arrivals?count=${SNCF_RESULT_COUNT}&disable_disruption=true`,
      ),
      safeFetch<{ lines?: SncfLine[] }>(`${base}/lines`),
    ]);

    const shapeDisplay = (d: SncfDisplay) => ({
      line: d.label,
      direction: d.direction,
    });

    const departures = (depsData?.departures ?? [])
      .filter((d) => d.display_informations)
      .map((d) => ({
        id: `dep-${d.display_informations.label}-${d.stop_date_time.departure_date_time}`,
        ...shapeDisplay(d.display_informations),
        time: d.stop_date_time.departure_date_time,
        baseTime: d.stop_date_time.base_departure_date_time,
      }));

    const arrivals = (arrivalsData?.arrivals ?? [])
      .filter((a) => a.display_informations)
      .map((a) => ({
        id: `arr-${a.display_informations.label}-${a.stop_date_time.arrival_date_time}`,
        ...shapeDisplay(a.display_informations),
        time: a.stop_date_time.arrival_date_time,
        baseTime: a.stop_date_time.base_arrival_date_time,
      }));

    const uniqueModes = new Map<string, string>();

    for (const line of linesData?.lines ?? []) {
      const mode = line.commercialMode?.name;
      if (mode && !uniqueModes.has(mode)) uniqueModes.set(mode, line.id);
    }

    const lines = Array.from(uniqueModes.entries()).map(([mode, id]) => ({
      id,
      mode,
    }));

    const payload: SncfData = { departures, arrivals, lines };

    return payload;
  },
);

// === LISTENER ===

app.listen({ port: PORT, host: IS_PROD ? PROD_IP : LOCAL_IP }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
