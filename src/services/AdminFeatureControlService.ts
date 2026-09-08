import { AuditLogs } from "../entities/AuditLogs";
import { Business } from "../entities/Business";
import {
  FeatureControlMode,
  FeatureControlOverride,
  FeatureControlScopeType,
} from "../entities/FeatureControlOverride";
import {
  BUSINESS_PLAN_CODES,
  BusinessPlanCode,
  getBusinessPlanDefinition,
  isBusinessPlanCode,
} from "../security/businessPlans";
import {
  FEATURE_CONTROL_MODES,
  getFeatureControlRegistry,
  getFeatureControlRegistryEntry,
  isFeatureControlMode,
  resolveFeatureControlMode,
} from "../security/featureControl";
import { AppDataSource } from "../utils/db";
import { HttpError } from "../utils/httpError";
import { BusinessPlanService } from "./BusinessPlanService";

interface OverrideInput {
  featureKey: string;
  scopeType: FeatureControlScopeType;
  scopeValue: string;
  mode: FeatureControlMode | null;
  reason: string;
  actorUserId: number;
}

const serializeOverride = (row: FeatureControlOverride | null | undefined) => row ? ({
  id: row.overrideId,
  mode: row.mode,
  reason: row.reason,
  updatedBy: row.updatedBy,
  updatedAt: row.updatedAt,
}) : null;

export class AdminFeatureControlService {
  private readonly repo = AppDataSource.getRepository(FeatureControlOverride);
  private readonly businessRepo = AppDataSource.getRepository(Business);
  private readonly plans = new BusinessPlanService();

  async catalog() {
    const [registry, overrides] = await Promise.all([
      Promise.resolve(getFeatureControlRegistry()),
      this.repo.find({ order: { featureKey: "ASC", scopeType: "ASC", scopeValue: "ASC" } }),
    ]);
    const lookup = this.overrideLookup(overrides);

    return {
      generatedAt: new Date().toISOString(),
      modes: [...FEATURE_CONTROL_MODES],
      precedence: ["global_safety", "business", "plan", "entitlement"],
      features: registry.map((feature) => {
        const globalOverride = lookup.get(`${feature.key}:global:*`);
        return {
          key: feature.key,
          label: feature.label,
          description: feature.description,
          category: feature.category,
          commercialModel: feature.commercialModel,
          status: feature.status,
          immutable: feature.immutable,
          immutableReason: feature.immutableReason,
          globalOverride: serializeOverride(globalOverride),
          plans: BUSINESS_PLAN_CODES.map((planCode) => {
            const planOverride = lookup.get(`${feature.key}:plan:${planCode}`);
            const resolved = resolveFeatureControlMode({
              planDefault: feature.plans[planCode],
              immutable: feature.immutable,
              globalMode: globalOverride?.mode,
              planMode: planOverride?.mode,
            });
            return {
              planCode,
              planName: getBusinessPlanDefinition(planCode).name,
              defaultMode: feature.plans[planCode],
              override: serializeOverride(planOverride),
              effectiveMode: resolved.mode,
              source: resolved.source,
            };
          }),
        };
      }),
    };
  }

  async business(businessId: number) {
    if (!Number.isInteger(businessId) || businessId < 1) {
      throw new HttpError(400, "Negocio inválido");
    }
    const business = await this.businessRepo.findOne({ where: { businessId } });
    if (!business) throw new HttpError(404, "Negocio no encontrado");

    const [capabilities, overrides] = await Promise.all([
      this.plans.resolveCapabilities(businessId),
      this.repo.find({ where: { scopeType: "business", scopeValue: String(businessId) } }),
    ]);
    const overrideByFeature = new Map(overrides.map((row) => [row.featureKey, row]));
    const registry = new Map(getFeatureControlRegistry().map((feature) => [feature.key, feature]));

    return {
      business: {
        id: business.businessId,
        name: business.businessName || `Negocio #${business.businessId}`,
      },
      plan: capabilities.plan,
      features: capabilities.features.map((feature) => {
        const definition = registry.get(feature.key);
        return {
          key: feature.key,
          label: feature.label,
          description: feature.description,
          category: feature.category,
          status: feature.status,
          immutable: definition?.immutable ?? true,
          immutableReason: definition?.immutableReason || null,
          planIncluded: feature.planIncluded,
          planDefaultMode: feature.planDefaultMode,
          effectiveMode: feature.accessMode,
          source: feature.accessSource,
          override: serializeOverride(overrideByFeature.get(feature.key)),
        };
      }),
    };
  }

  setGlobal(featureKey: string, mode: string | null | undefined, reason: string, actorUserId: number) {
    return this.setOverride({ featureKey, scopeType: "global", scopeValue: "*", mode: this.normalizeMode(mode), reason, actorUserId });
  }

  setPlan(featureKey: string, planCode: string, mode: string | null | undefined, reason: string, actorUserId: number) {
    if (!isBusinessPlanCode(planCode)) throw new HttpError(400, "Plan inválido");
    return this.setOverride({ featureKey, scopeType: "plan", scopeValue: planCode, mode: this.normalizeMode(mode), reason, actorUserId });
  }

  async setBusiness(featureKey: string, businessId: number, mode: string | null | undefined, reason: string, actorUserId: number) {
    if (!Number.isInteger(businessId) || businessId < 1) throw new HttpError(400, "Negocio inválido");
    const exists = await this.businessRepo.exist({ where: { businessId } });
    if (!exists) throw new HttpError(404, "Negocio no encontrado");
    return this.setOverride({ featureKey, scopeType: "business", scopeValue: String(businessId), mode: this.normalizeMode(mode), reason, actorUserId });
  }

  private normalizeMode(mode: string | null | undefined): FeatureControlMode | null {
    if (mode === null || mode === undefined || mode === "") return null;
    if (!isFeatureControlMode(mode)) throw new HttpError(400, "Modo de feature inválido");
    return mode;
  }

  private async setOverride(input: OverrideInput) {
    const definition = getFeatureControlRegistryEntry(input.featureKey);
    if (!definition) throw new HttpError(404, "Feature no encontrada");
    if (definition.immutable) {
      throw new HttpError(409, definition.immutableReason || "Esta feature no admite overrides");
    }

    const reason = String(input.reason || "").trim();
    if (reason.length < 3) throw new HttpError(400, "Indica un motivo para el cambio");
    if (reason.length > 500) throw new HttpError(400, "El motivo es demasiado largo");

    let result: FeatureControlOverride | null = null;
    await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FeatureControlOverride);
      const current = await repo.findOne({
        where: {
          featureKey: input.featureKey,
          scopeType: input.scopeType,
          scopeValue: input.scopeValue,
        },
        lock: { mode: "pessimistic_write" },
      });

      const before = current ? {
        mode: current.mode,
        reason: current.reason,
        updatedBy: current.updatedBy,
      } : null;

      if (input.mode === null) {
        if (!current) return;
        await repo.remove(current);
      } else {
        const row = current || repo.create({
          featureKey: input.featureKey,
          scopeType: input.scopeType,
          scopeValue: input.scopeValue,
        });
        row.mode = input.mode;
        row.reason = reason;
        row.updatedBy = input.actorUserId;
        result = await repo.save(row);
      }

      const targetId = result?.overrideId || current?.overrideId || null;
      const auditRepo = manager.getRepository(AuditLogs);
      await auditRepo.save(auditRepo.create({
        actorUserId: input.actorUserId,
        action: input.mode === null ? "FEATURE_CONTROL_OVERRIDE_CLEARED" : "FEATURE_CONTROL_OVERRIDE_SET",
        targetTable: "feature_control_overrides",
        targetId,
        beforeJson: before ? JSON.stringify({
          featureKey: input.featureKey,
          scopeType: input.scopeType,
          scopeValue: input.scopeValue,
          ...before,
        }) : null,
        afterJson: input.mode === null ? null : JSON.stringify({
          featureKey: input.featureKey,
          scopeType: input.scopeType,
          scopeValue: input.scopeValue,
          mode: input.mode,
          reason,
          updatedBy: input.actorUserId,
        }),
      }));
    });

    return {
      featureKey: input.featureKey,
      scopeType: input.scopeType,
      scopeValue: input.scopeValue,
      override: serializeOverride(result),
    };
  }

  private overrideLookup(rows: FeatureControlOverride[]) {
    return new Map(rows.map((row) => [
      `${row.featureKey}:${row.scopeType}:${row.scopeValue}`,
      row,
    ]));
  }
}
