import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransferPaymentEvidence20260828150000 implements MigrationInterface {
  name = "AddTransferPaymentEvidence20260828150000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders ADD payment_method ENUM('cash','card','wallet','transfer') NOT NULL DEFAULT 'cash', ADD transfer_bank_snapshot_json LONGTEXT NULL`);
    await queryRunner.query(`
      CREATE TABLE order_transfer_payments (
        transfer_payment_id INT NOT NULL AUTO_INCREMENT,
        order_id INT NOT NULL,
        customer_user_id INT NOT NULL,
        review_status ENUM('reported','reviewed','requires_clarification') NOT NULL DEFAULT 'reported',
        client_confirmed_at DATETIME NOT NULL,
        latest_evidence_at DATETIME NOT NULL,
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        owner_message TEXT NULL,
        version INT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (transfer_payment_id),
        UNIQUE INDEX uq_transfer_payment_order (order_id),
        CONSTRAINT fk_transfer_payment_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
        CONSTRAINT fk_transfer_payment_customer FOREIGN KEY (customer_user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
        CONSTRAINT fk_transfer_payment_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE transfer_payment_evidences (
        evidence_id INT NOT NULL AUTO_INCREMENT,
        transfer_payment_id INT NOT NULL,
        order_id INT NOT NULL,
        submitted_by INT NOT NULL,
        storage_key VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NULL,
        mime_type VARCHAR(80) NOT NULL,
        file_size INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (evidence_id),
        INDEX idx_transfer_evidence_report (transfer_payment_id),
        INDEX idx_transfer_evidence_order (order_id),
        CONSTRAINT fk_transfer_evidence_report FOREIGN KEY (transfer_payment_id) REFERENCES order_transfer_payments (transfer_payment_id) ON DELETE CASCADE,
        CONSTRAINT fk_transfer_evidence_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
        CONSTRAINT fk_transfer_evidence_submitter FOREIGN KEY (submitted_by) REFERENCES users (user_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS transfer_payment_evidences`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_transfer_payments`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN transfer_bank_snapshot_json, DROP COLUMN payment_method`);
  }
}
