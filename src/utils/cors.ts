const configuredOrigins = () => (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isDevelopment = () => !["production", "prod"].includes((process.env.NODE_ENV || "").toLowerCase());

export const isLoopbackOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return ["http:", "https:"].includes(url.protocol)
      && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
};

export const corsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
) => {
  if (!origin) return callback(null, true);
  const allowed = configuredOrigins();
  if (isDevelopment() && isLoopbackOrigin(origin)) return callback(null, true);
  if (!allowed.length && isDevelopment()) return callback(null, true);
  if (allowed.includes(origin)) return callback(null, true);
  return callback(new Error("Origen no permitido"));
};
