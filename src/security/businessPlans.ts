export const BUSINESS_PLAN_CODES = ["free", "level_1", "level_2", "level_3"] as const;
export type BusinessPlanCode = (typeof BUSINESS_PLAN_CODES)[number];
export type BusinessPlanLimitKey = "teamMembers" | "menuItems" | "analyticsHistoryDays" | "monthlyExports" | "sharedParticipants" | "activeSharedSessions";

export interface BusinessPlanDefinition {
  code: BusinessPlanCode;
  name: string;
  description: string;
  adsEnabled: boolean;
  price: null;
  currency: "MXN";
  features: Array<{ key: string; label: string; included: boolean; status: "available" | "coming_soon" }>;
  limits: Record<BusinessPlanLimitKey, number | null>;
}

const CORE_FEATURES = [
  ["orders.secure", "Órdenes y precios validados"], ["realtime", "Actualización en tiempo real"],
  ["kitchen", "Kitchen Board"], ["transferEvidence", "Comprobantes de transferencia"],
  ["concurrency", "Protección contra cambios simultáneos"], ["sharedOrders", "Órdenes compartidas"],
  ["analytics", "Métricas del negocio"], ["teamRoles", "Roles y acceso por negocio"],
] as const;
const LIMIT_KEYS: BusinessPlanLimitKey[] = ["teamMembers", "menuItems", "analyticsHistoryDays", "monthlyExports", "sharedParticipants", "activeSharedSessions"];
const emptyLimits = (): Record<BusinessPlanLimitKey, null> => ({ teamMembers: null, menuItems: null, analyticsHistoryDays: null, monthlyExports: null, sharedParticipants: null, activeSharedSessions: null });

const definition = (code: BusinessPlanCode, name: string, description: string, adsEnabled: boolean, extras: BusinessPlanDefinition["features"] = []): BusinessPlanDefinition => ({
  code, name, description, adsEnabled, price: null, currency: "MXN",
  features: [...CORE_FEATURES.map(([key, label]) => ({ key, label, included: true, status: "available" as const })), ...extras],
  limits: emptyLimits(),
});

const BASE_CATALOG: BusinessPlanDefinition[] = [
  definition("free", "Gratis", "Operación confiable para comenzar; puede mostrar anuncios.", true),
  definition("level_1", "Nivel 1", "Experiencia sin anuncios y límites ampliables por configuración.", false),
  definition("level_2", "Nivel 2", "Preparado para exportaciones y análisis de mayor alcance.", false, [{ key: "analyticsExports", label: "Exportaciones de analítica", included: false, status: "coming_soon" }]),
  definition("level_3", "Nivel 3", "Base para herramientas financieras y operativas premium.", false, [{ key: "inventoryCosts", label: "Inventario, recetas, costos, margen y utilidad", included: false, status: "coming_soon" }]),
];

const configuredLimits = () => {
  try {
    const parsed = JSON.parse(process.env.BUSINESS_PLAN_LIMITS_JSON || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
};

export const getBusinessPlanCatalog = (): BusinessPlanDefinition[] => {
  const overrides = configuredLimits() as Record<string, Record<string, unknown>>;
  return BASE_CATALOG.map((plan) => ({ ...plan, features: plan.features.map((feature) => ({ ...feature })), limits: Object.fromEntries(LIMIT_KEYS.map((key) => {
    const raw = overrides[plan.code]?.[key];
    const value = raw === null || raw === undefined ? null : Number(raw);
    return [key, value !== null && Number.isInteger(value) && value >= 0 ? value : null];
  })) as Record<BusinessPlanLimitKey, number | null> }));
};

export const getBusinessPlanDefinition = (code?: string | null) => getBusinessPlanCatalog().find((plan) => plan.code === code) || getBusinessPlanCatalog()[0];
export const isBusinessPlanCode = (value: unknown): value is BusinessPlanCode => BUSINESS_PLAN_CODES.includes(value as BusinessPlanCode);
