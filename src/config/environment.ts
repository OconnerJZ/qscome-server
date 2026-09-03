type RuntimeEnvironment = Record<string, string | undefined>;

const PRODUCTION_NAMES = new Set(["production", "prod"]);
const REQUIRED_PRODUCTION_KEYS = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "CORS_ORIGIN",
] as const;

export const missingProductionEnvironmentKeys = (
  environment: RuntimeEnvironment,
) => {
  if (!PRODUCTION_NAMES.has((environment.NODE_ENV || "").toLowerCase())) {
    return [];
  }

  return REQUIRED_PRODUCTION_KEYS.filter(
    (key) => !environment[key]?.trim(),
  );
};

export const validateProductionEnvironment = (
  environment: RuntimeEnvironment = process.env,
) => {
  const missingKeys = missingProductionEnvironmentKeys(environment);
  if (missingKeys.length > 0) {
    throw new Error(
      `Faltan variables obligatorias de producción: ${missingKeys.join(", ")}`,
    );
  }
};
