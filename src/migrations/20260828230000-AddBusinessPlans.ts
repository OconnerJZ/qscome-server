import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessPlans20260828230000 implements MigrationInterface {
  name = "AddBusinessPlans20260828230000";
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE business_plan_subscriptions (
      business_subscription_id INT NOT NULL AUTO_INCREMENT, business_id INT NOT NULL, plan_code VARCHAR(30) NOT NULL DEFAULT 'free',
      status ENUM('active','trialing','past_due','cancelled') NOT NULL DEFAULT 'active', source VARCHAR(30) NOT NULL DEFAULT 'system',
      assigned_by INT NULL, starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ends_at DATETIME NULL, version INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (business_subscription_id), UNIQUE INDEX uq_business_plan_subscription (business_id),
      CONSTRAINT fk_business_plan_business FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
      CONSTRAINT fk_business_plan_actor FOREIGN KEY (assigned_by) REFERENCES users (user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE business_plan_audit_events (
      audit_id BIGINT NOT NULL AUTO_INCREMENT, business_id INT NOT NULL, actor_user_id INT NULL, action VARCHAR(80) NOT NULL,
      previous_plan VARCHAR(30) NULL, next_plan VARCHAR(30) NULL, metadata_json LONGTEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (audit_id), INDEX idx_business_plan_audit (business_id, created_at),
      CONSTRAINT fk_business_plan_audit_business FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
      CONSTRAINT fk_business_plan_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS business_plan_audit_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS business_plan_subscriptions`);
  }
}
