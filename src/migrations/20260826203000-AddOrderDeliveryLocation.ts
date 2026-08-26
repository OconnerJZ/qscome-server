import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddOrderDeliveryLocation20260826203000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("orders", [
      new TableColumn({ name: "delivery_latitude", type: "decimal", precision: 10, scale: 8, isNullable: true }),
      new TableColumn({ name: "delivery_longitude", type: "decimal", precision: 11, scale: 8, isNullable: true }),
      new TableColumn({ name: "delivery_city", type: "varchar", length: "120", isNullable: true }),
      new TableColumn({ name: "delivery_postal_code", type: "varchar", length: "20", isNullable: true }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("orders", "delivery_postal_code");
    await queryRunner.dropColumn("orders", "delivery_city");
    await queryRunner.dropColumn("orders", "delivery_longitude");
    await queryRunner.dropColumn("orders", "delivery_latitude");
  }
}
