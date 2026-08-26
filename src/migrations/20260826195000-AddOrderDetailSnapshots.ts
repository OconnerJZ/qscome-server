import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderDetailSnapshots20260826195000 implements MigrationInterface {
  name = "AddOrderDetailSnapshots20260826195000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `order_details` ADD `item_name` varchar(255) NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `order_details` ADD `unit_price` decimal(10,2) NULL",
    );

    await queryRunner.query(`
      UPDATE order_details od
      LEFT JOIN menus m ON m.menu_id = od.menu_id
      SET
        od.item_name = COALESCE(od.item_name, m.item_name),
        od.unit_price = COALESCE(
          od.unit_price,
          CASE
            WHEN od.quantity IS NOT NULL AND od.quantity > 0 AND od.subtotal IS NOT NULL
              THEN ROUND(od.subtotal / od.quantity, 2)
            ELSE m.price
          END
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `order_details` DROP COLUMN `unit_price`");
    await queryRunner.query("ALTER TABLE `order_details` DROP COLUMN `item_name`");
  }
}
