import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusinessRolesAndInvitations20260828120000 implements MigrationInterface {
  name = "AddBusinessRolesAndInvitations20260828120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE business_owners MODIFY role_in_business ENUM('owner','staff','primary_owner','co_owner','manager','kitchen','cashier') NULL DEFAULT 'owner'`);
    await queryRunner.query(`UPDATE business_owners SET role_in_business = 'primary_owner' WHERE role_in_business = 'owner' OR role_in_business IS NULL`);
    await queryRunner.query(`UPDATE business_owners SET role_in_business = 'kitchen' WHERE role_in_business = 'staff'`);
    await queryRunner.query(`ALTER TABLE business_owners MODIFY role_in_business ENUM('primary_owner','co_owner','manager','kitchen','cashier') NULL DEFAULT 'primary_owner'`);

    const duplicateMemberships = await queryRunner.query(`SELECT user_id, business_id, MIN(owner_id) keep_id FROM business_owners GROUP BY user_id, business_id HAVING COUNT(*) > 1`);
    for (const row of duplicateMemberships) {
      await queryRunner.query(`DELETE FROM business_owners WHERE user_id = ? AND business_id = ? AND owner_id <> ?`, [row.user_id, row.business_id, row.keep_id]);
    }
    await queryRunner.query(`ALTER TABLE business_owners ADD UNIQUE INDEX uq_business_owner_user_business (user_id, business_id)`);

    await queryRunner.query(`
      CREATE TABLE business_invitations (
        invitation_id INT NOT NULL AUTO_INCREMENT,
        business_id INT NOT NULL,
        invited_email VARCHAR(255) NOT NULL,
        role_in_business ENUM('primary_owner','co_owner','manager','kitchen','cashier') NOT NULL,
        invitation_type ENUM('membership','ownership_transfer') NOT NULL DEFAULT 'membership',
        status ENUM('pending','accepted','cancelled','expired') NOT NULL DEFAULT 'pending',
        token_hash CHAR(64) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        invited_by INT NOT NULL,
        accepted_by INT NULL,
        retain_previous_as_co_owner TINYINT(1) NOT NULL DEFAULT 1,
        expires_at DATETIME NOT NULL,
        accepted_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (invitation_id),
        UNIQUE INDEX idx_business_invitation_token (token_hash),
        INDEX idx_business_invitation_business (business_id),
        INDEX idx_business_invitation_email (invited_email),
        CONSTRAINT fk_business_invitation_business FOREIGN KEY (business_id) REFERENCES business (business_id) ON DELETE CASCADE,
        CONSTRAINT fk_business_invitation_inviter FOREIGN KEY (invited_by) REFERENCES users (user_id) ON DELETE RESTRICT,
        CONSTRAINT fk_business_invitation_acceptor FOREIGN KEY (accepted_by) REFERENCES users (user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS business_invitations`);
    await queryRunner.query(`ALTER TABLE business_owners DROP INDEX uq_business_owner_user_business`);
    await queryRunner.query(`ALTER TABLE business_owners MODIFY role_in_business ENUM('owner','manager','staff','primary_owner','co_owner','kitchen','cashier') NULL DEFAULT 'owner'`);
    await queryRunner.query(`UPDATE business_owners SET role_in_business = 'owner' WHERE role_in_business IN ('primary_owner','co_owner')`);
    await queryRunner.query(`UPDATE business_owners SET role_in_business = 'staff' WHERE role_in_business IN ('kitchen','cashier')`);
    await queryRunner.query(`ALTER TABLE business_owners MODIFY role_in_business ENUM('owner','manager','staff') NULL DEFAULT 'owner'`);
  }
}
