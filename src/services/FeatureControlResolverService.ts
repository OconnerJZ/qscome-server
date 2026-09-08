import { In } from "typeorm";
import { FeatureControlOverride } from "../entities/FeatureControlOverride";
import { BusinessPlanCode, BusinessPlanFeature } from "../security/businessPlans";
import {
  FeatureControlMode,
  getFeatureControlRegistry,
  resolveFeatureControlMode,
} from "../security/featureControl";
import { AppDataSource } from "../utils/db";

export type ResolvedBusinessFeature = BusinessPlanFeature & {
  planIncluded: boolean;
  planDefaultMode: FeatureControlMode;
  accessMode: FeatureControlMode;
  accessSource: "immutable" | "global" | "business" | "plan" | "entitlement";
};

export class FeatureControlResolverService {
  private readonly repo = AppDataSource.getRepository(FeatureControlOverride);

  async resolveFeatures(
    businessId: number,
    planCode: BusinessPlanCode,
    features: BusinessPlanFeature[],
  ): Promise<ResolvedBusinessFeature[]> {
    const scopeValues = ["*", planCode, String(businessId)];
    const overrides = await this.repo.find({
      where: { scopeValue: In(scopeValues) },
    });
    const registry = new Map(getFeatureControlRegistry().map((entry) => [entry.key, entry]));

    const byScope = new Map(
      overrides.map((row) => [`${row.featureKey}:${row.scopeType}:${row.scopeValue}`, row]),
    );

    return features.map((feature) => {
      const entry = registry.get(feature.key);
      const planDefaultMode: FeatureControlMode = (
        feature.status === "available" && feature.included ? "enabled" : "disabled"
      );
      const globalMode = byScope.get(`${feature.key}:global:*`)?.mode || null;
      const planMode = byScope.get(`${feature.key}:plan:${planCode}`)?.mode || null;
      const businessMode = byScope.get(`${feature.key}:business:${businessId}`)?.mode || null;
      const resolved = resolveFeatureControlMode({
        planDefault: planDefaultMode,
        immutable: entry?.immutable ?? true,
        globalMode,
        planMode,
        businessMode,
      });

      return {
        ...feature,
        planIncluded: feature.included,
        planDefaultMode,
        included: feature.status === "available" && resolved.mode !== "disabled",
        accessMode: resolved.mode,
        accessSource: resolved.source,
      };
    });
  }
}
