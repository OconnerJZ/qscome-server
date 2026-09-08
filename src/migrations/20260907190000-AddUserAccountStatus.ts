import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddUserAccountStatus20260907190000 implements MigrationInterface {
  name = "AddUserAccountStatus20260907190000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("users", "account_status"))) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({
          name: "account_status",
          type: "enum",
          enum: ["active", "blocked"],
          isNullable: false,
          default: "'active'",
        }),
      );
    }

    if (!(await queryRunner.hasColumn("users", "blocked_at"))) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({ name: "blocked_at", type: "datetime", isNullable: true }),
      );
    }

    if (!(await queryRunner.hasColumn("users", "block_reason"))) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({ name: "block_reason", type: "text", isNullable: true }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("users", "block_reason")) {
      await queryRunner.dropColumn("users", "block_reason");
    }
    if (await queryRunner.hasColumn("users", "blocked_at")) {
      await queryRunner.dropColumn("users", "blocked_at");
    }
    if (await queryRunner.hasColumn("users", "account_status")) {
      await queryRunner.dropColumn("users", "account_status");
    }
  }
}
