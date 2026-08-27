import { Business } from "../entities/Business";
import { Menus } from "../entities/Menus";

const buildTags = (b: Business) =>
  b.businessFoodTypes?.map((ft) => ({
    id: ft.foodTypeId,
    label: ft.foodType?.typeName,
    color: "warning",
  })) || [];

const formatPhotos = (b: Business) =>
  b.businessPhotos?.map((photo) => ({
    id: photo.photoId,
    url: photo.photoUrl,
  })) || [];

const getCoverImage = (b: Business) =>
  b.bannerUrl || b.businessPhotos?.[0]?.photoUrl || b.logoUrl || null;

const formatLocation = (b: Business) => {
  const location = b.locations?.[0];
  if (!location) return null;
  return {
    address: location.address,
    city: location.city,
    postalCode: location.postalCode,
    latitude: location.latitude,
    longitude: location.longitude,
  };
};

const formatSchedules = (b: Business) =>
  b.businessSchedules?.map((schedule) => ({
    id: schedule.scheduleId,
    day: schedule.day,
    isClosed: Boolean(schedule.isClosed),
    opened: schedule.opened,
    closed: schedule.closed,
    isHoliday: Boolean(schedule.isHoliday),
  })) || [];

const formatDeliverySettings = (b: Business) => {
  const settings = b.businessDeliverySettings?.[0];
  if (!settings) return null;
  return {
    deliveryRadiusKm: Number(settings.deliveryRadiusKm || 0),
    deliveryFee: Number(settings.deliveryFee || 0),
    minOrderAmount: Number(settings.minOrderAmount || 0),
    estimatedTimeMin: Number(settings.estimatedTimeMin || 0),
    useOwnDelivery: Boolean(settings.useOwnDelivery),
  };
};

const formatPaymentMethods = (b: Business) =>
  b.businessPaymentMethods?.map((method) => ({
    method: method.method,
    active: Boolean(method.isActive),
    config: method.configJson,
  })) || [];

const formatBusinessProfile = (b: Business) => ({
  id: b.businessId,
  name: b.businessName,
  title: b.businessName,
  phone: b.phone,
  email: b.email,
  logo: b.logoUrl,
  logoUrl: b.logoUrl,
  bannerUrl: b.bannerUrl,
  coverImage: getCoverImage(b),
  photos: formatPhotos(b),
  open: Boolean(b.isOpen),
  isOpen: Boolean(b.isOpen),
  hasDelivery: Boolean(b.hasDelivery),
  prepTimeMin: b.prepTimeMin,
  estimatedDeliveryMin: b.estimatedDeliveryMin,
  location: formatLocation(b),
  locations: b.locations || [],
  schedules: formatSchedules(b),
  tags: buildTags(b),
  foodTypes:
    b.businessFoodTypes?.map((ft) => ({
      id: ft.foodTypeId,
      name: ft.foodType?.typeName,
    })) || [],
  deliverySettings: formatDeliverySettings(b),
  paymentMethods: formatPaymentMethods(b),
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

// GET /api/business — perfil público suficientemente completo para Explore.
export const formatBusinessCard = (b: Business) => ({
  ...formatBusinessProfile(b),
  likes: 0,
  social: {
    facebook: "",
    instagram: "",
    whats: b.phone ? `https://wa.me/${b.phone.replace(/\D/g, "")}` : "",
  },
});

// GET /api/business/owner/:ownerId — mismo contrato base para evitar datos parciales.
export const formatOwnerBusinessCard = (b: Business) => ({
  ...formatBusinessProfile(b),
  isVerified: Boolean(b.isVerified),
});

// GET /api/business/:id — detalle completo.
export const formatBusinessDetail = (b: Business) => ({
  ...formatBusinessProfile(b),
  businessName: b.businessName,
  isVerified: Boolean(b.isVerified),
});

export const formatMenuItem = (m: Menus) => ({
  id: m.menuId,
  name: m.itemName,
  description: m.description,
  price: Number.parseFloat(m.price || "0"),
  image: m.imageUrl,
  available: m.isAvailable,
  category: m.category,
});
