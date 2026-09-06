export const BUSINESS_PLAN_CODES = ["free", "level_1", "level_2", "level_3"] as const;
export type BusinessPlanCode = (typeof BUSINESS_PLAN_CODES)[number];

// Commercial limits describe business scale. Customer-facing/core ordering flows
// (including realtime and shared orders) are intentionally not monetization limits.
export type BusinessPlanLimitKey =
  | "teamMembers"
  | "menuItems"
  | "businessPhotos"
  | "analyticsHistoryDays";

export type BusinessPlanPolicyKey = "adsEnabled";

export interface BusinessPlanFeature {
  key: string;
  label: string;
  included: boolean;
  status: "available" | "coming_soon";
}

export interface BusinessPlanDefinition {
  code: BusinessPlanCode;
  name: string;
  description: string;
  price: null;
  currency: "MXN";
  policies: Record<BusinessPlanPolicyKey, boolean>;
  // Kept during the transition so existing clients do not break while they move
  // to policies.adsEnabled.
  adsEnabled: boolean;
  features: BusinessPlanFeature[];
  limits: Record<BusinessPlanLimitKey, number | null>;
}

// These capabilities are part of qsCome's core product and remain available on
// every plan. They must never be used as plan gates without a product decision.
const CORE_FEATURES = [
  ["orders.secure", "Órdenes y precios validados"],
  ["realtime", "Actualización en tiempo real"],
  ["kitchen", "Kitchen Board"],
  ["transferEvidence", "Comprobantes de transferencia"],
  ["concurrency", "Protección contra cambios simultáneos"],
  ["sharedOrders", "Órdenes compartidas"],
  ["analytics", "Métricas del negocio"],
  ["teamRoles", "Roles y acceso por negocio"],
] as const;

const LIMIT_KEYS: BusinessPlanLimitKey[] = [
  "teamMembers",
  "menuItems",
  "businessPhotos",
  "analyticsHistoryDays",
];

const emptyLimits = (): Record<BusinessPlanLimitKey, null> => ({
  teamMembers: null,
  menuItems: null,
  businessPhotos: null,
  analyticsHistoryDays: null,
});

const definition = (
  code: BusinessPlanCode,
  name: string,
  description: string,
  adsEnabled: boolean,
  extras: BusinessPlanFeature[] = [],
): BusinessPlanDefinition => ({
  code,
  name,
  description,
  price: null,
  currency: "MXN",
  policies: { adsEnabled },
  adsEnabled,
  features: [
    ...CORE_FEATURES.map(([key, label]) => ({
      key,
      label,
      included: true,
      status: "available" as const,
    })),
    ...extras,
  ],
  limits: emptyLimits(),
});

const BASE_CATALOG: BusinessPlanDefinition[] = [
  definition(
    "free",
    "Gratis",
    "Todo lo esencial para comenzar a vender y operar un negocio real; puede mostrar publicidad.",
    true,
  ),
  definition(
    "level_1",
    "Nivel 1",
    "Pensado para profesionalizar la operación, ampliar capacidad y preparar herramientas de reputación y crecimiento.",
    false,
  ),
  definition(
    "level_2",
    "Nivel 2",
    "Pensado para negocios en crecimiento que necesitan mayor escala, historial e inteligencia comercial.",
    false,
  ),
  definition(
    "level_3",
    "Nivel 3",
    "Pensado para optimización, automatización e iniciativas de escala avanzada a medida que esas capacidades se incorporen.",
    false,
  ),
];

const configuredLimits = () => {
  try {
    const parsed = JSON.parse(process.env.BUSINESS_PLAN_LIMITS_JSON || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const getBusinessPlanCatalog = (): BusinessPlanDefinition[] => {
  const overrides = configuredLimits() as Record<string, Record<string, unknown>>;

  return BASE_CATALOG.map((plan) => ({
    ...plan,
    policies: { ...plan.policies },
    features: plan.features.map((feature) => ({ ...feature })),
    limits: Object.fromEntries(
      LIMIT_KEYS.map((key) => {
        const raw = overrides[plan.code]?.[key];
        const value = raw === null || raw === undefined ? null : Number(raw);
        return [
          key,
          value !== null && Number.isInteger(value) && value >= 0 ? value : null,
        ];
      }),
    ) as Record<BusinessPlanLimitKey, number | null>,
  }));
};

export const getBusinessPlanDefinition = (code?: string | null) =>
  getBusinessPlanCatalog().find((plan) => plan.code === code) ||
  getBusinessPlanCatalog()[0];

export const isBusinessPlanCode = (value: unknown): value is BusinessPlanCode =>
  BUSINESS_PLAN_CODES.includes(value as BusinessPlanCode);
