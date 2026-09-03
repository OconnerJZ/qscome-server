export interface PaymentAccessContext {
  requesterUserId?: number;
  globalRole?: string | null;
  paymentUserId?: number | null;
  orderUserId?: number | null;
}

/** Access granted without consulting a business membership. */
export const hasDirectPaymentAccess = (context: PaymentAccessContext): boolean => {
  if (context.globalRole === "admin") return true;
  if (!context.requesterUserId) return false;
  return context.requesterUserId === context.paymentUserId
    || context.requesterUserId === context.orderUserId;
};
