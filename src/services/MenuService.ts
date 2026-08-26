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
}

export class MenuService {
  private readonly menuRepo = AppDataSource.getRepository(Menus);

  // GET /api/menus
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

  // GET /api/menus/business/:businessId
  async getByBusiness(businessId: number) {
    const menus = await this.menuRepo.find({
      where: { businessId, isAvailable: true },
      order: { category: "ASC", itemName: "ASC" },
    });
    return menus.map(formatBusinessMenuItem);
  }

  // POST /api/menus
  async create(input: CreateMenuInput) {
    const menu = this.menuRepo.create({
      businessId: input.business_id,
      itemName: input.item_name,
      description: input.description,
      price: input.price.toString(),
      imageUrl: input.image_url,
      category: input.category,
      isAvailable: true,
    });
    await this.menuRepo.save(menu);
    return formatMenuMini(menu);
  }

  // PUT /api/menus/:id
  async update(menuId: number, body: any) {
    const menu = await this.menuRepo.findOne({ where: { menuId } });
    if (!menu) throw new HttpError(404, "Producto no encontrado");

    const { item_name, description, price, image_url, category, is_available } =
      body;
    if (item_name) menu.itemName = item_name;
    if (description) menu.description = description;
    if (price) menu.price = price.toString();
    if (image_url) menu.imageUrl = image_url;
    if (category) menu.category = category;
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