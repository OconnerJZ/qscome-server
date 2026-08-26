// src/serializers/menu.serializer.ts
// Formatos de menú en un solo lugar.

import { Menus } from "../entities/Menus";

const baseMenuItem = (m: Menus) => ({
  id: m.menuId,
  name: m.itemName,
  description: m.description,
  price: Number.parseFloat(m.price || "0"),
  image: m.imageUrl,
  category: m.category,
  available: m.isAvailable,
});

export const formatMenuCard = (m: Menus) => ({
  ...baseMenuItem(m),
  businessId: m.businessId,
  businessName: m.business?.businessName,
});

export const formatMenuDetail = (m: Menus) => ({
  ...baseMenuItem(m),
  businessId: m.businessId,
  options: m.menuOptions,
  optionGroups: m.menuOptionGroups,
});

export const formatBusinessMenuItem = (m: Menus) => baseMenuItem(m);

// Create/update devuelven el mismo contrato visual consumido por React.
export const formatMenuMini = (m: Menus) => ({
  ...baseMenuItem(m),
  businessId: m.businessId,
});
