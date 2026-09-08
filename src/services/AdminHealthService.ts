import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import os from "node:os";
import { AppDataSource } from "../utils/db";
import { privateEvidenceUploadsPath, publicUploadsPath } from "../config/storage";
import { getIO } from "../utils/socket";

export type PlatformHealthStatus = "healthy" | "degraded";
export type ComponentHealthStatus = "healthy" | "unhealthy";

interface ComponentProbe<T> {
  status: ComponentHealthStatus;
  details: T;
}

interface DiskSnapshot {
  totalBytes: number;
  availableBytes: number;
  usedPercent: number | null;
}

const elapsedMs = (startedAt: bigint) => Number(process.hrtime.bigint() - startedAt) / 1_000_000;

export const derivePlatformHealthStatus = (
  statuses: ComponentHealthStatus[],
): PlatformHealthStatus => statuses.every((status) => status === "healthy") ? "healthy" : "degraded";

export const deriveStorageHealthStatus = ({
  publicUploads,
  privateEvidence,
  disk,
}: {
  publicUploads: ComponentHealthStatus;
  privateEvidence: ComponentHealthStatus;
  disk: DiskSnapshot | null;
}): ComponentHealthStatus => (
  publicUploads === "healthy"
  && privateEvidence === "healthy"
  && disk != null
  && disk.totalBytes > 0
  && disk.availableBytes >= 0
) ? "healthy" : "unhealthy";

const diskSnapshot = async (targetPath: string): Promise<DiskSnapshot> => {
  const stats = await fs.statfs(targetPath);
  const blockSize = Number(stats.bsize);
  const totalBytes = Number(stats.blocks) * blockSize;
  const availableBytes = Number(stats.bavail) * blockSize;
  return {
    totalBytes,
    availableBytes,
    usedPercent: totalBytes > 0 ? Number((((totalBytes - availableBytes) / totalBytes) * 100).toFixed(1)) : null,
  };
};

export class AdminHealthService {
  async snapshot() {
    const checkedAt = new Date();
    const [database, storage, realtime] = await Promise.all([
      this.databaseProbe(),
      this.storageProbe(),
      this.realtimeProbe(),
    ]);

    const memory = process.memoryUsage();
    const api: ComponentProbe<{
      uptimeSeconds: number;
      version: string;
      environment: string;
      nodeVersion: string;
      memory: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
      hostLoadAverage: number[];
    }> = {
      status: "healthy",
      details: {
        uptimeSeconds: Math.floor(process.uptime()),
        version: process.env.APP_VERSION || "development",
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        memory: {
          rssBytes: memory.rss,
          heapUsedBytes: memory.heapUsed,
          heapTotalBytes: memory.heapTotal,
        },
        hostLoadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
      },
    };

    return {
      status: derivePlatformHealthStatus([
        api.status,
        database.status,
        storage.status,
        realtime.status,
      ]),
      checkedAt,
      components: { api, database, storage, realtime },
      scope: {
        application: true,
        infrastructure: false,
        note: "Este diagnóstico cubre el proceso Node, DB, storage montado y Socket.IO. Docker, Jenkins, proxy y host requieren monitoreo de infraestructura.",
      },
    };
  }

  private async databaseProbe(): Promise<ComponentProbe<{ initialized: boolean; latencyMs: number | null }>> {
    const initialized = AppDataSource.isInitialized;
    if (!initialized) {
      return { status: "unhealthy", details: { initialized: false, latencyMs: null } };
    }

    const startedAt = process.hrtime.bigint();
    try {
      await AppDataSource.query("SELECT 1");
      return {
        status: "healthy",
        details: { initialized: true, latencyMs: Number(elapsedMs(startedAt).toFixed(1)) },
      };
    } catch {
      return { status: "unhealthy", details: { initialized: true, latencyMs: null } };
    }
  }

  private async storageProbe(): Promise<ComponentProbe<{
    publicUploads: ComponentHealthStatus;
    privateEvidence: ComponentHealthStatus;
    disk: DiskSnapshot | null;
  }>> {
    const probe = async (targetPath: string): Promise<ComponentHealthStatus> => {
      try {
        await fs.access(targetPath, fsConstants.R_OK | fsConstants.W_OK);
        return "healthy";
      } catch {
        return "unhealthy";
      }
    };

    const [publicUploads, privateEvidence] = await Promise.all([
      probe(publicUploadsPath),
      probe(privateEvidenceUploadsPath),
    ]);

    let disk: DiskSnapshot | null = null;
    try {
      disk = await diskSnapshot(publicUploadsPath);
    } catch {
      disk = null;
    }

    return {
      status: deriveStorageHealthStatus({ publicUploads, privateEvidence, disk }),
      details: { publicUploads, privateEvidence, disk },
    };
  }

  private async realtimeProbe(): Promise<ComponentProbe<{
    initialized: boolean;
    connectedClients: number;
    rooms: { users: number; businesses: number; sharedOrders: number };
  }>> {
    try {
      const io = getIO();
      const roomNames = [...io.sockets.adapter.rooms.keys()];
      return {
        status: "healthy",
        details: {
          initialized: true,
          connectedClients: io.engine.clientsCount,
          rooms: {
            users: roomNames.filter((name) => name.startsWith("user:")).length,
            businesses: roomNames.filter((name) => name.startsWith("business:")).length,
            sharedOrders: roomNames.filter((name) => name.startsWith("shared-order:")).length,
          },
        },
      };
    } catch {
      return {
        status: "unhealthy",
        details: {
          initialized: false,
          connectedClients: 0,
          rooms: { users: 0, businesses: 0, sharedOrders: 0 },
        },
      };
    }
  }
}
