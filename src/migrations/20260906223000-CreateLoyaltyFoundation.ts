import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLoyaltyFoundation20260906223000 implements MigrationInterface {
  name = "CreateLoyaltyFoundation20260906223000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE loyalty_programs (
        loyalty_program_id INT NOT NULL AUTO_INCREMENT,
        business_id INT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        orders_required INT NOT NULL DEFAULT 5,
        reward_percent INT NOT NULL DEFAULT 10,
        min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (loyalty_program_id),
        UNIQUE KEY uq_loyalty_program_business (business_id),
        CONSTRAINT fk_loyalty_program_business FOREIGN KEY (business_id) REFERENCES business(business_id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE loyalty_accounts (
        loyalty_account_id INT NOT NULL AUTO_INCREMENT,
        business_id INT NOT NULL,
        user_id INT NOT NULL,
        stamps INT NOT NULL DEFAULT 0,
        available_rewards INT NOT NULL DEFAULT 0,
        lifetime_stamps INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (loyalty_account_id),
        UNIQUE KEY uq_loyalty_account_business_user (business_id, user_id),
        KEY idx_loyalty_account_user (user_id),
        CONSTRAINT fk_loyalty_account_business FOREIGN KEY (business_id) REFERENCES business(business_id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_loyalty_account_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE loyalty_events (
        loyalty_event_id INT NOT NULL AUTO_INCREMENT,
        loyalty_account_id INT NOT NULL,
        order_id INT NOT NULL,
        event_type VARCHAR(40) NOT NULL DEFAULT 'order_completed',
        stamp_delta INT NOT NULL DEFAULT 0,
        reward_delta INT NOT NULL DEFAULT 0,
        metadata_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (loyalty_event_id),
        UNIQUE KEY uq_loyalty_event_order_type (order_id, event_type),
        KEY idx_loyalty_event_account (loyalty_account_id),
        CONSTRAINT fk_loyalty_event_account FOREIGN KEY (loyalty_account_id) REFERENCES loyalty_accounts(loyalty_account_id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_loyalty_event_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS loyalty_events");
    await queryRunner.query("DROP TABLE IF EXISTS loyalty_accounts");
    await queryRunner.query("DROP TABLE IF EXISTS loyalty_programs");
  }
}
