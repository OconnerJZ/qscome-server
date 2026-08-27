import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddOrderVersion20260827062000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "orders",
      new TableColumn({
        name: "version",
        type: "int",
        isNullable: false,
        default: 1,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("orders", "version");
  }
}
