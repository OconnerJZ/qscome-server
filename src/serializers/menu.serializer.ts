// src/serializers/menu.serializer.ts
// Formatos de menú en un solo lugar (antes inline y repetidos en el controller).

import { Menus } from "../entities/Menus";

// GET /api/menus — card con datos del negocio.
export const formatMenuCard = (m: Menus) => ({
  id: m.menuId,
  name: m.itemName,
  description: m.description,
  price: Number.parseFloat(m.price || "0"),
  image: m.imageUrl,
  category: m.category,
  available: m.isAvailable,
  businessId: m.businessId,
  businessName: m.business?.businessName,
});

// GET /api/menus/:id — detalle con opciones.
export const formatMenuDetail = (m: Menus) => ({
  id: m.menuId,
  name: m.itemName,
  description: m.description,
  price: Number.parseFloat(m.price || "0"),
  image: m.imageUrl,
  category: m.category,
  available: m.isAvailable,
  businessId: m.businessId,
  options: m.menuOptions,
  optionGroups: m.menuOptionGroups,
});

// GET /api/menus/business/:businessId — item del menú de un negocio.
export const formatBusinessMenuItem = (m: Menus) => ({
  id: m.menuId,
  name: m.itemName,
  description: m.description,
  price: Number.parseFloat(m.price || "0"),
  image: m.imageUrl,
  category: m.category,
  available: m.isAvailable,
});

// Respuesta compacta tras create/update.
export const formatMenuMini = (m: Menus) => ({
  id: m.menuId,
  name: m.itemName,
  price: Number.parseFloat(m.price || "0"),
});