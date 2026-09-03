// src/services/MenuService.ts
// Lógica y persistencia de productos de menú. Los controllers sólo traducen HTTP.

import { AppDataSource } from "../utils/db";
import { Menus } from "../entities/Menus";
import { MenuOptionGroups } from "../entities/MenuOptionGroups";
import { MenuOptionChoices } from "../entities/MenuOptionChoices";
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

interface ModifierChoiceInput {
  id?: number;
  name: string;
  priceExtra?: number;
  defaultSelected?: boolean;
}

interface ModifierGroupInput {
  id?: number;
  title: string;
  minSelect?: number;
  maxSelect?: number;
  choices?: ModifierChoiceInput[];
}

export class MenuService {
  private readonly menuRepo = AppDataSource.getRepository(Menus);

  async list() {
    const menus = await this.menuRepo.find({
      relations: ["business"],
      where: { isAvailable: true, isArchived: false },
    });
    return menus.map(formatMenuCard);
  }

  async getById(menuId: number) {
    const menu = await this.menuRepo.findOne({
      where: { menuId, isArchived: false },
      relations: [
        "business",
        "menuOptions",
        "menuOptionGroups",
        "menuOptionGroups.menuOptionChoices",
      ],
    });
    if (!menu) throw new HttpError(404, "Producto no encontrado");
    return formatMenuDetail(menu);
  }

  async getByBusiness(businessId: number) {
    const menus = await this.menuRepo.find({
      where: { businessId, isAvailable: true, isArchived: false },
      relations: ["menuOptionGroups", "menuOptionGroups.menuOptionChoices"],
      order: { category: "ASC", itemName: "ASC" },
    });
    return menus.map(formatBusinessMenuItem);
  }

  async getManagedByBusiness(businessId: number) {
    const menus = await this.menuRepo.find({
      where: { businessId, isArchived: false },
      relations: ["menuOptionGroups", "menuOptionGroups.menuOptionChoices"],
      order: { category: "ASC", itemName: "ASC" },
    });
    return menus.map(formatBusinessMenuItem);
  }

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
      isArchived: false,
    });
    await this.menuRepo.save(menu);
    return formatMenuMini(menu);
  }

  async update(menuId: number, body: any) {
    const menu = await this.menuRepo.findOne({
      where: { menuId, isArchived: false },
    });
    if (!menu) throw new HttpError(404, "Producto no encontrado");

    const { item_name, description, price, image_url, category, is_available } =
      body;

    if (item_name !== undefined) {
      const name = String(item_name).trim();
      if (!name)
        throw new HttpError(400, "El nombre del producto es requerido");
      menu.itemName = name;
    }
    if (description !== undefined) menu.description = String(description).trim() || null;
    if (price !== undefined) {
      const value = Number(price);
      if (!Number.isFinite(value) || value <= 0) throw new HttpError(400, "El precio debe ser mayor a 0");
      menu.price = value.toFixed(2);
    }
    if (image_url !== undefined) menu.imageUrl = String(image_url).trim() || null;
    if (category !== undefined) menu.category = String(category).trim() || null;
    if (typeof is_available === "boolean") menu.isAvailable = is_available;

    await this.menuRepo.save(menu);
    return formatMenuMini(menu);
  }

  async getModifierGroups(menuId: number) {
    const menu = await this.menuRepo.findOne({
      where: { menuId, isArchived: false },
      relations: ["menuOptionGroups", "menuOptionGroups.menuOptionChoices"],
    });
    if (!menu) throw new HttpError(404, "Producto no encontrado");
    return formatMenuDetail(menu).modifierGroups;
  }

  async replaceModifierGroups(menuId: number, groups: ModifierGroupInput[] = []) {
    const menu = await this.menuRepo.findOne({ where: { menuId, isArchived: false } });
    if (!menu) throw new HttpError(404, "Producto no encontrado");
    if (!Array.isArray(groups)) {
      throw new HttpError(400, "Los grupos de personalización son inválidos");
    }

    for (const group of groups) {
      const title = String(group.title || "").trim();
      if (!title) throw new HttpError(400, "Cada grupo necesita un nombre");

      const choices = Array.isArray(group.choices) ? group.choices : [];
      if (!choices.length) throw new HttpError(400, `${title}: agrega al menos una opción`);
      if (choices.some((choice) => !String(choice.name || "").trim())) {
        throw new HttpError(400, `${title}: hay opciones sin nombre`);
      }

      const min = Math.max(0, Number(group.minSelect || 0));
      const max = Math.max(0, Number(group.maxSelect || 0));
      const defaults = choices.filter((choice) => Boolean(choice.defaultSelected)).length;

      if (min > choices.length) {
        throw new HttpError(400, `${title}: el mínimo supera el número de opciones`);
      }
      if (max > 0 && max > choices.length) {
        throw new HttpError(400, `${title}: el máximo supera el número de opciones`);
      }
      if (max > 0 && min > max) {
        throw new HttpError(400, `${title}: el mínimo no puede superar al máximo`);
      }
      if (max > 0 && defaults > max) {
        throw new HttpError(400, `${title}: hay más opciones predeterminadas que el máximo permitido`);
      }
      if (max === 1 && defaults > 1) {
        throw new HttpError(400, `${title}: sólo puede existir una opción predeterminada`);
      }
    }

    await AppDataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(MenuOptionGroups);
      const choiceRepo = manager.getRepository(MenuOptionChoices);
      const existingGroups = await groupRepo.find({
        where: { menuId },
        relations: ["menuOptionChoices"],
      });
      const choiceIds = existingGroups.flatMap(
        (group) => group.menuOptionChoices?.map((choice) => choice.choiceId) || [],
      );
      if (choiceIds.length) await choiceRepo.delete(choiceIds);
      if (existingGroups.length) {
        await groupRepo.delete(existingGroups.map((group) => group.groupId));
      }

      for (const group of groups) {
        const savedGroup = await groupRepo.save(
          groupRepo.create({
            menuId,
            title: String(group.title).trim(),
            minSelect: Math.max(0, Number(group.minSelect || 0)),
            maxSelect: Math.max(0, Number(group.maxSelect || 0)),
          }),
        );

        await choiceRepo.save(
          (group.choices || []).map((choice) =>
            choiceRepo.create({
              groupId: savedGroup.groupId,
              name: String(choice.name || "").trim(),
              priceExtra: Math.max(0, Number(choice.priceExtra || 0)).toFixed(2),
              isDefault: Boolean(choice.defaultSelected),
            }),
          ),
        );
      }
    });

    return this.getModifierGroups(menuId);
  }

  // DELETE /api/menus/:id — archivo lógico; conserva referencias históricas.
  async softDelete(menuId: number) {
    const menu = await this.menuRepo.findOne({ where: { menuId } });
    if (!menu) throw new HttpError(404, "Producto no encontrado");
    menu.isAvailable = false;
    menu.isArchived = true;
    await this.menuRepo.save(menu);
  }
}
