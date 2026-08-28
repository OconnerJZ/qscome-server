const configuredOrigins = () => (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
) => {
  if (!origin) return callback(null, true);
  const allowed = configuredOrigins();
  if (!allowed.length && !["production", "prod"].includes(process.env.NODE_ENV || "")) {
    return callback(null, true);
  }
  if (allowed.includes(origin)) return callback(null, true);
  return callback(new Error("Origen no permitido"));
};

