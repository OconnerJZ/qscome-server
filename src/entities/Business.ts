import { Column, Entity, OneToMany } from "typeorm";
import { BusinessDeliverySettings } from "./BusinessDeliverySettings";
import { BusinessFoodTypes } from "./BusinessFoodTypes";
import { BusinessOwners } from "./BusinessOwners";
import { BusinessPaymentMethods } from "./BusinessPaymentMethods";
import { BusinessPhotos } from "./BusinessPhotos";
import { GlobalVirtualAssistants } from "./GlobalVirtualAssistants";
import { Locations } from "./Locations";
import { Menus } from "./Menus";
import { Orders } from "./Orders";
import { Promotions } from "./Promotions";
import { ReviewComments } from "./ReviewComments";
import { Tables } from "./Tables";

@Entity("business", { schema: "qscome" })
export class Business {
  @Column("int", { primary: true, name: "business_id" })
  businessId!: number;

  @Column("varchar", { name: "business_name", nullable: true, length: 255 })
  businessName!: string | null;

  @Column("datetime", {
    name: "created_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date | null;

  @Column("datetime", {
    name: "updated_at",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date | null;

  @Column("varchar", { name: "phone", nullable: true, length: 30 })
  phone!: string | null;

  @Column("varchar", { name: "email", nullable: true, length: 255 })
  email!: string | null;

  @Column("varchar", { name: "logo_url", nullable: true, length: 255 })
  logoUrl!: string | null;

  @Column("varchar", { name: "banner_url", nullable: true, length: 255 })
  bannerUrl!: string | null;

  @Column("int", { name: "prep_time_min", nullable: true })
  prepTimeMin!: number | null;

  @Column("int", { name: "estimated_delivery_min", nullable: true })
  estimatedDeliveryMin!: number | null;

  @Column("tinyint", {
    name: "is_open",
    nullable: true,
    width: 1,
    default: () => "'1'",
  })
  isOpen!: boolean | null;

  @Column("tinyint", {
    name: "is_verified",
    nullable: true,
    width: 1,
    default: () => "'0'",
  })
  isVerified!: boolean | null;

  @Column("datetime", { name: "verified_at", nullable: true })
  verifiedAt!: Date | null;

  @OneToMany(
    () => BusinessDeliverySettings,
    (businessDeliverySettings) => businessDeliverySettings.business
  )
  businessDeliverySettings!: BusinessDeliverySettings[];

  @OneToMany(
    () => BusinessFoodTypes,
    (businessFoodTypes) => businessFoodTypes.business
  )
  businessFoodTypes!: BusinessFoodTypes[];

  @OneToMany(() => BusinessOwners, (businessOwners) => businessOwners.business)
  businessOwners!: BusinessOwners[];

  @OneToMany(
    () => BusinessPaymentMethods,
    (businessPaymentMethods) => businessPaymentMethods.business
  )
  businessPaymentMethods!: BusinessPaymentMethods[];

  @OneToMany(() => BusinessPhotos, (businessPhotos) => businessPhotos.business)
  businessPhotos!: BusinessPhotos[];

  @OneToMany(
    () => GlobalVirtualAssistants,
    (globalVirtualAssistants) => globalVirtualAssistants.business
  )
  globalVirtualAssistants!: GlobalVirtualAssistants[];

  @OneToMany(() => Locations, (locations) => locations.business)
  locations!: Locations[];

  @OneToMany(() => Menus, (menus) => menus.business)
  menus!: Menus[];

  @OneToMany(() => Orders, (orders) => orders.business)
  orders!: Orders[];

  @OneToMany(() => Promotions, (promotions) => promotions.business)
  promotions!: Promotions[];

  @OneToMany(() => ReviewComments, (reviewComments) => reviewComments.business)
  reviewComments!: ReviewComments[];

  @OneToMany(() => Tables, (tables) => tables.business)
  tables!: Tables[];
}
