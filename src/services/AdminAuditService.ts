import { AppDataSource } from "../utils/db";
import { HttpError } from "../utils/httpError";

export const ADMIN_AUDIT_SOURCES = ["platform", "plans"] as const;
export type AdminAuditSource = typeof ADMIN_AUDIT_SOURCES[number];

export const ADMIN_PLATFORM_AUDIT_ACTIONS = [
  "BUSINESS_SUSPENDED",
  "BUSINESS_REACTIVATED",
  "BUSINESS_VERIFIED",
  "BUSINESS_UNVERIFIED",
  "USER_BLOCKED",
  "USER_REACTIVATED",
  "USER_GLOBAL_ROLE_CHANGED",
  "FEATURE_CONTROL_OVERRIDE_CLEARED",
  "FEATURE_CONTROL_OVERRIDE_SET",
  "AD_MODERATION_APPROVED",
  "AD_MODERATION_REJECTED",
  "MARKETING_CAMPAIGN_ADMIN_PAUSED",
  "MARKETING_CAMPAIGN_ADMIN_ENDED",
  "AD_CAMPAIGN_ADMIN_PAUSED",
  "AD_CAMPAIGN_ADMIN_ENDED",
] as const;

const platformActionPlaceholders = ADMIN_PLATFORM_AUDIT_ACTIONS.map(() => "?").join(", ");

const parseJson = (value: unknown) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
};

const normalizeLimit = (value: unknown) => {
  const parsed = Number.parseInt(String(value || 50), 10);
  return Math.min(100, Math.max(1, Number.isFinite(parsed) ? parsed : 50));
};

const normalizeSource = (value: unknown): AdminAuditSource | "" => {
  const source = String(value || "").trim().toLowerCase();
  if (!source) return "";
  if ((ADMIN_AUDIT_SOURCES as readonly string[]).includes(source)) return source as AdminAuditSource;
  throw new HttpError(400, "Fuente de auditoría inválida");
};

const normalizeDate = (value: unknown, field: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${field} inválida`);
  return date;
};

export class AdminAuditService {
  async summary() {
    const [platformRows, planRows, latestRows] = await Promise.all([
      AppDataSource.query(`
        SELECT COUNT(*) total
        FROM audit_logs
        WHERE action IN (${platformActionPlaceholders})
      `, [...ADMIN_PLATFORM_AUDIT_ACTIONS]),
      AppDataSource.query(`
        SELECT COUNT(*) total
        FROM business_plan_audit_events
      `),
      AppDataSource.query(`
        SELECT MAX(created_at) latestAt
        FROM (
          SELECT created_at
          FROM audit_logs
          WHERE action IN (${platformActionPlaceholders})
          UNION ALL
          SELECT created_at FROM business_plan_audit_events
        ) audit_union
      `, [...ADMIN_PLATFORM_AUDIT_ACTIONS]),
    ]);

    const platform = Number(platformRows?.[0]?.total || 0);
    const plans = Number(planRows?.[0]?.total || 0);
    return {
      generatedAt: new Date().toISOString(),
      total: platform + plans,
      sources: { platform, plans },
      latestAt: latestRows?.[0]?.latestAt || null,
    };
  }

  async list(input: {
    q?: unknown;
    action?: unknown;
    source?: unknown;
    actorUserId?: unknown;
    targetId?: unknown;
    from?: unknown;
    to?: unknown;
    limit?: unknown;
  } = {}) {
    const q = String(input.q || "").trim().slice(0, 100);
    const action = String(input.action || "").trim().slice(0, 100);
    const source = normalizeSource(input.source);
    const actorUserId = this.optionalPositiveInt(input.actorUserId, "Administrador inválido");
    const targetId = this.optionalPositiveInt(input.targetId, "Recurso inválido");
    const from = normalizeDate(input.from, "Fecha inicial");
    const to = normalizeDate(input.to, "Fecha final");
    if (from && to && from.getTime() > to.getTime()) {
      throw new HttpError(400, "La fecha inicial no puede ser posterior a la fecha final");
    }
    const limit = normalizeLimit(input.limit);

    const platformEnabled = !source || source === "platform";
    const plansEnabled = !source || source === "plans";
    const rows = await AppDataSource.query(`
      SELECT * FROM (
        ${platformEnabled ? `
          SELECT
            CONCAT('platform:', audit.audit_id) eventKey,
            'platform' source,
            audit.audit_id eventId,
            audit.actor_user_id actorUserId,
            actor.user_name actorName,
            actor.email actorEmail,
            audit.action action,
            audit.target_table targetType,
            audit.target_id targetId,
            audit.before_json beforeJson,
            audit.after_json afterJson,
            audit.created_at createdAt
          FROM audit_logs audit
          LEFT JOIN users actor ON actor.user_id = audit.actor_user_id
          WHERE audit.action IN (${platformActionPlaceholders})
        ` : `
          SELECT
            NULL eventKey, NULL source, NULL eventId, NULL actorUserId,
            NULL actorName, NULL actorEmail, NULL action, NULL targetType,
            NULL targetId, NULL beforeJson, NULL afterJson, NULL createdAt
          WHERE 1 = 0
        `}
        UNION ALL
        ${plansEnabled ? `
          SELECT
            CONCAT('plans:', audit.audit_id) eventKey,
            'plans' source,
            audit.audit_id eventId,
            audit.actor_user_id actorUserId,
            actor.user_name actorName,
            actor.email actorEmail,
            audit.action action,
            'business_plan' targetType,
            audit.business_id targetId,
            JSON_OBJECT('plan', audit.previous_plan) beforeJson,
            JSON_OBJECT('plan', audit.next_plan, 'metadata', audit.metadata_json) afterJson,
            audit.created_at createdAt
          FROM business_plan_audit_events audit
          LEFT JOIN users actor ON actor.user_id = audit.actor_user_id
        ` : `
          SELECT
            NULL eventKey, NULL source, NULL eventId, NULL actorUserId,
            NULL actorName, NULL actorEmail, NULL action, NULL targetType,
            NULL targetId, NULL beforeJson, NULL afterJson, NULL createdAt
          WHERE 1 = 0
        `}
      ) events
      WHERE (? = '' OR events.action LIKE ? OR events.targetType LIKE ? OR events.actorName LIKE ? OR events.actorEmail LIKE ? OR CAST(events.targetId AS CHAR) LIKE ?)
        AND (? = '' OR events.action = ?)
        AND (? IS NULL OR events.actorUserId = ?)
        AND (? IS NULL OR events.targetId = ?)
        AND (? IS NULL OR events.createdAt >= ?)
        AND (? IS NULL OR events.createdAt <= ?)
      ORDER BY events.createdAt DESC, events.eventId DESC
      LIMIT ${limit}
    `, [
      ...(platformEnabled ? ADMIN_PLATFORM_AUDIT_ACTIONS : []),
      q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`,
      action, action,
      actorUserId, actorUserId,
      targetId, targetId,
      from, from,
      to, to,
    ]);

    return rows.map((row: Record<string, unknown>) => ({
      key: String(row.eventKey),
      source: String(row.source),
      id: Number(row.eventId),
      actor: row.actorUserId == null ? null : {
        id: Number(row.actorUserId),
        name: row.actorName || null,
        email: row.actorEmail || null,
      },
      action: String(row.action || ""),
      target: {
        type: row.targetType || null,
        id: row.targetId == null ? null : Number(row.targetId),
      },
      before: parseJson(row.beforeJson),
      after: this.normalizeAfter(row.source, row.afterJson),
      createdAt: row.createdAt || null,
    }));
  }

  private normalizeAfter(source: unknown, value: unknown) {
    const parsed = parseJson(value);
    if (source !== "plans" || !parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
    const record = parsed as Record<string, unknown>;
    return {
      ...record,
      metadata: parseJson(record.metadata),
    };
  }

  private optionalPositiveInt(value: unknown, message: string) {
    if (value == null || String(value).trim() === "") return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) throw new HttpError(400, message);
    return parsed;
  }
}
