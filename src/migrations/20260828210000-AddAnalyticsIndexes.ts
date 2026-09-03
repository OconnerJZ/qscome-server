import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnalyticsIndexes20260828210000 implements MigrationInterface {
  name = "AddAnalyticsIndexes20260828210000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX idx_orders_analytics ON orders (business_id, created_at, status)`);
    await queryRunner.query(`CREATE INDEX idx_orders_customer_analytics ON orders (business_id, user_id, status, created_at)`);
    await queryRunner.query(`CREATE INDEX idx_order_details_product_period ON order_details (menu_id, created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_order_details_product_period ON order_details`);
    await queryRunner.query(`DROP INDEX idx_orders_customer_analytics ON orders`);
    await queryRunner.query(`DROP INDEX idx_orders_analytics ON orders`);
  }
}
