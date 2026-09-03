import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBusinessDescription20260901090000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "business",
      new TableColumn({ name: "description", type: "text", isNullable: true }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("business", "description");
  }
}
