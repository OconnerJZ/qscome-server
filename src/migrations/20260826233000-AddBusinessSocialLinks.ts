import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBusinessSocialLinks20260826233000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("business", [
      new TableColumn({ name: "facebook_url", type: "varchar", length: "500", isNullable: true }),
      new TableColumn({ name: "instagram_url", type: "varchar", length: "500", isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("business", "instagram_url");
    await queryRunner.dropColumn("business", "facebook_url");
  }
}
