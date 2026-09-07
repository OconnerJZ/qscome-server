import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class AddFeatureControlOverrides20260907214000 implements MigrationInterface {
  name = "AddFeatureControlOverrides20260907214000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("feature_control_overrides")) return;

    await queryRunner.createTable(new Table({
      name: "feature_control_overrides",
      columns: [
        { name: "override_id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "feature_key", type: "varchar", length: "100" },
        { name: "scope_type", type: "enum", enum: ["global", "plan", "business"] },
        { name: "scope_value", type: "varchar", length: "100" },
        { name: "mode", type: "enum", enum: ["enabled", "read_only", "disabled"] },
        { name: "reason", type: "varchar", length: "500", isNullable: true },
        { name: "updated_by", type: "int", isNullable: true },
        { name: "created_at", type: "datetime", default: "CURRENT_TIMESTAMP" },
        { name: "updated_at", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" },
      ],
      uniques: [{
        name: "uq_feature_control_override",
        columnNames: ["feature_key", "scope_type", "scope_value"],
      }],
      indices: [{
        name: "idx_feature_control_scope",
        columnNames: ["scope_type", "scope_value"],
      }],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("feature_control_overrides")) {
      await queryRunner.dropTable("feature_control_overrides", true);
    }
  }
}
