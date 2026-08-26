// src/services/MenuService.ts
// Lógica y persistencia de productos de menú. Los controllers sólo traducen HTTP.

import { AppDataSource } from "../utils/db";
import { Menus } from "../entities/Menus";
import { HttpError } from "../utils/httpError";
import {
  formatMenuCard,
  formatMenuDetail,
  formatBusinessMenuItem,
  formatMenuMini,
} from "../serializers/menu.serializer";

export interface CreateMenuInput {
  business_id: number;
  item_name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  is_available?: boolean;
}

export class MenuService {
  private readonly menuRepo = AppDataSource.getRepository(Menus);

  // GET /api/menus — catálogo público disponible.
  async list() {
    const menus = await this.menuRepo.find({
      relations: ["business"],
      where: { isAvailable: true },
    });
    return menus.map(formatMenuCard);
  }

  // GET /api/menus/:id
  async getById(menuId: number) {
    const menu = await this.menuRepo.findOne({
      where: { menuId },
      relations: ["business", "menuOptions", "menuOptionGroups"],
    });
    if (!menu) throw new HttpError(404, "Producto no encontrado");
    return formatMenuDetail(menu);
  }

  // GET /api/menus/business/:businessId — menú público, solo disponibles.
  async getByBusiness(businessId: number) {
    const menus = await this.menuRepo.find({
      where: { businessId, isAvailable: true },
      order: { category: "ASC", itemName: "ASC" },
    });
    return menus.map(formatBusinessMenuItem);
  }

  // GET /api/menus/business/:businessId/manage — catálogo completo para operación.
  async getManagedByBusiness(businessId: number) {
    const menus = await this.menuRepo.find({
      where: { businessId },
      order: { category: "ASC", itemName: "ASC" },
    });
    return menus.map(formatBusinessMenuItem);
  }

  // POST /api/menus
  async create(input: CreateMenuInput) {
    const menu = this.menuRepo.create({
      businessId: input.business_id,
      itemName: input.item_name.trim(),
      description: input.description?.trim() || null,
      price: Number(input.price).toFixed(2),
      imageUrl: input.image_url?.trim() || null,
      category: input.category?.trim() || null,
      isAvailable:
        typeof input.is_available === "boolean" ? input.is_available : true,
    });
    await this.menuRepo.save(menu);
    return formatMenuMini(menu);
  }

  // PUT /api/menus/:id
  async update(menuId: number, body: any) {
    const menu = await this.menuRepo.findOne({ where: { menuId } });
    if (!menu) throw new HttpError(404, "Producto no encontrado");

    const { item_name, description, price, image_url, category, is_available } = body;

    if (item_name !== undefined) {
      const name = String(item_name).trim();
      if (!name) throw new HttpError(400, "El nombre del producto es requerido");
      menu.itemName = name;
    }
    if (description !== undefined) {
      menu.description = String(description).trim() || null;
    }
    if (price !== undefined) {
      const value = Number(price);
      if (!Number.isFinite(value) || value <= 0) {
        throw new HttpError(400, "El precio debe ser mayor a 0");
      }
      menu.price = value.toFixed(2);
    }
    if (image_url !== undefined) {
      menu.imageUrl = String(image_url).trim() || null;
    }
    if (category !== undefined) {
      menu.category = String(category).trim() || null;
    }
    if (typeof is_available === "boolean") menu.isAvailable = is_available;

    await this.menuRepo.save(menu);
    return formatMenuMini(menu);
  }

  // DELETE /api/menus/:id — soft delete (isAvailable = false)
  async softDelete(menuId: number) {
    const menu = await this.menuRepo.findOne({ where: { menuId } });
    if (!menu) throw new HttpError(404, "Producto no encontrado");
    menu.isAvailable = false;
    await this.menuRepo.save(menu);
  }
}