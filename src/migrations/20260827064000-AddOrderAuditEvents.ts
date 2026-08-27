import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderAuditEvents20260827064000 implements MigrationInterface {
  name = "AddOrderAuditEvents20260827064000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_audit_events (
        audit_id BIGINT NOT NULL AUTO_INCREMENT,
        order_id INT NOT NULL,
        business_id INT NULL,
        actor_user_id INT NULL,
        actor_role VARCHAR(40) NULL,
        action VARCHAR(80) NOT NULL,
        entity_type VARCHAR(40) NOT NULL DEFAULT 'order',
        entity_id VARCHAR(80) NULL,
        order_version INT NULL,
        metadata_json LONGTEXT NULL,
        ip_address VARCHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (audit_id),
        INDEX idx_order_audit_order (order_id),
        INDEX idx_order_audit_action (action),
        INDEX idx_order_audit_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS order_audit_events`);
  }
}
