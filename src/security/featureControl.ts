import {
  BUSINESS_PLAN_CODES,
  BusinessPlanCode,
  BusinessPlanFeature,
  getBusinessPlanCatalog,
} from "./businessPlans";

export const FEATURE_CONTROL_MODES = ["enabled", "read_only", "disabled"] as const;
export type FeatureControlMode = (typeof FEATURE_CONTROL_MODES)[number];
export type FeatureControlSource = "immutable" | "global" | "business" | "plan" | "entitlement";

export interface FeatureControlRegistryEntry {
  key: string;
  label: string;
  description?: string;
  category: BusinessPlanFeature["category"];
  commercialModel: BusinessPlanFeature["commercialModel"];
  status: BusinessPlanFeature["status"];
  immutable: boolean;
  immutableReason: string | null;
  plans: Record<BusinessPlanCode, FeatureControlMode>;
}

export interface FeatureControlResolutionInput {
  planDefault: FeatureControlMode;
  immutable?: boolean;
  globalMode?: FeatureControlMode | null;
  planMode?: FeatureControlMode | null;
  businessMode?: FeatureControlMode | null;
}

export interface FeatureControlResolution {
  mode: FeatureControlMode;
  source: FeatureControlSource;
}

const defaultModeFor = (feature: BusinessPlanFeature): FeatureControlMode => (
  feature.status === "available" && feature.included ? "enabled" : "disabled"
);

export const getFeatureControlRegistry = (): FeatureControlRegistryEntry[] => {
  const catalog = getBusinessPlanCatalog();
  const byKey = new Map<string, FeatureControlRegistryEntry>();

  for (const plan of catalog) {
    for (const feature of plan.features) {
      const existing = byKey.get(feature.key);
      if (!existing) {
        const immutable = feature.commercialModel === "core" || feature.status !== "available";
        byKey.set(feature.key, {
          key: feature.key,
          label: feature.label,
          description: feature.description,
          category: feature.category,
          commercialModel: feature.commercialModel,
          status: feature.status,
          immutable,
          immutableReason: feature.commercialModel === "core"
            ? "Funcionalidad core protegida"
            : feature.status !== "available"
              ? "Implementación pendiente"
              : null,
          plans: {
            free: "disabled",
            level_1: "disabled",
            level_2: "disabled",
            level_3: "disabled",
          },
        });
      }

      const entry = byKey.get(feature.key)!;
      entry.plans[plan.code] = defaultModeFor(feature);
    }
  }

  return [...byKey.values()];
};

export const getFeatureControlRegistryEntry = (featureKey: string) => (
  getFeatureControlRegistry().find((entry) => entry.key === featureKey) || null
);

export const resolveFeatureControlMode = (
  input: FeatureControlResolutionInput,
): FeatureControlResolution => {
  if (input.immutable) {
    return { mode: input.planDefault, source: "immutable" };
  }

  if (input.globalMode === "disabled") {
    return { mode: "disabled", source: "global" };
  }

  let mode = input.planDefault;
  let source: FeatureControlSource = "entitlement";

  if (input.planMode) {
    mode = input.planMode;
    source = "plan";
  }
  if (input.businessMode) {
    mode = input.businessMode;
    source = "business";
  }

  // Global enabled means the platform permits downstream policy to decide.
  // Global read_only is a safety cap and never resurrects a disabled feature.
  if (input.globalMode === "read_only" && mode !== "disabled") {
    return { mode: "read_only", source: "global" };
  }

  return { mode, source };
};

export const isFeatureControlMode = (value: unknown): value is FeatureControlMode => (
  FEATURE_CONTROL_MODES.includes(value as FeatureControlMode)
);

export const featurePlanDefaults = (featureKey: string) => {
  const entry = getFeatureControlRegistryEntry(featureKey);
  return entry
    ? Object.fromEntries(BUSINESS_PLAN_CODES.map((code) => [code, entry.plans[code]]))
    : null;
};
