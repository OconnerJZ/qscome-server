import fs from "node:fs";
import path from "node:path";

interface StorageEnvironment {
  [key: string]: string | undefined;
  STORAGE_ROOT?: string;
  UPLOADS_PATH?: string;
  PRIVATE_EVIDENCE_UPLOADS_PATH?: string;
}

export const resolveStoragePaths = (
  environment: StorageEnvironment = process.env,
  workingDirectory = process.cwd(),
) => {
  const storageRoot = path.resolve(
    workingDirectory,
    environment.STORAGE_ROOT?.trim() || ".",
  );

  return {
    publicUploadsPath: path.resolve(
      workingDirectory,
      environment.UPLOADS_PATH?.trim() || path.join(storageRoot, "uploads"),
    ),
    privateEvidenceUploadsPath: path.resolve(
      workingDirectory,
      environment.PRIVATE_EVIDENCE_UPLOADS_PATH?.trim()
        || path.join(storageRoot, "private_uploads", "transfer-evidence"),
    ),
  };
};

export const { publicUploadsPath, privateEvidenceUploadsPath } = resolveStoragePaths();

export const ensureStorageDirectories = () => {
  fs.mkdirSync(publicUploadsPath, { recursive: true });
  fs.mkdirSync(privateEvidenceUploadsPath, { recursive: true });
};
