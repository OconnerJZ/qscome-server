import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSharedOrders20260828180000 implements MigrationInterface {
  name = "AddSharedOrders20260828180000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!await queryRunner.hasColumn("orders", "shared_session_id")) {
      await queryRunner.query(`ALTER TABLE orders ADD shared_session_id CHAR(36) NULL`);
    }
    if (!await queryRunner.hasColumn("order_details", "shared_participant_label")) {
      await queryRunner.query(`ALTER TABLE order_details ADD shared_participant_label VARCHAR(40) NULL`);
    }
    if (!await queryRunner.hasTable("shared_order_sessions")) await this.createSessions(queryRunner);
    if (!await queryRunner.hasTable("shared_order_participants")) await this.createParticipants(queryRunner);
    if (!await queryRunner.hasTable("shared_order_items")) await this.createItems(queryRunner);
    if (!await queryRunner.hasTable("shared_order_suborders")) await this.createSuborders(queryRunner);
    if (!await queryRunner.hasTable("shared_order_audit_events")) await this.createAudit(queryRunner);

    // Las columnas de texto de un FK en MySQL deben compartir charset y collation.
    // `orders` puede ser una tabla antigua con otra collation, así que alineamos
    // sólo la columna nueva con la PK recién creada antes de declarar el FK.
    const [reference] = await queryRunner.query(`
      SELECT CHARACTER_SET_NAME charsetName, COLLATION_NAME collationName
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shared_order_sessions' AND COLUMN_NAME = 'session_id'
    `);
    const charset = this.safeIdentifier(reference?.charsetName, "utf8mb4");
    const collation = this.safeIdentifier(reference?.collationName, "utf8mb4_unicode_ci");
    if (!await this.hasForeignKey(queryRunner, "orders", "fk_orders_shared_session")) {
      await queryRunner.query(`ALTER TABLE orders MODIFY shared_session_id CHAR(36) CHARACTER SET ${charset} COLLATE ${collation} NULL`);
      if (!await this.hasIndex(queryRunner, "orders", "idx_orders_shared_session")) {
        await queryRunner.query(`ALTER TABLE orders ADD INDEX idx_orders_shared_session (shared_session_id)`);
      }
      await queryRunner.query(`ALTER TABLE orders ADD CONSTRAINT fk_orders_shared_session FOREIGN KEY (shared_session_id) REFERENCES shared_order_sessions (session_id) ON DELETE SET NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("orders") && await this.hasForeignKey(queryRunner, "orders", "fk_orders_shared_session")) {
      await queryRunner.query(`ALTER TABLE orders DROP FOREIGN KEY fk_orders_shared_session`);
    }
    if (await queryRunner.hasTable("orders") && await this.hasIndex(queryRunner, "orders", "idx_orders_shared_session")) {
      await queryRunner.query(`ALTER TABLE orders DROP INDEX idx_orders_shared_session`);
    }
    for (const table of ["shared_order_audit_events", "shared_order_suborders", "shared_order_items", "shared_order_participants", "shared_order_sessions"]) {
      if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table, true);
    }
    if (await queryRunner.hasColumn("order_details", "shared_participant_label")) await queryRunner.query(`ALTER TABLE order_details DROP COLUMN shared_participant_label`);
    if (await queryRunner.hasColumn("orders", "shared_session_id")) await queryRunner.query(`ALTER TABLE orders DROP COLUMN shared_session_id`);
  }

  private async createSessions(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE shared_order_sessions (
      session_id CHAR(36) NOT NULL, host_user_id INT NOT NULL, title VARCHAR(100) NULL,
      status ENUM('open','locked','submitted','cancelled','expired') NOT NULL DEFAULT 'open',
      code_hash CHAR(64) NOT NULL, link_token_hash CHAR(64) NOT NULL, code_length TINYINT NOT NULL, version INT NOT NULL DEFAULT 1,
      expires_at DATETIME NOT NULL, locked_at DATETIME NULL, submitted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id), UNIQUE INDEX idx_shared_order_code (code_hash), UNIQUE INDEX idx_shared_order_token (link_token_hash),
      INDEX idx_shared_order_host (host_user_id), CONSTRAINT fk_shared_order_host FOREIGN KEY (host_user_id) REFERENCES users (user_id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  private async createParticipants(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE shared_order_participants (
      participant_id INT NOT NULL AUTO_INCREMENT, session_id CHAR(36) NOT NULL, user_id INT NOT NULL,
      role ENUM('host','member') NOT NULL DEFAULT 'member', packaging_number INT NOT NULL,
      status ENUM('active','left') NOT NULL DEFAULT 'active', joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (participant_id), UNIQUE INDEX uq_shared_participant_user (session_id, user_id),
      UNIQUE INDEX uq_shared_participant_sequence (session_id, packaging_number),
      CONSTRAINT fk_shared_participant_session FOREIGN KEY (session_id) REFERENCES shared_order_sessions (session_id) ON DELETE CASCADE,
      CONSTRAINT fk_shared_participant_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  private async createItems(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE shared_order_items (
      shared_item_id INT NOT NULL AUTO_INCREMENT, session_id CHAR(36) NOT NULL, participant_id INT NOT NULL,
      user_id INT NOT NULL, business_id INT NOT NULL, menu_id INT NOT NULL, quantity INT NOT NULL,
      note TEXT NULL, modifiers_json LONGTEXT NULL, unit_price_snapshot DECIMAL(10,2) NOT NULL, version INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (shared_item_id), INDEX idx_shared_item_session (session_id), INDEX idx_shared_item_owner (participant_id),
      CONSTRAINT fk_shared_item_session FOREIGN KEY (session_id) REFERENCES shared_order_sessions (session_id) ON DELETE CASCADE,
      CONSTRAINT fk_shared_item_participant FOREIGN KEY (participant_id) REFERENCES shared_order_participants (participant_id) ON DELETE CASCADE,
      CONSTRAINT fk_shared_item_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
      CONSTRAINT fk_shared_item_business FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE RESTRICT,
      CONSTRAINT fk_shared_item_menu FOREIGN KEY (menu_id) REFERENCES menus (menu_id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  private async createSuborders(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE shared_order_suborders (
      shared_suborder_id INT NOT NULL AUTO_INCREMENT, session_id CHAR(36) NOT NULL, business_id INT NOT NULL, order_id INT NOT NULL,
      PRIMARY KEY (shared_suborder_id), UNIQUE INDEX uq_shared_suborder_business (session_id, business_id), UNIQUE INDEX uq_shared_suborder_order (order_id),
      CONSTRAINT fk_shared_suborder_session FOREIGN KEY (session_id) REFERENCES shared_order_sessions (session_id) ON DELETE CASCADE,
      CONSTRAINT fk_shared_suborder_business FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE RESTRICT,
      CONSTRAINT fk_shared_suborder_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  private async createAudit(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE shared_order_audit_events (
      audit_id BIGINT NOT NULL AUTO_INCREMENT, session_id CHAR(36) NOT NULL, actor_user_id INT NULL,
      action VARCHAR(80) NOT NULL, session_version INT NULL, metadata_json LONGTEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (audit_id), INDEX idx_shared_audit_session (session_id), INDEX idx_shared_audit_created (created_at),
      CONSTRAINT fk_shared_audit_session FOREIGN KEY (session_id) REFERENCES shared_order_sessions (session_id) ON DELETE CASCADE,
      CONSTRAINT fk_shared_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  private async hasIndex(queryRunner: QueryRunner, table: string, index: string) {
    const rows = await queryRunner.query(`SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`, [table, index]);
    return rows.length > 0;
  }

  private async hasForeignKey(queryRunner: QueryRunner, table: string, constraint: string) {
    const rows = await queryRunner.query(`SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`, [table, constraint]);
    return rows.length > 0;
  }

  private safeIdentifier(value: unknown, fallback: string) {
    const normalized = String(value || fallback);
    return /^[A-Za-z0-9_]+$/.test(normalized) ? normalized : fallback;
  }
}
