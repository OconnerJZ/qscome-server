export type PublicRegistrationRole = "customer" | "owner";

/** Public registration may only create a customer or start the owner onboarding flow. */
export const getPublicRegistrationRole = (isBusiness: unknown): PublicRegistrationRole =>
  isBusiness === true ? "owner" : "customer";
