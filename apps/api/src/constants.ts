// === ENV ===

export const IS_PROD = process.env.NODE_ENV === "production";

// === BASE API ===

export const API_PREFIX = "/api";
export const PORT = 3001;
export const PROD_IP = "0.0.0.0";
export const LOCAL_IP = "127.0.0.1";

// === SNCF API ===

export const RATE_LIMIT_MAX = 60;
export const RATE_LIMIT_WINDOW = "1 minute";
export const SNCF_RATE_LIMIT_MAX = 10;
export const SNCF_RESULT_COUNT = 3;
export const SNCF_BASE = "https://api.sncf.com/v1/coverage/sncf";
export const UIC_REGEX = /^\d{8}$/; // UIC codes are 8-digit numeric identifiers, check before using for SNCF API
