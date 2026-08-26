import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMenuArchiveFlag20260826141500 implements MigrationInterface {
  name = "AddMenuArchiveFlag20260826141500";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE menus
      ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0 AFTER is_available
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE menus DROP COLUMN is_archived`);
  }
}
