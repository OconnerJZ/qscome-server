import { BusinessPlanService } from "./BusinessPlanService";
import {
  BusinessPlanLimitKey,
  getBusinessPlanDefinition,
  isBusinessPlanCode,
} from "../security/businessPlans";
import { HttpError } from "../utils/httpError";

export class BusinessPlanImpactService {
  private readonly plans = new BusinessPlanService();

  async preview(businessId: number, targetPlanCode: string) {
    if (!isBusinessPlanCode(targetPlanCode)) {
      throw new HttpError(400, "Plan objetivo inválido");
    }

    const current = await this.plans.get(businessId);
    const target = getBusinessPlanDefinition(targetPlanCode);
    const usageByLimit: Partial<Record<BusinessPlanLimitKey, number>> = {
      teamMembers:
        Number(current.usage?.teamMembers || 0)
        + Number(current.usage?.pendingInvitations || 0),
      menuItems: Number(current.usage?.menuItems || 0),
      businessPhotos: Number(current.usage?.businessPhotos || 0),
    };

    const limits = Object.entries(target.limits).map(([key, max]) => {
      const used = usageByLimit[key as BusinessPlanLimitKey] ?? null;
      const exceeded = max !== null && used !== null && used > max;
      return {
        key,
        used,
        max,
        exceeded,
        overBy: exceeded && max !== null && used !== null ? used - max : 0,
      };
    });
    const overages = limits.filter((entry) => entry.exceeded);

    return {
      businessId,
      current: {
        effectivePlanCode: current.plan?.code,
        basePlanCode: current.basePlan?.code,
        trialActive: Boolean(current.trial?.active),
      },
      target: {
        code: target.code,
        name: target.name,
        policies: target.policies,
        limits,
      },
      impact: {
        hasOverages: overages.length > 0,
        overages,
        requiresCommercialDecision: overages.length > 0,
        cancelsActiveTrial: Boolean(current.trial?.active),
        destructiveChangesApplied: false,
      },
    };
  }
}
