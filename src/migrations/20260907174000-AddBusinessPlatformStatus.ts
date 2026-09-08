import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBusinessPlatformStatus20260907174000 implements MigrationInterface {
  name = "AddBusinessPlatformStatus20260907174000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("business", "platform_status"))) {
      await queryRunner.addColumn(
        "business",
        new TableColumn({
          name: "platform_status",
          type: "enum",
          enum: ["active", "suspended"],
          isNullable: false,
          default: "'active'",
        }),
      );
    }

    if (!(await queryRunner.hasColumn("business", "suspended_at"))) {
      await queryRunner.addColumn(
        "business",
        new TableColumn({ name: "suspended_at", type: "datetime", isNullable: true }),
      );
    }

    if (!(await queryRunner.hasColumn("business", "suspension_reason"))) {
      await queryRunner.addColumn(
        "business",
        new TableColumn({ name: "suspension_reason", type: "text", isNullable: true }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("business", "suspension_reason")) {
      await queryRunner.dropColumn("business", "suspension_reason");
    }
    if (await queryRunner.hasColumn("business", "suspended_at")) {
      await queryRunner.dropColumn("business", "suspended_at");
    }
    if (await queryRunner.hasColumn("business", "platform_status")) {
      await queryRunner.dropColumn("business", "platform_status");
    }
  }
}
