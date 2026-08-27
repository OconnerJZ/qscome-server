// src/serializers/menu.serializer.ts
// Formatos de menú en un solo lugar.

import { Menus } from "../entities/Menus";

const formatModifierGroups = (m: Menus) =>
  (m.menuOptionGroups || []).map((group) => ({
    id: group.groupId,
    title: group.title,
    minSelect: Number(group.minSelect || 0),
    maxSelect: Number(group.maxSelect || 0),
    selectionType: Number(group.maxSelect || 0) === 1 ? "single" : "multiple",
    required: Number(group.minSelect || 0) > 0,
    choices: (group.menuOptionChoices || []).map((choice) => ({
      id: choice.choiceId,
      name: choice.name,
      priceExtra: Number.parseFloat(choice.priceExtra || "0"),
      defaultSelected: Boolean(choice.isDefault),
    })),
  }));

const baseMenuItem = (m: Menus) => ({
  id: m.menuId,
  name: m.itemName,
  description: m.description,
  price: Number.parseFloat(m.price || "0"),
  image: m.imageUrl,
  category: m.category,
  available: m.isAvailable,
  modifierGroups: formatModifierGroups(m),
});

export const formatMenuCard = (m: Menus) => ({
  ...baseMenuItem(m),
  businessId: m.businessId,
  businessName: m.business?.businessName,
});

export const formatMenuDetail = (m: Menus) => ({
  ...baseMenuItem(m),
  businessId: m.businessId,
  options: m.menuOptions, // compatibilidad legacy
  optionGroups: formatModifierGroups(m),
});

export const formatBusinessMenuItem = (m: Menus) => baseMenuItem(m);

export const formatMenuMini = (m: Menus) => ({
  ...baseMenuItem(m),
  businessId: m.businessId,
});
