export interface OrderAccessContext {
  requesterUserId?: number;
  globalRole?: string | null;
  orderUserId?: number | null;
  activeSharedParticipant?: boolean;
  businessMember?: boolean;
}

export const hasOrderReadAccess = (context: OrderAccessContext): boolean => {
  if (context.globalRole === "admin") return true;
  if (!context.requesterUserId) return false;
  return context.requesterUserId === context.orderUserId
    || context.activeSharedParticipant === true
    || context.businessMember === true;
};
