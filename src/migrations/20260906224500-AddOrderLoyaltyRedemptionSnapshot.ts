import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderLoyaltyRedemptionSnapshot20260906224500 implements MigrationInterface {
  name = "AddOrderLoyaltyRedemptionSnapshot20260906224500";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE orders ADD loyalty_reward_applied TINYINT(1) NOT NULL DEFAULT 0");
    await queryRunner.query("ALTER TABLE orders ADD loyalty_reward_percent INT NULL");
    await queryRunner.query("ALTER TABLE orders ADD loyalty_discount_amount DECIMAL(10,2) NULL");
    await queryRunner.query("ALTER TABLE orders ADD loyalty_subtotal_before_discount DECIMAL(10,2) NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE orders DROP COLUMN loyalty_subtotal_before_discount");
    await queryRunner.query("ALTER TABLE orders DROP COLUMN loyalty_discount_amount");
    await queryRunner.query("ALTER TABLE orders DROP COLUMN loyalty_reward_percent");
    await queryRunner.query("ALTER TABLE orders DROP COLUMN loyalty_reward_applied");
  }
}
