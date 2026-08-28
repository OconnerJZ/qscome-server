import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSharedOrders20260828180000 implements MigrationInterface {
  name = "AddSharedOrders20260828180000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders ADD shared_session_id CHAR(36) NULL`);
    await queryRunner.query(`ALTER TABLE order_details ADD shared_participant_label VARCHAR(40) NULL`);
    await queryRunner.query(`
      CREATE TABLE shared_order_sessions (
        session_id CHAR(36) NOT NULL,
        host_user_id INT NOT NULL,
        title VARCHAR(100) NULL,
        status ENUM('open','locked','submitted','cancelled','expired') NOT NULL DEFAULT 'open',
        code_hash CHAR(64) NOT NULL,
        link_token_hash CHAR(64) NOT NULL,
        code_length TINYINT NOT NULL,
        version INT NOT NULL DEFAULT 1,
        expires_at DATETIME NOT NULL,
        locked_at DATETIME NULL,
        submitted_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (session_id),
        UNIQUE INDEX idx_shared_order_code (code_hash),
        UNIQUE INDEX idx_shared_order_token (link_token_hash),
        INDEX idx_shared_order_host (host_user_id),
        CONSTRAINT fk_shared_order_host FOREIGN KEY (host_user_id) REFERENCES users (user_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE shared_order_participants (
        participant_id INT NOT NULL AUTO_INCREMENT,
        session_id CHAR(36) NOT NULL,
        user_id INT NOT NULL,
        role ENUM('host','member') NOT NULL DEFAULT 'member',
        packaging_number INT NOT NULL,
        status ENUM('active','left') NOT NULL DEFAULT 'active',
        joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (participant_id),
        UNIQUE INDEX uq_shared_participant_user (session_id, user_id),
        UNIQUE INDEX uq_shared_participant_sequence (session_id, packaging_number),
        CONSTRAINT fk_shared_participant_session FOREIGN KEY (session_id) REFERENCES shared_order_sessions (session_id) ON DELETE CASCADE,
        CONSTRAINT fk_shared_participant_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE shared_order_items (
        shared_item_id INT NOT NULL AUTO_INCREMENT,
        session_id CHAR(36) NOT NULL,
        participant_id INT NOT NULL,
        user_id INT NOT NULL,
        business_id INT NOT NULL,
        menu_id INT NOT NULL,
        quantity INT NOT NULL,
        note TEXT NULL,
        modifiers_json LONGTEXT NULL,
        unit_price_snapshot DECIMAL(10,2) NOT NULL,
        version INT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (shared_item_id),
        INDEX idx_shared_item_session (session_id),
        INDEX idx_shared_item_owner (participant_id),
        CONSTRAINT fk_shared_item_session FOREIGN KEY (session_id) REFERENCES shared_order_sessions (session_id) ON DELETE CASCADE,
        CONSTRAINT fk_shared_item_participant FOREIGN KEY (participant_id) REFERENCES shared_order_participants (participant_id) ON DELETE CASCADE,
        CONSTRAINT fk_shared_item_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
        CONSTRAINT fk_shared_item_business FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE RESTRICT,
        CONSTRAINT fk_shared_item_menu FOREIGN KEY (menu_id) REFERENCES menus (menu_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE shared_order_suborders (
        shared_suborder_id INT NOT NULL AUTO_INCREMENT,
        session_id CHAR(36) NOT NULL,
        business_id INT NOT NULL,
        order_id INT NOT NULL,
        PRIMARY KEY (shared_suborder_id),
        UNIQUE INDEX uq_shared_suborder_business (session_id, business_id),
        UNIQUE INDEX uq_shared_suborder_order (order_id),
        CONSTRAINT fk_shared_suborder_session FOREIGN KEY (session_id) REFERENCES shared_order_sessions (session_id) ON DELETE CASCADE,
        CONSTRAINT fk_shared_suborder_business FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE RESTRICT,
        CONSTRAINT fk_shared_suborder_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE shared_order_audit_events (
        audit_id BIGINT NOT NULL AUTO_INCREMENT,
        session_id CHAR(36) NOT NULL,
        actor_user_id INT NULL,
        action VARCHAR(80) NOT NULL,
        session_version INT NULL,
        metadata_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (audit_id),
        INDEX idx_shared_audit_session (session_id),
        INDEX idx_shared_audit_created (created_at),
        CONSTRAINT fk_shared_audit_session FOREIGN KEY (session_id) REFERENCES shared_order_sessions (session_id) ON DELETE CASCADE,
        CONSTRAINT fk_shared_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`ALTER TABLE orders ADD INDEX idx_orders_shared_session (shared_session_id), ADD CONSTRAINT fk_orders_shared_session FOREIGN KEY (shared_session_id) REFERENCES shared_order_sessions (session_id) ON DELETE SET NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP FOREIGN KEY fk_orders_shared_session, DROP INDEX idx_orders_shared_session`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_order_audit_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_order_suborders`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_order_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_order_participants`);
    await queryRunner.query(`DROP TABLE IF EXISTS shared_order_sessions`);
    await queryRunner.query(`ALTER TABLE order_details DROP COLUMN shared_participant_label`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN shared_session_id`);
  }
}
