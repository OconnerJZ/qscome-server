import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { publicUploadsPath, privateEvidenceUploadsPath } from "../config/storage";
import { AppDataSource } from "../utils/db";

type HealthCheck = () => Promise<unknown>;
export type HealthCheckStatus = "healthy" | "unhealthy";

const withTimeout = async (check: HealthCheck, timeoutMs: number) => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      check(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("health check timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const evaluateHealthChecks = async (
  checks: Record<string, HealthCheck>,
  timeoutMs = 3_000,
) => {
  const entries = await Promise.all(Object.entries(checks).map(async ([name, check]) => {
    try {
      await withTimeout(check, timeoutMs);
      return [name, "healthy"] as const;
    } catch {
      return [name, "unhealthy"] as const;
    }
  }));
  const services = Object.fromEntries(entries) as Record<string, HealthCheckStatus>;
  return {
    healthy: Object.values(services).every((status) => status === "healthy"),
    services,
  };
};

export class HealthService {
  async check() {
    return evaluateHealthChecks({
      database: () => AppDataSource.query("SELECT 1"),
      publicStorage: () => fs.access(publicUploadsPath, fsConstants.R_OK | fsConstants.W_OK),
      privateStorage: () => fs.access(privateEvidenceUploadsPath, fsConstants.R_OK | fsConstants.W_OK),
    });
  }
}
