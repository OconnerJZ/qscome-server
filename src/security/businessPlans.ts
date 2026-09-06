export const BUSINESS_PLAN_CODES = ["free", "level_1", "level_2", "level_3"] as const;
export type BusinessPlanCode = (typeof BUSINESS_PLAN_CODES)[number];

export type BusinessPlanLimitKey =
  | "teamMembers"
  | "menuItems"
  | "businessPhotos"
  | "analyticsHistoryDays";

export type BusinessPlanPolicyKey = "adsEnabled";
export type BusinessPlanFeatureStatus = "available" | "coming_soon";
export type BusinessPlanFeatureCategory =
  | "core"
  | "reputation"
  | "growth"
  | "intelligence"
  | "advanced";
export type BusinessPlanCommercialModel = "core" | "plan" | "separate_product";

export interface BusinessPlanFeature {
  key: string;
  label: string;
  description?: string;
  category: BusinessPlanFeatureCategory;
  commercialModel: BusinessPlanCommercialModel;
  included: boolean;
  status: BusinessPlanFeatureStatus;
}

export interface BusinessPlanDefinition {
  code: BusinessPlanCode;
  name: string;
  description: string;
  positioning: string;
  rank: number;
  price: null;
  currency: "MXN";
  policies: Record<BusinessPlanPolicyKey, boolean>;
  adsEnabled: boolean;
  features: BusinessPlanFeature[];
  limits: Record<BusinessPlanLimitKey, number | null>;
}

const PLAN_RANK: Readonly<Record<BusinessPlanCode, number>> = {
  free: 0,
  level_1: 1,
  level_2: 2,
  level_3: 3,
};

export const APPROVED_PLAN_LIMITS: Readonly<
  Record<BusinessPlanCode, Record<BusinessPlanLimitKey, number>>
> = {
  free: {
    teamMembers: 3,
    menuItems: 75,
    businessPhotos: 4,
    analyticsHistoryDays: 30,
  },
  level_1: {
    teamMembers: 10,
    menuItems: 200,
    businessPhotos: 8,
    analyticsHistoryDays: 90,
  },
  level_2: {
    teamMembers: 30,
    menuItems: 500,
    businessPhotos: 15,
    analyticsHistoryDays: 365,
  },
  level_3: {
    teamMembers: 90,
    menuItems: 1500,
    businessPhotos: 25,
    analyticsHistoryDays: 730,
  },
};

const CORE_FEATURES = [
  ["orders.secure", "Órdenes y precios validados", "Compra y operación sin limitar el volumen de órdenes."],
  ["realtime", "Actualización en tiempo real", "Seguimiento en vivo para cliente y negocio."],
  ["kitchen", "Kitchen Board", "Flujo de preparación y estados por producto."],
  ["productCustomization", "Personalización de productos", "Modificadores, ingredientes y extras."],
  ["transferEvidence", "Comprobantes de transferencia", "Evidencia y revisión de pagos por transferencia."],
  ["sharedOrders", "Órdenes compartidas", "Crear, unir y consolidar pedidos grupales."],
  ["reviews.core", "Reseñas verificadas", "Calificar compras completadas y responder reseñas."],
  ["analytics", "Métricas básicas del negocio", "Indicadores operativos esenciales."],
  ["teamRoles", "Roles y acceso por negocio", "Permisos business-scoped para el equipo."],
  ["concurrency", "Protección contra cambios simultáneos", "Controles de consistencia para operaciones sensibles."],
] as const;

interface CommercialFeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: Exclude<BusinessPlanFeatureCategory, "core">;
  minimumPlan: Exclude<BusinessPlanCode, "free">;
  commercialModel: Exclude<BusinessPlanCommercialModel, "core">;
  status: "coming_soon";
}

const COMMERCIAL_FEATURES: readonly CommercialFeatureDefinition[] = [
  {
    key: "reputation.insights",
    label: "Reputation Insights",
    description: "Tendencias de calificación, categorías y señales accionables de reputación.",
    category: "reputation",
    minimumPlan: "level_1",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "loyalty.management",
    label: "Gestión de lealtad",
    description: "Configurar recompensas y reglas; participar como cliente seguirá siendo gratuito.",
    category: "growth",
    minimumPlan: "level_1",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "marketing.center",
    label: "Marketing Center",
    description: "Centro para promociones y herramientas de crecimiento del negocio.",
    category: "growth",
    minimumPlan: "level_1",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "ads.planBenefits",
    label: "Beneficios en qsCome Ads",
    description: "Beneficios comerciales como créditos o condiciones preferentes; nunca ranking orgánico garantizado.",
    category: "growth",
    minimumPlan: "level_1",
    commercialModel: "separate_product",
    status: "coming_soon",
  },
  {
    key: "analytics.advanced",
    label: "Analítica avanzada",
    description: "Lecturas más profundas de desempeño, cohortes y tendencias del negocio.",
    category: "intelligence",
    minimumPlan: "level_2",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "customer.intelligence",
    label: "Customer Intelligence",
    description: "Nuevos vs. recurrentes, recompra, inactividad y valor agregado de clientes.",
    category: "intelligence",
    minimumPlan: "level_2",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "customer.segments",
    label: "Segmentos de clientes",
    description: "Audiencias de negocio basadas en comportamiento agregado y consentimiento aplicable.",
    category: "growth",
    minimumPlan: "level_2",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "exports",
    label: "Exportaciones avanzadas",
    description: "Exportar información operativa y analítica cuando el módulo esté disponible.",
    category: "intelligence",
    minimumPlan: "level_2",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "marketing.advanced",
    label: "Marketing avanzado",
    description: "Campañas y segmentación más sofisticadas sobre herramientas ya disponibles.",
    category: "growth",
    minimumPlan: "level_2",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "automations",
    label: "Automatizaciones",
    description: "Acciones automáticas basadas en señales operativas o de crecimiento.",
    category: "advanced",
    minimumPlan: "level_3",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "multiLocation",
    label: "Multi-sucursal",
    description: "Gestión consolidada de varias ubicaciones cuando el producto lo requiera.",
    category: "advanced",
    minimumPlan: "level_3",
    commercialModel: "plan",
    status: "coming_soon",
  },
  {
    key: "integrations.advanced",
    label: "Integraciones avanzadas",
    description: "Conectores e integraciones empresariales justificadas por demanda real.",
    category: "advanced",
    minimumPlan: "level_3",
    commercialModel: "plan",
    status: "coming_soon",
  },
] as const;

const LIMIT_KEYS: BusinessPlanLimitKey[] = [
  "teamMembers",
  "menuItems",
  "businessPhotos",
  "analyticsHistoryDays",
];

const featuresForPlan = (code: BusinessPlanCode): BusinessPlanFeature[] => [
  ...CORE_FEATURES.map(([key, label, description]) => ({
    key,
    label,
    description,
    category: "core" as const,
    commercialModel: "core" as const,
    included: true,
    status: "available" as const,
  })),
  ...COMMERCIAL_FEATURES.map((feature) => ({
    key: feature.key,
    label: feature.label,
    description: feature.description,
    category: feature.category,
    commercialModel: feature.commercialModel,
    included: PLAN_RANK[code] >= PLAN_RANK[feature.minimumPlan],
    status: feature.status,
  })),
];

const definition = (
  code: BusinessPlanCode,
  name: string,
  description: string,
  positioning: string,
  adsEnabled: boolean,
): BusinessPlanDefinition => ({
  code,
  name,
  description,
  positioning,
  rank: PLAN_RANK[code],
  price: null,
  currency: "MXN",
  policies: { adsEnabled },
  adsEnabled,
  features: featuresForPlan(code),
  limits: { ...APPROVED_PLAN_LIMITS[code] },
});

const BASE_CATALOG: BusinessPlanDefinition[] = [
  definition("free", "Gratis", "Todo lo esencial para comenzar a vender y operar un negocio real; puede mostrar publicidad.", "Empieza a vender", true),
  definition("level_1", "Nivel 1", "Profesionaliza la operación y prepara herramientas de reputación, lealtad y crecimiento.", "Profesionaliza tu negocio", false),
  definition("level_2", "Nivel 2", "Para negocios en crecimiento que necesitan mayor escala, inteligencia comercial y marketing avanzado.", "Haz crecer tu negocio", false),
  definition("level_3", "Nivel 3", "Para optimización, automatización y necesidades de escala avanzada a medida que se incorporen.", "Optimiza y escala", false),
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
        if (raw === undefined) return [key, plan.limits[key]];
        const value = raw === null ? null : Number(raw);
        return [key, value !== null && Number.isInteger(value) && value >= 0 ? value : plan.limits[key]];
      }),
    ) as Record<BusinessPlanLimitKey, number | null>,
  }));
};

export const getBusinessPlanDefinition = (code?: string | null) =>
  getBusinessPlanCatalog().find((plan) => plan.code === code) || getBusinessPlanCatalog()[0];

export const getBusinessPlanRank = (code?: string | null) =>
  isBusinessPlanCode(code) ? PLAN_RANK[code] : PLAN_RANK.free;

export const compareBusinessPlanCodes = (
  current?: string | null,
  target?: string | null,
): "upgrade" | "downgrade" | "same" => {
  const difference = getBusinessPlanRank(target) - getBusinessPlanRank(current);
  if (difference > 0) return "upgrade";
  if (difference < 0) return "downgrade";
  return "same";
};

export const isBusinessPlanCode = (value: unknown): value is BusinessPlanCode =>
  BUSINESS_PLAN_CODES.includes(value as BusinessPlanCode);
