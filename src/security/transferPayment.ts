import { HttpError } from "../utils/httpError";

export interface TransferBankConfig {
  accountHolder: string;
  bankName: string;
  clabe: string;
  accountNumber: string;
  referenceInstructions: string;
}

const clean = (value: unknown, max: number) => String(value || "").trim().slice(0, max);

export const normalizeTransferBankConfig = (value: unknown): TransferBankConfig => {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const config = {
    accountHolder: clean(source.accountHolder, 160),
    bankName: clean(source.bankName, 100),
    clabe: clean(source.clabe, 18).replace(/\s/g, ""),
    accountNumber: clean(source.accountNumber, 30).replace(/\s/g, ""),
    referenceInstructions: clean(source.referenceInstructions, 500),
  };
  if (config.clabe && !/^\d{18}$/.test(config.clabe)) throw new HttpError(400, "La CLABE debe contener 18 dígitos");
  if (config.accountNumber && !/^\d{4,30}$/.test(config.accountNumber)) throw new HttpError(400, "El número de cuenta no es válido");
  return config;
};

export const assertUsableTransferConfig = (config: TransferBankConfig) => {
  if (!isUsableTransferConfig(config)) {
    throw new HttpError(400, "Completa titular, banco y CLABE o número de cuenta para activar transferencias");
  }
};

export const isUsableTransferConfig = (config: TransferBankConfig): boolean =>
  Boolean(config.accountHolder && config.bankName && (config.clabe || config.accountNumber));
