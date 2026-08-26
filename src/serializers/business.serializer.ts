// src/serializers/business.serializer.ts
// Presentación de negocios en un solo lugar (antes inline y repetida en el
// controller): card público, card de owner, detalle y item de menú.

import { Business } from "../entities/Business";
import { Menus } from "../entities/Menus";

const buildTags = (b: Business) =>
  b.businessFoodTypes?.map((ft) => ({
    label: ft.foodType?.typeName,
    color: "warning",
  })) || [];

// GET /api/business — card para el listado público.
export const formatBusinessCard = (b: Business) => ({
  id: b.businessId,
  title: b.businessName,
  urlImage: b.logoUrl || b.bannerUrl,
  isOpen: b.isOpen,
  likes: 0,
  hasDelivery: b.hasDelivery,
  tags: buildTags(b),
  emails: [b.email].filter(Boolean),
  phones: [b.phone].filter(Boolean),
  social: {
    facebook: "",
    instagram: "",
    whats: b.phone ? `https://wa.me/${b.phone.replace(/\D/g, "")}` : "",
  },
  prepTimeMin: b.prepTimeMin,
  estimatedDeliveryMin: b.estimatedDeliveryMin,
  createdAt: b.createdAt,
});

// GET /api/business/owner/:ownerId — card para el dashboard del owner.
export const formatOwnerBusinessCard = (b: Business) => ({
  id: b.businessId,
  title: b.businessName,
  urlImage: b.logoUrl || b.bannerUrl,
  isOpen: b.isOpen,
  hasDelivery: b.hasDelivery,
  prepTimeMin: b.prepTimeMin,
  estimatedDeliveryMin: b.estimatedDeliveryMin,
  locations: b.locations,
  tags: buildTags(b),
  createdAt: b.createdAt,
});

// GET /api/business/:id — detalle completo.
export const formatBusinessDetail = (b: Business) => ({
  id: b.businessId,
  businessName: b.businessName,
  phone: b.phone,
  email: b.email,
  logoUrl: b.logoUrl,
  bannerUrl: b.bannerUrl,
  isOpen: b.isOpen,
  hasDelivery: b.hasDelivery,
  isVerified: b.isVerified,
  prepTimeMin: b.prepTimeMin,
  estimatedDeliveryMin: b.estimatedDeliveryMin,
  locations: b.locations,
  schedules: b.businessSchedules,
  foodTypes: b.businessFoodTypes?.map((ft) => ({
    id: ft.foodTypeId,
    name: ft.foodType?.typeName,
  })),
  deliverySettings: b.businessDeliverySettings?.[0] || null,
  paymentMethods: b.businessPaymentMethods,
  photos: b.businessPhotos,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

// GET /api/business/:id/menu — item de menú.
export const formatMenuItem = (m: Menus) => ({
  id: m.menuId,
  name: m.itemName,
  description: m.description,
  price: Number.parseFloat(m.price || "0"),
  image: m.imageUrl,
  available: m.isAvailable,
  category: m.category,
});